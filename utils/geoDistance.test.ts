import type { Content } from '../types/content';
import type { ItineraryStop } from '../types/itinerary';
import { computeDayHops, haversineKm, sumDistanceKm } from './geoDistance';

// 백엔드 GeoDistanceTest와 같은 좌표·같은 기대값을 써서, 앱과 서버가 같은 거리를
// 계산한다는 걸 보장한다.
describe('haversineKm', () => {
  it('같은 좌표 사이의 거리는 0km이다', () => {
    expect(haversineKm(35.0673, 127.7514, 35.0673, 127.7514)).toBe(0);
  });

  it('하동군청과 영주시청 사이 직선거리는 약 208.7km이다', () => {
    const km = haversineKm(35.0673, 127.7514, 36.8057, 128.624);
    expect(km).toBeGreaterThan(206.7);
    expect(km).toBeLessThan(210.7);
  });

  it('출발지와 도착지를 바꿔도 거리는 같다', () => {
    const forward = haversineKm(35.0673, 127.7514, 36.6457, 128.437);
    const backward = haversineKm(36.6457, 128.437, 35.0673, 127.7514);
    expect(forward).toBeCloseTo(backward, 9);
  });
});

function makeContent(id: string, latitude: number, longitude: number): Content {
  return {
    id,
    regionId: 'hadong',
    name: id,
    category: 'attraction',
    summary: '',
    address: '',
    imageUrl: null,
    images: [],
    indoor: false,
    latitude,
    longitude,
    useTime: null,
    restDate: null,
    parking: null,
    stayDuration: null,
    reservationRequired: null,
  };
}

function makeStop(contentId: string, day: number): ItineraryStop {
  return { contentId, day, startTime: '10:00', endTime: '11:00', reason: '' };
}

describe('computeDayHops', () => {
  it('순서대로 이어진 구간마다 거리를 계산한다', () => {
    const contentById = {
      a: makeContent('a', 35.0673, 127.7514),
      b: makeContent('b', 36.8057, 128.624),
      c: makeContent('c', 36.6457, 128.437),
    };
    const stops = [makeStop('a', 1), makeStop('b', 1), makeStop('c', 1)];

    const hops = computeDayHops(stops, contentById);

    expect(hops).toHaveLength(2);
    expect(hops[0]).toMatchObject({ fromContentId: 'a', toContentId: 'b' });
    expect(hops[1]).toMatchObject({ fromContentId: 'b', toContentId: 'c' });
    expect(sumDistanceKm(hops)).toBeCloseTo(hops[0].distanceKm + hops[1].distanceKm, 9);
  });

  it('좌표를 모르는 콘텐츠가 끼면 그 구간만 건너뛴다', () => {
    const contentById: Record<string, Content | undefined> = {
      a: makeContent('a', 35.0673, 127.7514),
      b: undefined,
      c: makeContent('c', 36.6457, 128.437),
    };
    const stops = [makeStop('a', 1), makeStop('b', 1), makeStop('c', 1)];

    const hops = computeDayHops(stops, contentById);

    expect(hops).toHaveLength(0);
  });

  it('장소가 1곳 이하이면 빈 배열을 반환한다', () => {
    const contentById = { a: makeContent('a', 35.0673, 127.7514) };
    expect(computeDayHops([makeStop('a', 1)], contentById)).toEqual([]);
    expect(computeDayHops([], contentById)).toEqual([]);
  });
});
