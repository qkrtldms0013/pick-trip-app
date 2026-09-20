import type {
  GenerateMode,
  ItineraryStop,
  ItinerarySuggestion,
  ItineraryVariant,
  TravelMode,
} from '../types/itinerary';
import { apiDurationToNights, nightsToApiDuration } from '../utils/tripDate';
import { apiClient } from './apiClient';
import type { SavedItinerarySummary } from './itineraryHistoryStorage';

interface ApiItem {
  contentId: string;
  title: string | null;
  order: number;
  reason: string;
}

interface ApiDay {
  dayIndex: number;
  items: ApiItem[];
}

interface SavedResponse {
  itineraryId: string;
  title: string;
  region: string;
  travelDate: string | null;
  duration: number | null; // 백엔드 값(일수, 1=당일치기). toPlan()에서 박 수로 변환한다.
  days: ApiDay[];
}

export interface ItineraryPlan {
  itineraryId: string | null;
  title: string;
  region: string;
  travelDate: string | null;
  duration: number | null; // 박 수(0=당일치기) — 앱 내부 공용 표현
  stops: ItineraryStop[];
}

function daysToStops(days: ApiDay[]): ItineraryStop[] {
  const stops: ItineraryStop[] = [];
  for (const day of days) {
    const sorted = [...day.items].sort((a, b) => a.order - b.order);
    sorted.forEach((item, index) => {
      const startHour = 10 + index * 2;
      stops.push({
        contentId: item.contentId,
        day: day.dayIndex,
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        endTime: `${String(startHour + 2).padStart(2, '0')}:00`,
        reason: item.reason,
        // 저장된 일정 조회(SavedResponse)엔 이 필드가 없다 — 항상 false로 채운다.
        addedByAi: false,
        addedForRest: false,
      });
    });
  }
  return stops;
}

function stopsToDays(stops: ItineraryStop[], titleByContentId: Record<string, string>) {
  const dayIndexes = Array.from(new Set(stops.map((s) => s.day))).sort((a, b) => a - b);
  return dayIndexes.map((dayIndex) => ({
    dayIndex,
    items: stops
      .filter((s) => s.day === dayIndex)
      .map((s, order) => ({
        contentId: s.contentId,
        title: titleByContentId[s.contentId] ?? null,
        order,
        reason: s.reason,
        pinned: false,
      })),
  }));
}

function toPlan(data: SavedResponse): ItineraryPlan {
  return {
    itineraryId: data.itineraryId,
    title: data.title,
    region: data.region.toLowerCase(),
    travelDate: data.travelDate,
    duration: apiDurationToNights(data.duration),
    stops: daysToStops(data.days),
  };
}

interface SavePlanInput {
  title: string;
  region: string;
  travelDate: string | null;
  duration: number | null; // 박 수(0=당일치기)
  stops: ItineraryStop[];
  titleByContentId: Record<string, string>;
}

function toSaveBody(input: SavePlanInput) {
  return {
    title: input.title,
    region: input.region.toUpperCase(),
    travelDate: input.travelDate,
    duration: nightsToApiDuration(input.duration),
    days: stopsToDays(input.stops, input.titleByContentId),
  };
}

export async function saveItineraryPlan(input: SavePlanInput): Promise<ItineraryPlan> {
  const { data } = await apiClient.post<SavedResponse>('/itineraries', toSaveBody(input));
  return toPlan(data);
}

export async function updateItineraryPlan(
  itineraryId: string,
  input: SavePlanInput,
): Promise<ItineraryPlan> {
  const { data } = await apiClient.patch<SavedResponse>(
    `/itineraries/${itineraryId}`,
    toSaveBody(input),
  );
  return toPlan(data);
}

export async function getItineraryPlan(itineraryId: string): Promise<ItineraryPlan> {
  const { data } = await apiClient.get<SavedResponse>(`/itineraries/${itineraryId}`);
  return toPlan(data);
}

interface ListItineraryItem {
  itineraryId: string;
  title: string;
  region: string;
  travelDate: string | null;
  duration: number | null; // 백엔드 값(일수, 1=당일치기)
  lastModifiedAt: string;
}

// 로그인 사용자가 저장한 일정 전체 목록. 백엔드팀이 2026-08-26에 새로 배포했다(단건 삭제
// API는 아직 확인 전이라, "삭제"는 services/itineraryHistoryStorage.ts의 로컬 숨김 목록으로
// 처리한다 — 자세한 배경은 그 파일 참고).
export async function listItineraryPlans(): Promise<SavedItinerarySummary[]> {
  const { data } = await apiClient.get<ListItineraryItem[]>('/itineraries');
  return data.map((item) => ({
    itineraryId: item.itineraryId,
    title: item.title,
    region: item.region.toLowerCase(),
    travelDate: item.travelDate,
    duration: apiDurationToNights(item.duration),
    savedAt: item.lastModifiedAt,
  }));
}

// /itineraries/generate 전용 응답 모양이다. 저장된 일정(SavedResponse)과 달리 이동수단별
// variants가 있고, 각 아이템에 실제 방문 시각(startTime/endTime)과 AI 추가 여부가 그대로
// 온다 — 그래서 SavedResponse/daysToStops를 재사용하지 않고 이 응답 전용 매핑을 따로 둔다.
interface GenerateApiItem {
  contentId: string;
  title: string | null;
  order: number;
  reason: string;
  startTime: string; // "HH:mm"
  endTime: string;
  addedByAi: boolean;
  addedForRest: boolean;
}

