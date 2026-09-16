export interface RouteWaypoint {
  name: string;
  latitude: number;
  longitude: number;
}

// 카카오맵 웹 링크 중 "여러 장소를 순서대로 잇는 길찾기"용 형식.
// https://map.kakao.com/link/by/CAR/이름1,위도1,경도1/이름2,위도2,경도2/...
// 앱이 깔려있으면 앱으로, 없으면 웹으로 열리는 범용 링크라 별도 딥링크 스킴 권한 설정
// 없이 Linking.openURL 하나로 된다 — ContentDetailScreen의 단일 장소 링크와 같은 방식.
export function buildKakaoRouteLink(waypoints: RouteWaypoint[]): string | null {
  if (waypoints.length < 2) return null;

  const segments = waypoints
    .map((point) => `${encodeURIComponent(point.name)},${point.latitude},${point.longitude}`)
    .join('/');
  return `https://map.kakao.com/link/by/CAR/${segments}`;
}
