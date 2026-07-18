import type { Itinerary, ItineraryStop } from '../types/itinerary';
import { PRIORITY_LABELS, type Priority } from '../types/priority';

interface GenerateItineraryInput {
  selectedIds: string[];
  priorities: Record<string, Priority>;
}

const PRIORITY_WEIGHT: Record<Priority, number> = { must: 0, good: 1, optional: 2 };

export function generateItinerary({ selectedIds, priorities }: GenerateItineraryInput): Itinerary {
  const ordered = [...selectedIds].sort(
    (a, b) => PRIORITY_WEIGHT[priorities[a]] - PRIORITY_WEIGHT[priorities[b]],
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
      reason: `${PRIORITY_LABELS[priorities[contentId]]}로 표시하셔서 ${day}일차에 배치했습니다.`,
    };
  });

  return { totalDays: 2, stops };
}
