import type { ItineraryStop } from '../types/itinerary';
import { minutesToTimeOfDay, parseTimeToMinutes } from '../utils/tripDate';

// 그 날 앵커(첫 정류지 시각)를 못 읽을 때만 쓰는 폴백(게스트 규칙 기반 생성기와 동일한 기준).
const DEFAULT_DAY_START_MINUTES = 9 * 60;
// 정류지 자신의 체류시간을 못 구할 때(막 추가한 정류지 등) 쓰는 기본값.
const DEFAULT_STOP_DURATION_MINUTES = 60;

function stopDurationMinutes(stop: ItineraryStop): number {
  const start = parseTimeToMinutes(stop.startTime);
  const end = parseTimeToMinutes(stop.endTime);
  if (start == null || end == null) return DEFAULT_STOP_DURATION_MINUTES;
  const diff = end - start;
  return diff > 0 ? diff : DEFAULT_STOP_DURATION_MINUTES;
}

// 일차별 "원래" 시작 시각(그 날 배열상 첫 정류지의 startTime)을 연산 전 입력에서 미리
// 뽑아둔다. 재정렬·삭제 뒤에는 그 날의 새 첫 정류지가 원래 첫 정류지와 달라지므로,
// recalculateTimes 내부에서 그때그때 집으면 하루의 진짜 시작 시각(dayStartTimes가
// 반영된 값)이 아니라 "옮겨진 정류지가 우연히 갖고 있던 시각"이 앵커가 되어버린다.
function computeDayAnchors(stops: ItineraryStop[]): Map<number, number> {
  const anchors = new Map<number, number>();
  for (const stop of stops) {
    if (anchors.has(stop.day)) continue;
    const minutes = parseTimeToMinutes(stop.startTime);
    if (minutes != null) anchors.set(stop.day, minutes);
  }
  return anchors;
}

// 정류지 순서를 바꾸거나 추가·삭제한 뒤 시간을 다시 채운다. 예전엔 무조건 10:00부터
// 2시간 슬롯으로 덮어써서, 순서만 바꿔도 서버가 실제로 배정한 시간(dayStartTimes·
// desiredStayMinutes가 반영된 값)이 사라졌다. 이제 각 정류지의 기존 체류시간(자기
// 자신의 endTime-startTime)은 그대로 유지하고, 그 날 원래 시작 시각(dayAnchors)부터
// 순서대로 다시 흘려보내기만 한다.
function recalculateTimes(
  stops: ItineraryStop[],
  dayAnchors: Map<number, number>,
): ItineraryStop[] {
  const dayGroups = new Map<number, ItineraryStop[]>();
  for (const stop of stops) {
    const group = dayGroups.get(stop.day) ?? [];
    group.push(stop);
    dayGroups.set(stop.day, group);
  }

  const result: ItineraryStop[] = [];
  for (const [day, group] of dayGroups) {
    let cursorMinutes = dayAnchors.get(day) ?? DEFAULT_DAY_START_MINUTES;
    group.forEach((stop) => {
      const durationMinutes = stopDurationMinutes(stop);
      const startTime = minutesToTimeOfDay(cursorMinutes);
      const endTime = minutesToTimeOfDay(cursorMinutes + durationMinutes);
      result.push({ ...stop, startTime, endTime });
      cursorMinutes += durationMinutes;
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
  return recalculateTimes(
    [...otherStops, ...reordered].sort((a, b) => a.day - b.day),
    computeDayAnchors(stops),
  );
}

export function removeStop(stops: ItineraryStop[], contentId: string): ItineraryStop[] {
  return recalculateTimes(
    stops.filter((s) => s.contentId !== contentId),
    computeDayAnchors(stops),
  );
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
  return recalculateTimes(
    [...otherStops, ...reordered].sort((a, b) => a.day - b.day),
    computeDayAnchors(stops),
  );
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
  return recalculateTimes([...stops, newStop], computeDayAnchors(stops));
}
