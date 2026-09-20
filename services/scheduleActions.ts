import type { ItineraryStop } from '../types/itinerary';

function recalculateTimes(stops: ItineraryStop[]): ItineraryStop[] {
  const dayGroups = new Map<number, ItineraryStop[]>();
  for (const stop of stops) {
    const group = dayGroups.get(stop.day) ?? [];
    group.push(stop);
    dayGroups.set(stop.day, group);
  }

  const result: ItineraryStop[] = [];
  for (const [, group] of dayGroups) {
    group.forEach((stop, index) => {
      const startHour = 10 + index * 2;
      result.push({
        ...stop,
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        endTime: `${String(startHour + 2).padStart(2, '0')}:00`,
      });
    });
  }
  return result;
}

export function moveStop(
  stops: ItineraryStop[],
  contentId: string,
  direction: 'up' | 'down',
): ItineraryStop[] {
  const day = stops.find((s) => s.contentId === contentId)?.day;
  const dayStops = stops.filter((s) => s.day === day);
  const index = dayStops.findIndex((s) => s.contentId === contentId);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || targetIndex < 0 || targetIndex >= dayStops.length) return stops;

  const reordered = [...dayStops];
  [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

  const otherStops = stops.filter((s) => s.day !== day);
  return recalculateTimes([...otherStops, ...reordered].sort((a, b) => a.day - b.day));
}

export function removeStop(stops: ItineraryStop[], contentId: string): ItineraryStop[] {
  return recalculateTimes(stops.filter((s) => s.contentId !== contentId));
}

// 혼잡 기반 순서변경 제안을 수락했을 때 쓴다. 같은 날짜(dayIndex) 안에서 두 스톱의 순서만
// 맞바꾼다 — 서버는 제안만 주고 반영은 항상 로컬 stops 순서 변경으로 끝낸다.
export function swapStops(
  stops: ItineraryStop[],
  dayIndex: number,
  contentIdA: string,
  contentIdB: string,
): ItineraryStop[] {
  const dayStops = stops.filter((s) => s.day === dayIndex);
  const indexA = dayStops.findIndex((s) => s.contentId === contentIdA);
  const indexB = dayStops.findIndex((s) => s.contentId === contentIdB);
  if (indexA === -1 || indexB === -1) return stops;

  const reordered = [...dayStops];
  [reordered[indexA], reordered[indexB]] = [reordered[indexB], reordered[indexA]];

  const otherStops = stops.filter((s) => s.day !== dayIndex);
  return recalculateTimes([...otherStops, ...reordered].sort((a, b) => a.day - b.day));
}

export function addStop(stops: ItineraryStop[], contentId: string, day: number): ItineraryStop[] {
  const newStop: ItineraryStop = {
    contentId,
    day,
    startTime: '00:00',
    endTime: '00:00',
    reason: '직접 추가한 장소입니다.',
    addedByAi: false,
    addedForRest: false,
  };
  return recalculateTimes([...stops, newStop]);
}
