export type ContentCategory =
  | 'food'
  | 'festival'
  | 'attraction'
  | 'culture'
  | 'nature'
  | 'experience';

// 지역(시군구) 단위 근사치다 — 개별 장소 실측이 아니므로 항상 approximate: true.
// totalVisitors만 있고 dailyAverageVisitors/period가 null인 경우 그 두 항목은 화면에서 숨긴다.
export interface VisitorStats {
  totalVisitors: number | null;
  dailyAverageVisitors: number | null;
  period: string | null;
  source: string;
  baseDate: string; // "YYYY-MM-DD"
  approximate: true;
}

export interface Content {
  id: string;
  regionId: string;
  name: string;
  category: ContentCategory;
  summary: string;
  address: string;
  imageUrl: string | null;
  // 상세 화면 사진 넘기기(캐러셀)용 전체 사진 목록. 목록 조회는 대표 사진 1장(firstImage)만
  // 내려줘서, 카드 목록에서 만든 Content는 이 배열이 [imageUrl] 아니면 [] 하나뿐이다.
  images: string[];
  indoor: boolean;
  latitude: number;
  longitude: number;
  // 아래 5개는 상세 조회(GET /contents/{id})에서만 내려온다. 목록 조회(GET /contents)
  // 응답엔 없어서, 카드 목록에서 만든 Content는 이 필드들이 전부 null이다.
  useTime: string | null;
  restDate: string | null;
  parking: string | null;
  stayDuration: string | null;
  reservationRequired: string | null;
  visitorStats: VisitorStats | null;
}
