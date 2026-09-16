import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import styled from 'styled-components';
import { COLORS } from '../../constants/colors';
import { getDayRouteColor } from '../../constants/dayColors';
import { KAKAO_MAP_JS_KEY } from '../../constants/kakao';
import { FONT } from '../../constants/typography';
import type { Content } from '../../types/content';
import type { ItineraryStop } from '../../types/itinerary';
import type { DayRoute } from '../../types/route';
import { computeDayHops } from '../../utils/geoDistance';
import { buildKakaoRouteLink } from '../../utils/kakaoDirectionsLink';
import {
  buildKakaoRouteMapHtml,
  type RouteMapDay,
  type RouteMapUpdatePayload,
} from '../../utils/kakaoMapHtml';

// mapDaysStructural의 한 지점 — 어떤 콘텐츠(contentId)인지도 같이 들고 있어서, 나중에
// distances(구간 거리)를 계산할 때 legs.find(fromContentId)로 짝지을 수 있게 한다.
// HTML에는 좌표만 넘기고(kakaoMapHtml.ts의 RouteMapPoint), contentId는 RN 쪽에만 남긴다.
interface StructuralMapDay extends RouteMapDay {
  contentIds: string[];
}

interface ItineraryRouteMapProps {
  stops: ItineraryStop[];
  contentById: Record<string, Content | undefined>;
  routeByDay: Record<number, DayRoute | null>;
  totalDays: number;
  selectedDay: number;
  onSelectDay: (day: number) => void;
}

const Wrapper = styled(View)`
  margin: 8px 20px 4px;
`;

const MapWrapper = styled(View)`
  width: 100%;
  height: 220px;
  border-radius: 12px;
  overflow: hidden;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  margin-bottom: 10px;
`;

const MapPlaceholder = styled(View)`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: ${COLORS.gray50};
  padding: 12px;
`;

const MapPlaceholderText = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray500};
  text-align: center;
`;

const TopRow = styled(View)`
  flex-direction: row;
  justify-content: flex-end;
  margin-bottom: 8px;
`;

const DirectionsLink = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  gap: 2px;
`;

const DirectionsLinkLabel = styled(Text)`
  font-family: ${FONT.medium};
  font-size: 13px;
  color: ${COLORS.coral500};
`;

const TabRow = styled(View)`
  flex-direction: row;
  gap: 8px;
`;

const DayTab = styled(TouchableOpacity)<{ $active: boolean; $color: string }>`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding-vertical: 6px;
  padding-horizontal: 12px;
  border-radius: 100px;
  background-color: ${({ $active, $color }) => ($active ? $color : COLORS.white)};
  border-width: 1px;
  border-color: ${({ $color }) => $color};
`;

const DayTabDot = styled(View)<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 100px;
  background-color: ${({ $color }) => $color};
`;

const DayTabLabel = styled(Text)<{ $active: boolean }>`
  font-size: 13px;
  font-family: ${({ $active }) => ($active ? FONT.bold : FONT.medium)};
  color: ${({ $active }) => ($active ? COLORS.white : COLORS.gray700)};
