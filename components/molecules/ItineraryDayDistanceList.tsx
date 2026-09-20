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
  tripTotalDistanceKm: number;
}

const Card = styled(View)`
  background-color: ${COLORS.white};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  margin: 12px 20px 16px;
  overflow: hidden;
`;

const LegRow = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 13px 15px;
`;

const LegDot = styled(View)`
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: ${COLORS.coral500};
`;

const LegNames = styled(Text)`
  flex: 1;
  font-family: ${FONT.regular};
  font-size: 12.5px;
  color: ${COLORS.gray700};
`;

const LegDistance = styled(Text)`
  font-family: ${FONT.semibold};
  font-size: 12.5px;
  color: ${COLORS.gray900};
`;

const DayTotalRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 13px 15px;
  border-top-width: 1px;
  border-top-color: ${COLORS.gray100};
`;

const GrandTotalRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 13px 15px;
  background-color: ${COLORS.coral50};
`;

const TotalLabel = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12.5px;
  color: ${COLORS.gray700};
`;

const DayTotalValue = styled(Text)`
  font-family: ${FONT.bold};
  font-size: 13.5px;
  color: ${COLORS.gray900};
`;

const GrandTotalLabel = styled(Text)`
  font-family: ${FONT.bold};
  font-size: 12.5px;
  color: ${COLORS.coral700};
`;

const GrandTotalValue = styled(Text)`
  font-family: ${FONT.bold};
  font-size: 14px;
  color: ${COLORS.coral700};
`;

const BasisNote = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 11px;
  color: ${COLORS.gray400};
  padding: 0 15px 10px;
`;

// 지도 아래에서 "N일차" 탭을 골랐을 때 그 날 구간별 거리 + 총 이동거리를 보여준다.
// route(카카오 실도로 거리)가 아직 없으면 좌표로 즉석 계산한 직선거리로 채우고, 그렇다는
// 걸 하단에 작은 문구로 밝혀 실도로 거리와 헷갈리지 않게 한다.
export function ItineraryDayDistanceList({
  day,
  dayStops,
  contentById,
  route,
  tripTotalDistanceKm,
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
            <LegDot />
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
      <DayTotalRow>
        <TotalLabel>{day}일차 총 이동거리</TotalLabel>
        <DayTotalValue>{totalDistanceKm.toFixed(1)}km</DayTotalValue>
      </DayTotalRow>
      <GrandTotalRow>
        <GrandTotalLabel>총 이동거리</GrandTotalLabel>
        <GrandTotalValue>{tripTotalDistanceKm.toFixed(1)}km</GrandTotalValue>
      </GrandTotalRow>
      {!isRoad && <BasisNote>직선거리 기준 추정치예요.</BasisNote>}
    </Card>
  );
}
