import axios from 'axios';
import { WEB_BASE_URL } from '../constants/api';
import type { Content } from '../types/content';
import type { ItineraryStop } from '../types/itinerary';
import type { DayRoute } from '../types/route';
import { computeDayHops, sumDistanceKm } from '../utils/geoDistance';

// 실도로 거리는 웹(pick-trip-web)이 이미 띄운 프록시(POST /api/directions)를 그대로 부른다.
// pick-trip-server가 아니다 — 이 앱(RN)은 웹의 Next.js 서버와 달리 카카오 REST 키를 숨길
// 서버 레이어가 없어서, 카카오 모빌리티를 직접 부르는 대신 웹이 이미 안전하게 감싸둔
// 엔드포인트를 재사용하기로 했다(2026-08-31 논의). 인증·CORS·레이트리밋이 없는 엔드포인트라
// 남용 방지 장치는 웹 담당과 별도 협의 대상 — 지금은 사용량이 적어 문제 없다고 판단.
const DIRECTIONS_PATH = '/api/directions';

// 카카오 waypoints/directions 한 번 호출의 상한(30)을 웹이 안에서 30개씩 쪼개 처리해주므로
// 여긴 그 상위 한도(points 자체는 최대 60)만 방어적으로 지킨다 — 하루 일정에 60곳을
// 넣는 일은 사실상 없지만, 넘기면 400이라 미리 막아서 호출 자체를 아낀다.
const MAX_POINTS = 60;

interface DirectionsPoint {
  lat: number;
  lng: number;
}

interface RouteSegmentResponse {
  distanceMeters: number;
  durationSeconds: number;
}

interface RouteResultResponse {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  // points.length - 1개. segments[i] = points[i] → points[i+1] 구간.
  segments: RouteSegmentResponse[];
  // 폴리라인용 [lng, lat] 정점 — 구간 거리/시간만 쓰는 여기선 안 씀.
  path: [number, number][];
}

type DirectionsResponseBody =
  | { ok: true; route: RouteResultResponse }
  | { ok: false; error: string };

// 좌표 2곳 미만이거나 한도(60) 초과는 애초에 호출할 이유가 없는(2곳 미만) 혹은 웹이 항상
// 400으로 답할(60 초과) 경우라 재시도로 해결되지 않는다 — 에러 없이 null을 반환해 STRAIGHT
// 폴백으로 조용히 넘어간다.
//
// 반면 타임아웃/네트워크 오류/{ ok: false }(카카오가 경로를 못 찾음 등, 웹 쪽 계약으로 예외가
// 아니라 200 응답으로 옴)는 "이번 시도가 실패했다"는 뜻이라 에러를 던진다. 예전엔 이 경우도
// null로 뭉개서 반환했는데, 그러면 getDayRoute가 에러 없이 끝난 것으로 보여 react-query가
// 실패를 성공(STRAIGHT)으로 캐시해버려 재시도가 영영 안 됐다 — 던져서 호출부가 실패를
// 실패로 인식하고 재시도하게 한다.
async function fetchDirections(points: DirectionsPoint[]): Promise<RouteResultResponse | null> {
  if (points.length < 2 || points.length > MAX_POINTS) return null;

  try {
    const { data } = await axios.post<DirectionsResponseBody>(
      `${WEB_BASE_URL}${DIRECTIONS_PATH}`,
      { points },
      { timeout: 8000, headers: { 'Content-Type': 'application/json' } },
    );
    if (data.ok) return data.route;
    throw new Error(`[routeDistanceService] 실도로 거리 조회 실패: ${data.error}`);
  } catch (error) {
    // 원인을 남기지 않으면 웹 서버가 죽은 건지 네트워크 문제인지 구분할 수 없다. 로그만
    // 남기고 그대로 다시 던져(rethrow) getDayRoute → react-query가 실패로 인식하게 한다.
    console.warn('[routeDistanceService] 실도로 거리 조회 실패', error);
    throw error;
  }
}

export async function getDayRoute(
  dayStops: ItineraryStop[],
  contentById: Record<string, Content | undefined>,
): Promise<DayRoute | null> {
  // 좌표를 모르는 콘텐츠(아직 안 불러왔거나 좌표 미상)는 여정에서 빠진다 — computeDayHops의
  // STRAIGHT 폴백과 같은 기준으로 걸러야, ROAD와 STRAIGHT 사이를 오갈 때 구간 수가 안 변한다.
  const orderedContents = dayStops
    .map((stop) => contentById[stop.contentId])
    .filter((content): content is Content => content != null);

  if (orderedContents.length >= 2) {
    const route = await fetchDirections(
      orderedContents.map((content) => ({ lat: content.latitude, lng: content.longitude })),
    );
    // route.segments는 orderedContents.length - 1개가 온다는 게 웹 프록시 쪽 계약일 뿐,
    // 여기서 검증 없이 route.segments[index]로 바로 접근하면 응답이 그보다 짧게 왔을 때(청크
    // 경계 처리나 부분 실패 등) TypeError가 나서 getDayRoute 전체가 reject된다 — 그러면 아래
    // STRAIGHT 폴백조차 못 타서, 받은 응답을 하나도 못 쓰고 날리게 된다. 개수를 먼저 확인해
    // 부족하면 ROAD를 포기하고 곧장 폴백으로 넘어간다.
    if (route && route.segments.length >= orderedContents.length - 1) {
      const legs = orderedContents.slice(0, -1).map((content, index) => ({
        fromContentId: content.id,
        toContentId: orderedContents[index + 1].id,
        distanceKm: route.segments[index].distanceMeters / 1000,
        durationMinutes: Math.round(route.segments[index].durationSeconds / 60),
      }));
      return {
        distanceBasis: 'ROAD',
        legs,
        totalDistanceKm: route.totalDistanceMeters / 1000,
        totalDurationMinutes: Math.round(route.totalDurationSeconds / 60),
      };
    }
  }

  // 여기 도달하는 경우는 좌표 2곳 미만, 혹은 응답을 받긴 했는데 형태가 안 맞는 경우뿐이다
  // (웹 서버 문제·카카오가 경로를 못 찾음 등 진짜 실패는 fetchDirections가 던져서 이 함수
  // 자체가 reject되므로 여기까지 안 온다) — 직선거리로 폴백한다. 컴포넌트 쪽에서
  // distanceBasis: STRAIGHT로 "추정치" 라벨을 붙인다.
  const hops = computeDayHops(dayStops, contentById);
  if (hops.length === 0) return null;

  return {
    distanceBasis: 'STRAIGHT',
    legs: hops.map((hop) => ({ ...hop, durationMinutes: null })),
    totalDistanceKm: sumDistanceKm(hops),
    totalDurationMinutes: null,
  };
}
