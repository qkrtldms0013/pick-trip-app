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

  // 리뷰에서 지적된 회귀: dayStartTimes(예: 07:00)·desiredStayMinutes(예: 30분)가 반영된
  // 실제 서버 시간이 재정렬 한 번에 10:00부터 2시간 슬롯으로 덮어써지던 문제.
  it('실제 서버 시간(다른 시작 시각·다른 체류시간)을 순서만 바꾸고 그대로 유지한다', () => {
    const stops: ItineraryStop[] = [
      {
        contentId: 'a',
        day: 1,
        startTime: '07:00',
        endTime: '07:30',
        reason: 'r-a',
        addedByAi: false,
        addedForRest: false,
      },
      {
        contentId: 'b',
        day: 1,
        startTime: '07:30',
        endTime: '09:30',
        reason: 'r-b',
        addedByAi: false,
        addedForRest: false,
      },
    ];

    const result = swapStops(stops, 1, 'a', 'b');

    const b = result.find((s) => s.contentId === 'b');
    const a = result.find((s) => s.contentId === 'a');
    // b가 앞으로 오면서 하루 시작 시각(07:00)을 그대로 물려받고, b 자신의 체류시간(2시간)은 유지된다.
    expect(b).toMatchObject({ startTime: '07:00', endTime: '09:00' });
    // a는 b 뒤로 밀리되, a 자신의 체류시간(30분)은 그대로다.
    expect(a).toMatchObject({ startTime: '09:00', endTime: '09:30' });
  });
});
