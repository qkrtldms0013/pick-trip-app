export interface ItineraryStop {
  contentId: string;
  day: number;
  startTime: string;
  endTime: string;
  reason: string;
  // AUGMENT 모드에서 AI가 바구니 밖 장소를 추가 제안한 경우 true. 저장된 일정(SavedResponse)
  // 응답엔 없는 필드라 daysToStops에서는 항상 false로 채운다.
  addedByAi: boolean;
  // 도보 부담으로 서버가 자동 삽입한 휴식 스톱인 경우 true. addedByAi와 동시에 true인 경우는 없다.
  addedForRest: boolean;
}

export interface Itinerary {
  totalDays: number;
  stops: ItineraryStop[];
}

// AI 일정 생성(POST /itineraries/generate)이 만들 수 있는 이동수단. 서버 enum과 이름을 맞춘다.
export type TravelMode = 'CAR' | 'TRANSIT';

// STRICT: 바구니에 담은 장소만으로 구성. AUGMENT: AI가 같은 지역의 다른 콘텐츠를 추가 제안할 수 있음.
export type GenerateMode = 'STRICT' | 'AUGMENT';

// 일정안(variant) 하나의 비교 지표. 산출 못 한 지표는 값이 null이고, unavailableReasons에
// 같은 키로 사유 코드가 담긴다(예: { totalTransitCost: "UNKNOWN_TRAVEL_DISTANCE" }).
export interface VariantMetrics {
  totalTravelMinutes: number | null;
  totalWalkingMinutes: number | null;
  totalTransitCost: number | null;
  placeCount: number | null;
  unavailableReasons: Record<string, string>;
}

// 이동수단 하나로 만든 일정안 전체.
export interface ItineraryVariant {
  // 서버가 주는 한국어 표시 이름(예: "자동차 힐링 루트"). 그대로 쓴다.
  label: string;
  travelMode: TravelMode;
  title: string;
  stops: ItineraryStop[];
  adjustments: string[];
  metrics: VariantMetrics;
}

// 혼잡 기반 순서변경 제안. 서버는 순서를 직접 바꾸지 않고 제안만 준다 — 반영은 항상
// 클라이언트 책임(수락하면 로컬 stops 순서만 바꾼다, 서버 PATCH는 호출하지 않는다).
export interface ItinerarySuggestion {
  type: 'CONGESTION_REORDER';
  message: string;
  dayIndex: number;
  contentId: string;
  // 대신 갈만한 곳이 마땅치 않으면 null — 이 경우 문구만 보여주고 액션 버튼은 숨긴다.
  swapWithContentId: string | null;
}