`;

// 일정 전체 경로를 일차별 색으로 구분해 지도 위에 그리고, 아래 탭으로 일차를 고를 수 있게 한다.
// 실제 표시 값은 routeByDay(useItineraryRoutes)를 우선 쓰고, 아직 조회 전이거나 실패했으면
// 좌표로 즉석에서 계산한 직선거리로 대신 채운다(지도가 빈 채로 보이지 않도록).
export function ItineraryRouteMap({
  stops,
  contentById,
  routeByDay,
  totalDays,
  selectedDay,
  onSelectDay,
}: ItineraryRouteMapProps) {
  const dayList = Array.from({ length: totalDays }, (_, i) => i + 1);

  // 지도의 뼈대(좌표·색·순서)만 담는다 — routeByDay나 selectedDay는 의도적으로 의존성에서
  // 뺐다. 이 값이 바뀔 때만 WebView에 새 HTML을 넘기고, 나머지(선택된 일차·구간 거리)는
  // injectJavaScript로 이미 그려진 지도를 갱신한다(아래 html/updatePayload 참고) — 안 그러면
  // 일차 탭을 누르거나 실도로 거리 조회가 끝날 때마다 WebView가 페이지를 통째로 다시
  // 로드해서(카카오 SDK 재다운로드 + 지도 재초기화) 화면이 깜빡인다.
  const mapDaysStructural = useMemo<StructuralMapDay[]>(() => {
    return dayList
      .map((day): StructuralMapDay | null => {
        const dayStops = stops.filter((stop) => stop.day === day);
        const loadedPoints = dayStops
          .map((stop) => ({ stop, content: contentById[stop.contentId] }))
          .filter(
            (entry): entry is { stop: ItineraryStop; content: Content } => entry.content != null,
          );
        if (loadedPoints.length === 0) return null;

        return {
          dayIndex: day,
          color: getDayRouteColor(day),
          contentIds: loadedPoints.map(({ stop }) => stop.contentId),
          points: loadedPoints.map(({ content }) => ({
            latitude: content.latitude,
            longitude: content.longitude,
          })),
        };
      })
      .filter((day): day is StructuralMapDay => day !== null);
  }, [dayList, stops, contentById]);

  // "<dayIndex>-<그 날 안에서의 지점 순번>" → 다음 지점까지 구간 거리(km). route.legs(ROAD)와
  // computeDayHops(STRAIGHT 폴백) 둘 다 좌표 미상 콘텐츠가 낀 구간은 건너뛰어 배열이
  // 압축되므로, 인덱스로 바로 짝짓지 않고 fromContentId로 이 지점에서 출발하는 구간을
  // 직접 찾는다.
  const distances = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {};
    mapDaysStructural.forEach((day) => {
      const dayStops = stops.filter((stop) => stop.day === day.dayIndex);
      const route = routeByDay[day.dayIndex];
      const legs = route?.legs ?? computeDayHops(dayStops, contentById);
      day.contentIds.forEach((contentId, index) => {
        const distanceKm = legs.find((leg) => leg.fromContentId === contentId)?.distanceKm;
        if (typeof distanceKm === 'number') {
          result[`${day.dayIndex}-${index}`] = distanceKm;
        }
      });
    });
    return result;
  }, [mapDaysStructural, stops, contentById, routeByDay]);

  const initialSelectedDayRef = useRef(selectedDay);
  const html = useMemo(
    () =>
      buildKakaoRouteMapHtml({
        appKey: KAKAO_MAP_JS_KEY ?? '',
        days: mapDaysStructural,
        initialSelectedDayIndex: initialSelectedDayRef.current,
      }),
    [mapDaysStructural],
  );

  const webViewRef = useRef<WebView>(null);
  const isMapReadyRef = useRef(false);

  // html이 바뀌면(정류지 추가/삭제/순서 변경 등 구조 자체가 바뀐 경우) WebView가 새 페이지를
  // 새로 로드하므로, 그 페이지가 다시 로드 완료될 때까지 준비 안 된 상태로 되돌린다.
  // biome-ignore lint/correctness/useExhaustiveDependencies: html의 값 자체는 안 쓰고, 바뀌었다는 신호로만 쓴다
  useEffect(() => {
    isMapReadyRef.current = false;
  }, [html]);

  // 선택된 일차나 구간 거리가 바뀔 때마다 지도를 새로 그리지 않고, 이미 열려있는 WebView에
  // "이 값으로 갱신해줘"만 보낸다. 지도가 아직 로드 중이면(isMapReadyRef가 false) 여기서
  // 보내봐야 소용없으므로 건너뛴다 — onLoadEnd에서 그 시점의 최신 값을 다시 보낸다.
  useEffect(() => {
    if (!isMapReadyRef.current) return;
    const payload: RouteMapUpdatePayload = { selectedDayIndex: selectedDay, distances };
    webViewRef.current?.injectJavaScript(
      `window.updateRouteMap(${JSON.stringify(JSON.stringify(payload))});true;`,
    );
  }, [selectedDay, distances]);

  if (mapDaysStructural.every((day) => day.points.length < 2)) return null;

  // 지금 고른 일차 순서대로 카카오맵 길찾기 링크를 만든다. 좌표를 모르는 콘텐츠는 건너뛴다 —
  // 지도 위 폴리라인(mapDays)과 같은 기준.
  const selectedDayWaypoints = stops
    .filter((stop) => stop.day === selectedDay)
    .map((stop) => contentById[stop.contentId])
    .filter((content): content is Content => content != null)
    .map((content) => ({
      name: content.name,
      latitude: content.latitude,
      longitude: content.longitude,
    }));
  const directionsLink = buildKakaoRouteLink(selectedDayWaypoints);

  return (
    <Wrapper>
      {directionsLink && (
        <TopRow>
          <DirectionsLink onPress={() => Linking.openURL(directionsLink)} activeOpacity={0.7}>
            <DirectionsLinkLabel>길찾기</DirectionsLinkLabel>
            <Ionicons name="arrow-forward" size={13} color={COLORS.coral500} />
          </DirectionsLink>
        </TopRow>
      )}
      <MapWrapper>
        {KAKAO_MAP_JS_KEY ? (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            scrollEnabled={false}
            source={{ html }}
            onLoadEnd={() => {
              isMapReadyRef.current = true;
              // 로드가 이제 막 끝난 시점이라, 렌더 시점의 최신 selectedDay/distances를
              // 곧바로 한 번 보내 지도를 맞춰준다(로드 도중 값이 바뀌었을 수 있으므로).
              const payload: RouteMapUpdatePayload = { selectedDayIndex: selectedDay, distances };
              webViewRef.current?.injectJavaScript(
                `window.updateRouteMap(${JSON.stringify(JSON.stringify(payload))});true;`,
              );
            }}
          />
        ) : (
          <MapPlaceholder>
            <MapPlaceholderText>
              카카오맵 키가 아직 설정되지 않았어요.{'\n'}
              EXPO_PUBLIC_KAKAO_MAP_JS_KEY를 .env에 추가해주세요.
            </MapPlaceholderText>
          </MapPlaceholder>
        )}
      </MapWrapper>
      {dayList.length > 1 && (
        <TabRow>
          {dayList.map((day) => {
            const color = getDayRouteColor(day);
            const active = day === selectedDay;
            return (
              <DayTab
                key={day}
                $active={active}
                $color={color}
                onPress={() => onSelectDay(day)}
                activeOpacity={0.8}
              >
                <DayTabDot $color={active ? COLORS.white : color} />
                <DayTabLabel $active={active}>{day}일차</DayTabLabel>
              </DayTab>
            );
          })}
        </TabRow>
      )}
    </Wrapper>
  );
}
