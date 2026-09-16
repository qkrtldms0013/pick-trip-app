export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.pick-trip.app';
export const API_PREFIX = '/api/v1';

// 웹(pick-trip-web)의 실도로 거리 프록시(/api/directions)를 호출할 때 쓴다 — pick-trip-server가
// 아니라 웹 레포 자체 서버다. routeDistanceService.ts 상단 설명 참고.
export const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_BASE_URL ?? 'https://www.pick-trip.app';
