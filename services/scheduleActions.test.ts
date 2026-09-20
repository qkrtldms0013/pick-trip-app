import type { ItineraryStop } from '../types/itinerary';
import { addStop, moveStop, removeStop, swapStops } from './scheduleActions';

function makeStops(): ItineraryStop[] {
  return [
    {
      contentId: 'a',
      day: 1,
      startTime: '10:00',
      endTime: '12:00',
      reason: 'r-a',
      addedByAi: false,
      addedForRest: false,
    },
    {
      contentId: 'b',
      day: 1,
      startTime: '12:00',
      endTime: '14:00',
      reason: 'r-b',
      addedByAi: false,
      addedForRest: false,
    },
    {
      contentId: 'c',
      day: 2,
      startTime: '10:00',
      endTime: '12:00',
      reason: 'r-c',
      addedByAi: false,
      addedForRest: false,
    },
  ];
}

describe('moveStop', () => {
  it('같은 날 안에서 순서를 앞으로 당기면 시간이 재계산된다', () => {
    const result = moveStop(makeStops(), 'b', 'up');
    const first = result.find((s) => s.day === 1 && s.startTime === '10:00');
    expect(first?.contentId).toBe('b');
  });

  it('날의 첫 번째 스탑을 위로 옮기면 원래 배열이 그대로 반환된다', () => {
    const stops = makeStops();
    const result = moveStop(stops, 'a', 'up');
    expect(result).toEqual(stops);
  });
});

describe('removeStop', () => {
  it('해당 스탑을 제거하고 남은 스탑의 시간을 다시 채운다', () => {
    const result = removeStop(makeStops(), 'a');
    expect(result.find((s) => s.contentId === 'a')).toBeUndefined();
    const remainingDay1 = result.find((s) => s.contentId === 'b');
    expect(remainingDay1?.startTime).toBe('10:00');
  });
});

describe('addStop', () => {
  it('지정한 날짜 끝에 스탑을 추가한다', () => {
    const result = addStop(makeStops(), 'd', 1);
    const added = result.find((s) => s.contentId === 'd');
    expect(added?.day).toBe(1);
    expect(added?.startTime).toBe('14:00');
  });
});

describe('swapStops', () => {
  it('같은 날 안에서 두 스탑의 순서를 맞바꾼다', () => {
    const result = swapStops(makeStops(), 1, 'a', 'b');
    const first = result.find((s) => s.day === 1 && s.startTime === '10:00');
    expect(first?.contentId).toBe('b');
    const second = result.find((s) => s.day === 1 && s.startTime === '12:00');
    expect(second?.contentId).toBe('a');
  });

  it('존재하지 않는 contentId면 원래 배열을 그대로 반환한다', () => {
    const stops = makeStops();
    const result = swapStops(stops, 1, 'a', 'z');
    expect(result).toEqual(stops);
  });
});
