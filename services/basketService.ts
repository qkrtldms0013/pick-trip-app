// biome-ignore-all lint/style/useNamingConvention: 매핑 테이블의 키가 CompanionType/StylePreference/Priority의 snake_case 값을 그대로 따른다
import type { CompanionType, StylePreference } from '../types/companion';
import type { Priority } from '../types/priority';
import { nightsToApiDuration } from '../utils/tripDate';
import { apiClient } from './apiClient';

// 프론트 값(camelCase/설명형)과 백엔드 enum 이름이 1:1로 안 맞는 것들이 있어
// 여기서 명시적으로 매핑한다. (예: with_kids → WITH_CHILD, must → MUST_VISIT)
const COMPANION_TO_API: Record<CompanionType, string> = {
  with_kids: 'WITH_CHILD',
  with_parents: 'WITH_PARENTS',
  whole_family: 'WHOLE_FAMILY',
};

const STYLE_TO_API: Record<StylePreference, string> = {
  less_walking: 'LESS_WALKING',
  nature_focused: 'NATURE_FOCUSED',
  experience_focused: 'EXPERIENCE_FOCUSED',
  food_focused: 'FOOD_FOCUSED',
  indoor_alternative: 'INDOOR_ALTERNATIVE',
};

const PRIORITY_TO_API: Record<Priority, string> = {
  must: 'MUST_VISIT',
  good: 'PREFERRED',
  optional: 'OPTIONAL',
};

export interface BasketSyncItem {
  contentId: string;
  priority: Priority;
  title: string | null;
  thumbnailUrl: string | null;
  // 사용자가 직접 지정한 희망 체류시간(분, 10~480). null이면 서버가 콘텐츠 타입별 기본값을 쓴다.
  desiredStayMinutes: number | null;
}

export interface BasketSyncInput {
  region: string; // 대문자 지역 코드 (예: 'YEONGJU')
  travelDate: string | null;
  duration: number | null; // 박 수(0=당일치기). 백엔드로 보낼 때 일수로 변환한다.
  companion: CompanionType | null;
  stylePrefs: StylePreference[];
  items: BasketSyncItem[];
}

interface ServerBasketItem {
  itemId: string;
  contentId: string;
  priority: string;
  desiredStayMinutes: number | null;
}

interface ServerBasketResponse {
  basketId: string | null;
  items: ServerBasketItem[];
}

/**
 * 로컬 바구니(기기 저장)를 서버 바구니로 동기화한다.
 *
 * `/itineraries/generate`는 요청 body를 받지 않고 서버에 저장된 바구니만 읽어서 AI를 호출하므로,
 * 로그인 사용자가 AI 일정을 생성하려면 이 동기화가 먼저 끝나 있어야 한다.
 *
 * 참고: 백엔드 `BasketRepository.findByUserId`가 items+companions를 한 EntityGraph로 같이
 * 로딩하면서 companions가 2개 이상이면 items가 그만큼 중복되는 버그가 있다. 이 때문에 아래
 * "서버에만 남은 항목 삭제"가 항상 반영되진 않을 수 있다 — 알려진 백엔드 이슈이며 프론트에서
 * 고칠 수 없다.
 */
export async function syncBasketToServer(input: BasketSyncInput): Promise<void> {
  const { data: current } = await apiClient.get<ServerBasketResponse>('/baskets');
  // TEMP DEBUG (원인 조사용, 확인 끝나면 제거): 동기화 직전 서버 바구니에 이전 지역 항목이
  // 안 지워진 채 남아있는지 확인한다.
  console.warn(
    '[basket] 동기화 전 서버 바구니',
    current.items,
    '| 로컬(현재 지역) contentId 목록:',
    input.items.map((item) => item.contentId),
  );

  const companions = [
    ...(input.companion ? [COMPANION_TO_API[input.companion]] : []),
    ...input.stylePrefs.map((style) => STYLE_TO_API[style]),
  ];
  await apiClient.put('/baskets/conditions', {
    region: input.region || null,
    travelDate: input.travelDate,
    // 백엔드는 박 수가 아니라 일수를 쓴다(1=당일치기, 2=1박2일 …). 0(당일치기)을 그대로
    // 보내면 duration의 @Positive 검증에 걸려 VALIDATION_FAILED가 난다 — 백엔드팀 확인 완료.
    duration: nightsToApiDuration(input.duration),
    companions,
  });

  const currentByContentId = new Map(current.items.map((item) => [item.contentId, item]));
  const nextContentIds = new Set(input.items.map((item) => item.contentId));

  // 로컬에서 이미 빠진 서버 항목 제거 (베스트 에포트: 위 EntityGraph 버그로 실패할 수 있음)
  await Promise.all(
    current.items
      .filter((item) => !nextContentIds.has(item.contentId))
      .map((item) =>
        apiClient.delete(`/baskets/items/${item.itemId}`).catch(() => {
          // 알려진 백엔드 버그로 삭제가 반영 안 될 수 있다. 동기화 자체는 계속 진행한다.
        }),
      ),
  );

  // 로컬 항목을 서버에 추가하거나, 이미 있으면 바뀐 필드(우선순위·희망 체류시간)만 맞춘다.
  await Promise.all(
    input.items.map((item) => {
      const existing = currentByContentId.get(item.contentId);
      const priority = PRIORITY_TO_API[item.priority];
      if (!existing) {
        return apiClient.post('/baskets/items', {
          contentId: item.contentId,
          priority,
          title: item.title,
          thumbnailUrl: item.thumbnailUrl,
          desiredStayMinutes: item.desiredStayMinutes,
        });
      }
      // PATCH는 priority·desiredStayMinutes 둘 다 선택 필드인 부분 갱신이라, 값을 보낸
      // 필드만 바뀌고 나머지는 유지된다 — 바뀐 필드만 골라 담는다(둘 다 없으면 400이라
      // 안 보낸다). desiredStayMinutes가 null이면 "지우기"가 아니라 "안 보냄"으로 다뤄야
      // 한다 — 서버가 null 필드를 미변경으로 처리하므로 한번 지정한 값은 되돌릴 수 없다
      // (types/basket.ts의 BasketItem.desiredStayMinutes 주석 참고).
      const patch: { priority?: string; desiredStayMinutes?: number } = {};
      if (existing.priority !== priority) patch.priority = priority;
      if (
        item.desiredStayMinutes != null &&
        existing.desiredStayMinutes !== item.desiredStayMinutes
      ) {
        patch.desiredStayMinutes = item.desiredStayMinutes;
      }
      if (Object.keys(patch).length > 0) {
        return apiClient.patch(`/baskets/items/${existing.itemId}`, patch);
      }
      return undefined;
    }),
  );
}
