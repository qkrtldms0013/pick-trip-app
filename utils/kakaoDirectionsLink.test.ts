import { buildKakaoRouteLink } from './kakaoDirectionsLink';

describe('buildKakaoRouteLink', () => {
  it('장소가 2곳 미만이면 null을 반환한다', () => {
    expect(buildKakaoRouteLink([])).toBeNull();
    expect(
      buildKakaoRouteLink([{ name: '화개장터', latitude: 35.0, longitude: 127.5 }]),
    ).toBeNull();
  });

  it('순서대로 이어진 길찾기 링크를 만든다', () => {
    const link = buildKakaoRouteLink([
      { name: '화개장터', latitude: 35.0673, longitude: 127.7514 },
      { name: '최참판댁', latitude: 35.0741, longitude: 127.7605 },
    ]);
    // 한글 장소명은 encodeURIComponent로 퍼센트 인코딩되므로, 그대로 비교하는 대신
    // 디코딩해서 순서·좌표가 맞는지 확인한다.
    expect(link).toMatch(/^https:\/\/map\.kakao\.com\/link\/by\/CAR\//);
    expect(decodeURIComponent(link ?? '')).toBe(
      'https://map.kakao.com/link/by/CAR/화개장터,35.0673,127.7514/최참판댁,35.0741,127.7605',
    );
  });

  it('장소 이름에 슬래시·쉼표가 있으면 URL 인코딩해 경로 구분자와 안 겹치게 한다', () => {
    const link = buildKakaoRouteLink([
      { name: 'A/B,C', latitude: 35.0, longitude: 127.0 },
      { name: 'D', latitude: 35.1, longitude: 127.1 },
    ]);
    expect(link).toBe('https://map.kakao.com/link/by/CAR/A%2FB%2CC,35,127/D,35.1,127.1');
  });
});
