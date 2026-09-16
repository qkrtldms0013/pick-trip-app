import { COLORS } from './colors';

// 일차마다 다른 색을 쓰면 오히려 헷갈린다는 피드백(2026-08-31)으로 모든 일차를 같은
// 코랄로 통일했다. 선택된 일차와 나머지는 색이 아니라 투명도(ItineraryRouteMap의
// opacity)로 구분한다.
export function getDayRouteColor(_dayIndex: number): string {
  return COLORS.coral500;
}