interface GenerateApiDay {
  dayIndex: number;
  items: GenerateApiItem[];
}

interface GenerateApiVariant {
  label: string;
  travelMode: TravelMode;
  title: string;
  days: GenerateApiDay[];
  adjustments: string[];
  metrics: {
    totalTravelMinutes: number | null;
    totalWalkingMinutes: number | null;
    totalTransitCost: number | null;
    placeCount: number | null;
    unavailableReasons: Record<string, string>;
  };
}

interface GenerateApiSuggestion {
  type: 'CONGESTION_REORDER';
  message: string;
  dayIndex: number;
  contentId: string;
  swapWithContentId: string | null;
}

interface GenerateApiResponse {
  region: string;
  travelDate: string | null;
  duration: number | null; // 백엔드 값(일수, 1=당일치기)
  variants: GenerateApiVariant[];
  suggestions: GenerateApiSuggestion[];
}

export interface ItineraryPreview {
  region: string;
  travelDate: string | null;
  duration: number | null; // 박 수(0=당일치기)
  variants: ItineraryVariant[];
  suggestions: ItinerarySuggestion[];
}

// 실제 서버가 계산한 방문 시각을 그대로 쓴다(daysToStops처럼 순번 기반으로 10시부터
// 2시간씩 임의 배정하지 않음 — 이 응답은 진짜 시각을 준다).
function generateDaysToStops(days: GenerateApiDay[]): ItineraryStop[] {
  const stops: ItineraryStop[] = [];
  for (const day of days) {
    const sorted = [...day.items].sort((a, b) => a.order - b.order);
    for (const item of sorted) {
      stops.push({
        contentId: item.contentId,
        day: day.dayIndex,
        startTime: item.startTime,
        endTime: item.endTime,
        reason: item.reason,
        addedByAi: item.addedByAi,
        addedForRest: item.addedForRest,
      });
    }
  }
  return stops;
}

function toPreview(data: GenerateApiResponse): ItineraryPreview {
  return {
    region: data.region.toLowerCase(),
    travelDate: data.travelDate,
    duration: apiDurationToNights(data.duration),
    variants: data.variants.map((variant) => ({
      label: variant.label,
      travelMode: variant.travelMode,
      title: variant.title,
      stops: generateDaysToStops(variant.days),
      adjustments: variant.adjustments,
      metrics: variant.metrics,
    })),
    suggestions: data.suggestions.map((suggestion) => ({
      type: suggestion.type,
      message: suggestion.message,
      dayIndex: suggestion.dayIndex,
      contentId: suggestion.contentId,
      swapWithContentId: suggestion.swapWithContentId,
    })),
  };
}

export interface GenerateItineraryInput {
  mode?: GenerateMode; // 미지정 시 서버 기본값 STRICT
  startContentId?: string;
  travelModes?: TravelMode[]; // 미지정 시 서버 기본값 ["CAR"]
  // 일차별 하루 시작 시각("HH:mm"). 인덱스가 일차 순서(1일차 = [0])다. 원소가 null이거나
  // 배열이 일차 수보다 짧으면 그 일차는 서버 기본값(09:00)으로 시작한다.
  dayStartTimes?: (string | null)[];
}

function toGenerateBody(input: GenerateItineraryInput) {
  const body: {
    mode?: GenerateMode;
    startContentId?: string;
    travelModes?: TravelMode[];
    dayStartTimes?: (string | null)[];
  } = {};
  if (input.mode) body.mode = input.mode;
  if (input.startContentId) body.startContentId = input.startContentId;
  if (input.travelModes && input.travelModes.length > 0) body.travelModes = input.travelModes;
  if (input.dayStartTimes && input.dayStartTimes.length > 0) {
    body.dayStartTimes = input.dayStartTimes;
  }
  return body;
}

// AI 일정 생성은 로그인한 사용자만 호출 가능하다(백엔드가 비로그인 요청을 401로 거부함).
// 게스트는 services/generateItinerary.ts의 프론트 규칙 기반 생성기를 대신 사용한다.
// 백엔드가 장소마다 TourAPI 상세 정보를 순차 호출해 생성이 1~2분 걸릴 수 있으므로,
// apiClient의 기본 10초 타임아웃과 별도로 이 호출만 넉넉하게 잡는다.
const GENERATE_TIMEOUT_MS = 120_000;

// 백엔드는 이 요청의 region/travelDate/duration/구성 콘텐츠를 body로 받지 않고, 서버에 저장된
// 바구니(Basket)를 그대로 읽는다 — 그래서 호출 전에 반드시 syncBasketToServer로 바구니를
// 먼저 최신화해둬야 한다(호출부인 ItineraryResultScreen 참고).
export async function generateItineraryPreview(
  input: GenerateItineraryInput = {},
): Promise<ItineraryPreview> {
  const { data } = await apiClient.post<GenerateApiResponse>(
    '/itineraries/generate',
    toGenerateBody(input),
    { timeout: GENERATE_TIMEOUT_MS },
  );
  return toPreview(data);
}
