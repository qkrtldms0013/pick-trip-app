import type { Content } from '../types/content';
import type { ItineraryStop } from '../types/itinerary';
import { buildShareText } from './shareItineraryText';

const contentById: Record<string, Content> = {
  a: {
    id: 'a',
    regionId: 'hadong',
    name: '화개장터',
    category: 'market',
    tagline: '',
    duration: '',
    parking: false,
    kidsRecommended: false,
    seniorsRecommended: false,
    indoor: false,
    color: '#fff',
  },
  b: {
    id: 'b',
    regionId: 'hadong',
    name: '최참판댁',
    category: 'culture',
    tagline: '',
    duration: '',
    parking: false,
    kidsRecommended: false,
    seniorsRecommended: false,
    indoor: false,
    color: '#fff',
  },
};

const stops: ItineraryStop[] = [
  { contentId: 'a', day: 1, startTime: '10:00', endTime: '12:00', reason: 'r' },
  { contentId: 'b', day: 2, startTime: '10:00', endTime: '12:00', reason: 'r' },
];

describe('buildShareText', () => {
  it('일자별로 장소가 시간 순서대로 정리된 텍스트를 만든다', () => {
    const text = buildShareText({ stops, contentById });
    expect(text).toContain('10:00-12:00 화개장터');
    expect(text).toContain('10:00-12:00 최참판댁');
  });

  it('1일차/2일차 사이에 빈 줄로 구분된다', () => {
    const text = buildShareText({ stops, contentById });
    expect(text.split('\n\n')).toHaveLength(2);
  });
});
