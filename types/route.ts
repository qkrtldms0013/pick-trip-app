// 콘텐츠 두 곳 사이의 거리가 어떤 방식으로 산출됐는지. 백엔드 nearby API
// (NearbyContentResponse.DistanceBasis)와 같은 이름·같은 의미를 쓴다.
// - ROAD: 카카오 모빌리티 길찾기로 계산한 실제 자동차 도로 거리
// - STRAIGHT: 좌표 사이 직선(하버사인) 거리. 도로거리 조회 불가/실패 시 폴백
export type DistanceBasis = 'ROAD' | 'STRAIGHT';

export interface RouteLeg {
  fromContentId: string;
  toContentId: string;
  distanceKm: number;
  // STRAIGHT 기준이면 소요 시간을 알 수 없으므로 null.
  durationMinutes: number | null;
}

export interface DayRoute {
  distanceBasis: DistanceBasis;
  legs: RouteLeg[];
  totalDistanceKm: number;
  totalDurationMinutes: number | null;
}
