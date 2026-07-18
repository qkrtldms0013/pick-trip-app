import { generateItinerary } from './generateItinerary';

describe('generateItinerary', () => {
  it('선택한 콘텐츠 수만큼 stops가 생성된다', () => {
    const result = generateItinerary({
      selectedIds: ['a', 'b', 'c'],
      priorities: { a: 'must', b: 'good', c: 'optional' },
    });

    expect(result.stops).toHaveLength(3);
    expect(result.totalDays).toBe(2);
  });

  it('must 우선순위 콘텐츠가 1일차 앞쪽에 배치된다', () => {
    const result = generateItinerary({
      selectedIds: ['a', 'b'],
      priorities: { a: 'optional', b: 'must' },
    });

    const mustStop = result.stops.find((stop) => stop.contentId === 'b');
    expect(mustStop?.day).toBe(1);
    expect(mustStop?.startTime).toBe('10:00');
  });
});
