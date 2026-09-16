import { applyContentImageOverride } from '../constants/contentImageOverrides';
import type { Content, ContentCategory } from '../types/content';
import type { NearbyContentItem, NearbyDistanceBasis } from '../types/nearbyContent';
import { apiClient } from './apiClient';

interface ContentSummaryResponse {
  contentId: string;
  title: string;
  contentTypeId: number;
  address: string;
  firstImage: string;
  latitude: number;
  longitude: number;
  category: string;
  summary: string | null;
  indoor: boolean;
  region: string;
}

interface ContentListResponse {
  totalCount: number;
  page: number;
  size: number;
  items: ContentSummaryResponse[];
}

// 탐색 화면 "더보기" 단위와 맞춘 페이지 크기. 너무 크면 첫 화면 로딩이 오래 걸린다.
const PAGE_SIZE = 20;

function toContent(item: ContentSummaryResponse): Content {
  return applyContentImageOverride({
    id: item.contentId,
    regionId: item.region.toLowerCase(),
    name: item.title,
    category: item.category.toLowerCase() as ContentCategory,
    summary: item.summary ?? '',
    address: item.address,
    imageUrl: item.firstImage || null,
    images: item.firstImage ? [item.firstImage] : [],
    indoor: item.indoor,
    latitude: item.latitude,
    longitude: item.longitude,
    // 목록 응답엔 운영시간 등 상세 정보가 없다 — 상세 조회에서만 채워진다.
    useTime: null,
    restDate: null,
    parking: null,
    stayDuration: null,
    reservationRequired: null,
  });
}

export interface ContentPage {
  items: Content[];
  hasMore: boolean;
}

async function fetchContentsPage(
  regionId: string,
  page: number,
): Promise<{ items: Content[]; totalCount: number }> {
  const { data } = await apiClient.get<ContentListResponse>('/contents', {
    params: { region: regionId.toUpperCase(), page, size: PAGE_SIZE },
  });
  return { items: data.items.map(toContent), totalCount: data.totalCount };
}

export async function fetchContents(regionIds: string[], page: number): Promise<ContentPage> {
  const results = await Promise.all(regionIds.map((regionId) => fetchContentsPage(regionId, page)));
  return {
    items: results.flatMap((r) => r.items),
    hasMore: results.some((r) => (page + 1) * PAGE_SIZE < r.totalCount),
  };
}

interface ContentDetailResponse {
  contentId: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  summary: string | null;
  category: string;
  indoor: boolean;
  region: string;
  images: { imageUrl: string; title: string }[];
  useTime: string | null;
  restDate: string | null;
  parking: string | null;
  stayDuration: string | null;
  reservationRequired: string | null;
}

function toContentFromDetail(item: ContentDetailResponse): Content {
  return applyContentImageOverride({
    id: item.contentId,
    regionId: item.region.toLowerCase(),
    name: item.title,
    category: item.category.toLowerCase() as ContentCategory,
    summary: item.summary ?? '',
    address: item.address,
    imageUrl: item.images[0]?.imageUrl ?? null,
    images: item.images.map((image) => image.imageUrl),
    indoor: item.indoor,
    latitude: item.latitude,
    longitude: item.longitude,
    useTime: item.useTime,
    restDate: item.restDate,
    parking: item.parking,
    stayDuration: item.stayDuration,
    reservationRequired: item.reservationRequired,
  });
}

export async function fetchContentDetail(contentId: string): Promise<Content> {
  const { data } = await apiClient.get<ContentDetailResponse>(`/contents/${contentId}`);
  return toContentFromDetail(data);
}

interface NearbyContentItemResponse {
  contentId: string;
  title: string;
  contentTypeId: string;
  address: string;
  firstImage: string;
  latitude: number;
  longitude: number;
  category: string;
  summary: string | null;
  region: string | null;
  distanceKm: number;
  durationMinutes: number | null;
  distanceBasis: NearbyDistanceBasis;
}

interface NearbyContentResponse {
  originContentId: string;
  radiusKm: number;
  source: 'LOCAL' | 'TOURAPI';
  items: NearbyContentItemResponse[];
}

function toNearbyContentItem(item: NearbyContentItemResponse): NearbyContentItem {
  // applyContentImageOverride는 Content 쪽 필드명(id/name)을 기준으로 동작해서,
  // NearbyContentItem의 contentId/title은 잠깐 그 모양으로 바꿔 넣었다 뺀다.
  const overridden = applyContentImageOverride({
    id: item.contentId,
    name: item.title,
    imageUrl: item.firstImage || null,
  });
  return {
    contentId: item.contentId,
    title: overridden.name,
    address: item.address,
    imageUrl: overridden.imageUrl,
    category: item.category.toLowerCase() as ContentCategory,
    summary: item.summary,
    region: item.region ? item.region.toLowerCase() : null,
    distanceKm: item.distanceKm,
    durationMinutes: item.durationMinutes,
    distanceBasis: item.distanceBasis,
  };
}

// 콘텐츠 상세의 "주변 콘텐츠" 추천용. 비로그인도 허용되는 API라 게스트 화면에서도 그대로 쓴다.
export async function fetchNearbyContents(
  contentId: string,
  options?: { radiusKm?: number; size?: number },
): Promise<NearbyContentItem[]> {
  const { data } = await apiClient.get<NearbyContentResponse>(`/contents/${contentId}/nearby`, {
    params: { radiusKm: options?.radiusKm, size: options?.size },
  });
  return data.items.map(toNearbyContentItem);
}
