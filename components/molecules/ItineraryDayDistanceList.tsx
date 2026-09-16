import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import styled from 'styled-components';
import { COLORS } from '../../constants/colors';
import { FONT } from '../../constants/typography';
import type { Content } from '../../types/content';
import type { ItineraryStop } from '../../types/itinerary';
import type { DayRoute } from '../../types/route';
import { computeDayHops, sumDistanceKm } from '../../utils/geoDistance';

interface ItineraryDayDistanceListProps {
  day: number;
  dayStops: ItineraryStop[];
  contentById: Record<string, Content | undefined>;
  route: DayRoute | null;
}

const Card = styled(View)`
  background-color: ${COLORS.white};
  border-radius: 12px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  margin: 0 20px 16px;
  padding: 4px 16px;
`;

const LegRow = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding-vertical: 10px;
  border-bottom-width: 1px;
  border-bottom-color: ${COLORS.gray100};
`;

const LegNames = styled(Text)`
  flex: 1;
  font-family: ${FONT.regular};
  font-size: 13px;
  color: ${COLORS.gray700};
`;

const LegDistance = styled(Text)`
  font-family: ${FONT.semibold};
  font-size: 13px;
  color: ${COLORS.gray900};
`;

const TotalRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-vertical: 12px;
`;

const TotalLabel = styled(Text)`
  font-family: ${FONT.medium};
  font-size: 13px;
  color: ${COLORS.gray500};
`;

const TotalValue = styled(Text)`
  font-family: ${FONT.bold};
  font-size: 15px;
  color: ${COLORS.coral500};
`;

const BasisNote = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 11px;
  color: ${COLORS.gray400};
  padding-bottom: 10px;
`;

// 지도 아래에서 "N일차" 탭을 골랐을 때 그 날 구간별 거리 + 총 이동거리를 보여준다.
// route(카카오 실도로 거리)가 아직 없으면 좌표로 즉석 계산한 직선거리로 채우고, 그렇다는
// 걸 하단에 작은 문구로 밝혀 실도로 거리와 헷갈리지 않게 한다.
export function ItineraryDayDistanceList({
  day,
  dayStops,
  contentById,
  route,
}: ItineraryDayDistanceListProps) {
  const legs = useMemo(() => {
    if (route) return route.legs.map((leg) => ({ ...leg }));
    return computeDayHops(dayStops, contentById).map((hop) => ({
      fromContentId: hop.fromContentId,
      toContentId: hop.toContentId,
      distanceKm: hop.distanceKm,
      durationMinutes: null as number | null,
    }));
  }, [route, dayStops, contentById]);

  // legs가 이미 메모돼 있으니 합산은 훅 없이 바로 계산해도 렌더마다 다시 만들지 않는다.
  const totalDistanceKm = route ? route.totalDistanceKm : sumDistanceKm(legs);

  if (legs.length === 0) return null;

  const isRoad = route?.distanceBasis === 'ROAD';

  return (
    <Card>
      {legs.map((leg) => {
        const from = contentById[leg.fromContentId];
        const to = contentById[leg.toContentId];
        return (
          <LegRow key={`${leg.fromContentId}-${leg.toContentId}`}>
            <Ionicons name="navigate-outline" size={13} color={COLORS.gray400} />
            <LegNames numberOfLines={1}>
              {from?.name ?? '알 수 없음'} → {to?.name ?? '알 수 없음'}
            </LegNames>
            <LegDistance>
              {leg.distanceKm.toFixed(1)}km
              {leg.durationMinutes != null ? ` · ${leg.durationMinutes}분` : ''}
            </LegDistance>
          </LegRow>
        );
      })}
      <TotalRow>
        <TotalLabel>{day}일차 총 이동거리</TotalLabel>
        <TotalValue>{totalDistanceKm.toFixed(1)}km</TotalValue>
      </TotalRow>
      {!isRoad && <BasisNote>직선거리 기준 추정치예요.</BasisNote>}
    </Card>
  );
}
