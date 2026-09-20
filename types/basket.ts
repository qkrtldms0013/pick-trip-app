import type { CompanionType, StylePreference } from './companion';
import type { Priority } from './priority';

export interface BasketItem {
  itemId: string;
  contentId: string;
  title: string | null;
  thumbnailUrl: string | null;
  priority: Priority;
  // 사용자가 직접 지정한 희망 체류시간(분, 10~480). null이면 콘텐츠 타입별 기본값을 따른다.
  // 한번 지정하면 API 상 다시 null로 되돌릴 방법이 없다(서버 PATCH가 null 필드를 "미변경"으로
  // 다루기 때문) — services/basketService.ts의 동기화 로직 참고.
  desiredStayMinutes: number | null;
}

export interface BasketConditions {
  region: string | null;
  travelDate: string | null;
  duration: number | null;
  companion: CompanionType | null;
  stylePrefs: StylePreference[];
}

export interface Basket {
  basketId: string | null;
  conditions: BasketConditions;
  items: BasketItem[];
}
