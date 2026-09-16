import type { Content } from '../types/content';
import type { ItineraryStop } from '../types/itinerary';

// 지구 평균 반경(km). 백엔드 GeoDistance.kilometers와 동일한 상수·공식을 쓴다 —
// 값이 갈리면 앱과 서버가 같은 일정을 두고 다른 거리를 보여주게 된다.
const EARTH_RADIUS_KM = 6371.0;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** 두 좌표 사이의 대권 거리(하버사인, km)를 계산한다. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;

  // 부동소수점 오차로 a가 1을 살짝 넘어 NaN이 나오는 걸 막는다.
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface StopHop {
  fromContentId: string;
  toContentId: string;
  distanceKm: number;
}

/**
 * 하루 일정 안에서 순서대로 이어진 콘텐츠 사이 구간 거리를 계산한다.
 * 좌표를 모르는 콘텐츠(아직 안 불러왔거나 좌표 미상)가 끼면 그 구간은 건너뛴다 —
 * 잘못된 거리를 보여주는 것보다 그 구간만 비우는 편이 낫다.
 */
export function computeDayHops(
  dayStops: ItineraryStop[],
  contentById: Record<string, Content | undefined>,
): StopHop[] {
  const hops: StopHop[] = [];
  for (let i = 0; i < dayStops.length - 1; i++) {
    const from = contentById[dayStops[i].contentId];
    const to = contentById[dayStops[i + 1].contentId];
    if (!from || !to) continue;
    hops.push({
      fromContentId: dayStops[i].contentId,
      toContentId: dayStops[i + 1].contentId,
      distanceKm: haversineKm(from.latitude, from.longitude, to.latitude, to.longitude),
    });
  }
  return hops;
}

export function sumDistanceKm(hops: StopHop[]): number {
  return hops.reduce((sum, hop) => sum + hop.distanceKm, 0);
}
