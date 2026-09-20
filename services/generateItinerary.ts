import type { Itinerary, ItineraryStop } from '../types/itinerary';
import type { Priority } from '../types/priority';

interface GenerateItineraryInput {
  selectedIds: string[];
  priorities: Record<string, Priority>;
}

const PRIORITY_WEIGHT: Record<Priority, number> = { must: 0, good: 1, optional: 2 };

// 웹 버전과 동일한 문구 — 실제 AI가 배치 이유를 판단한 것처럼 보이면 안 되므로, 우선순위
// 기반 규칙으로 만든 "미리보기"라는 걸 모든 스탑에 그대로 밝힌다.
const PREVIEW_REASON = '담아주신 콘텐츠를 기반으로 만든 미리보기 일정입니다.';

// 로그인 없이도 일정을 만들 수 있도록, 서버 AI 호출 없이 프론트에서 우선순위 기반으로
// 담은 콘텐츠를 정렬·배치하는 간단한 규칙 기반 생성기. 저장/공유/수정 시점에만 로그인이 필요하다.
export function generateItinerary({ selectedIds, priorities }: GenerateItineraryInput): Itinerary {
  const ordered = [...selectedIds].sort(
    (a, b) => PRIORITY_WEIGHT[priorities[a] ?? 'good'] - PRIORITY_WEIGHT[priorities[b] ?? 'good'],
  );

  const midpoint = Math.ceil(ordered.length / 2);
  const stops: ItineraryStop[] = ordered.map((contentId, index) => {
    const day = index < midpoint ? 1 : 2;
    const slotIndex = index < midpoint ? index : index - midpoint;
    const startHour = 10 + slotIndex * 2;

    return {
      contentId,
      day,
      startTime: `${String(startHour).padStart(2, '0')}:00`,
      endTime: `${String(startHour + 2).padStart(2, '0')}:00`,
      reason: PREVIEW_REASON,
      addedByAi: false,
      addedForRest: false,
    };
  });

  return { totalDays: 2, stops };
}
