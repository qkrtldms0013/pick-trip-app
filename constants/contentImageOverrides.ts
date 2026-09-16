// 백엔드(TourAPI 연동) 대표 사진이 실제 매장 분위기와 안 맞는다는 피드백을 받은 일부
// 콘텐츠에 한해, 프론트에서 이름·대표 사진을 덮어쓴다. 백엔드 데이터 자체는 그대로 두고
// (pick-trip-server는 건드리지 않는다는 팀 규칙) 화면에 내려줄 때만 교체하는 방식.
//
// - imageUrl을 지정하면: 카드 썸네일과 상세 화면 대표 사진(캐러셀 첫 장)을 이 URL로 바꾼다.
//   목록 카드와 상세 화면이 서로 다른 사진을 보여주던 콘텐츠(브릿지130, 카페 선비꽃,
//   축산본점식육식당, 청하 예천축산농협 한우프라자)는 목록 카드 쪽 firstImage 값을 그대로
//   적어서 통일한다 — 목록/상세가 서로 다른 API 응답이라 "생략하면 자동으로 맞춰준다" 같은
//   방식은 안 통해서, 실제 목록 firstImage 값을 조회해 직접 박아 넣는다.
// - name을 지정하면 표시 이름도 함께 바꾼다.
//
// 새로 추가할 땐 contentId를 키로 쓴다 — 이름은 검색어일 뿐 백엔드 응답에서 바뀔 수 있어서
// 매칭 기준으로 안 쓴다. contentId는 GET /contents?region=... 응답의 contentId 필드.
export interface ContentOverride {
  name?: string;
  imageUrl?: string;
}

export const CONTENT_IMAGE_OVERRIDES: Record<string, ContentOverride> = {
  // 하동
  '2841685': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/80/2841680_image2_1.JPG' }, // 고하버거 하동본점
  '2786098': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/55/2792455_image2_1.JPG' }, // 꽃님 (돈까스가 잘 보이는 사진으로)
  '2787999': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/75/2790875_image2_1.jpg' }, // 늘봄식당
  '2868101': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/98/2868098_image2_1.jpg' }, // 더로드101
  '791603': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/48/3530848_image2_1.jpg' }, // 도심다원
  '2788002': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/34/2790934_image2_1.jpg' }, // 만지횟집
  '2781622': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/76/3549476_image2_1.jpg' }, // 매암제다원
  '2782730': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/29/2788029_image2_1.jpg' }, // 버들횟집
  '2868110': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/07/2868107_image2_1.jpg' }, // 벚굴식당
  '2788005': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/02/2791002_image2_1.jpg' }, // 부두횟집
  '2870730': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/15/2870715_image2_1.jpg' }, // 브릿지130 — 목록 카드 사진으로 상세 화면 통일
  '2788011': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/15/2790815_image2_1.jpg' }, // 삼성궁맛집 성남식당(청학동)
  '2784765': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/36/2787936_image2_1.jpg' }, // 섬진강식당
  '2788006': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/91/2790791_image2_1.jpg' }, // 조양숯불갈비
  '2784643': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/49/2784649_image2_1.jpg' }, // 청운식당
  '2788913': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/22/2800222_image2_1.jpg' }, // 플래닛1020
  '1368910': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/46/3547946_image2_1.jpg' }, // 하동솔잎한우프라자
  '3442627': {
    name: '티카페하동',
    imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/23/3442623_image2_1.jpg',
  }, // 하동야생차치유관 티카페하동 → 티카페하동

  // 영주
  '2605878': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/66/2606366_image2_1.jpg' }, // 나드리
  '2821071': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/58/2821058_image2_1.jpg' }, // 녹스고지
  '2841439': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/21/2841421_image2_1.jpg' }, // 삼뜨락한정식
  '2841463': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/61/2841461_image2_1.jpg' }, // 아테네레스토랑
  '2841479': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/72/2841472_image2_1.jpg' }, // 영주축협한우프라자 본점
  '2832249': {
    name: '선비꽃이야기',
    imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/32/2832232_image2_1.jpg',
  }, // 카페, 선비꽃 → 선비꽃이야기, 목록 카드 사진으로 상세 화면 통일
  '2832268': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/61/2832261_image2_1.jpg' }, // 태극당
  '2629725': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/54/2630254_image2_1.jpg' }, // [백년가게]축산본점식육식당(축산회관) — 목록 카드 사진으로 상세 화면 통일

  // 예천
  '2831942': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/37/2831937_image2_1.jpg' }, // 맛질예찬 토담
  '2831962': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/55/2831955_image2_1.png' }, // 봉덕창고
  '2831980': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/78/2831978_image2_1.jpg' }, // 용궁단골식당본점
  '2832003': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/94/2831994_image2_1.jpg' }, // 윤훈식농가쌈밥
  '2832015': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/08/2832008_image2_1.jpg' }, // 제주복집
  '2832038': { imageUrl: 'http://tong.visitkorea.or.kr/cms/resource/27/2832027_image2_1.jpg' }, // 청하 예천축산농협 한우프라자 — 탐색 페이지 사진으로 상세 화면 통일
};

// Content/NearbyContentItem 등 화면에 내려주기 직전에 호출해 이름·대표 사진·(있으면) 사진
// 목록을 덮어쓴다. images가 없는 타입(NearbyContentItem)에도 그대로 쓸 수 있게 images는
// 선택 인자로 받는다.
export function applyContentImageOverride<
  T extends { id: string; name: string; imageUrl: string | null; images?: string[] },
>(content: T): T {
  const override = CONTENT_IMAGE_OVERRIDES[content.id];
  if (!override) return content;

  const imageUrl = override.imageUrl ?? content.imageUrl;
  const images = content.images
    ? imageUrl
      ? [imageUrl, ...content.images.filter((url) => url !== imageUrl)]
      : content.images
    : undefined;

  return {
    ...content,
    name: override.name ?? content.name,
    imageUrl,
    ...(images ? { images } : {}),
  };
}
