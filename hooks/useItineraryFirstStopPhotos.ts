import { useQueries } from '@tanstack/react-query';
import { fetchContentDetail } from '../services/contentService';
import { getItineraryPlan } from '../services/itineraryService';
import type { ItineraryStop } from '../types/itinerary';

// 한 여행 카드의 사진을 찾으려고 앞에서부터 시도해볼 방문지 수. 첫 방문지가 사진 없는
// 콘텐츠(관광안내소·홍보관 등 TourAPI에 대표 사진이 없는 곳)일 때를 대비한 폴백이라,
// 몇 곳 정도만 봐도 충분하다 — 너무 크게 잡으면 카드 하나당 콘텐츠 상세 조회가 그만큼
// 늘어난다.
const MAX_PHOTO_CANDIDATES = 3;

function sortStops(stops: ItineraryStop[]): ItineraryStop[] {
  // day → startTime 순으로 한 번 더 정렬해 실제 방문 순서를 고른다 — daysToStops가
  // day별로는 이미 순서대로 내려주지만, 여러 날짜가 섞인 배열 전체 기준으로는
  // 일차 오름차순이 우선이어야 한다.
  return [...stops].sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));
}

// "저장한 여행" 카드의 대표 사진을 itineraryId별로 가져온다. 목록 API(GET /itineraries)는
// 제목·지역·날짜 같은 요약 정보만 주기 때문에, 카드마다 1) 일정 상세(앞쪽 방문지들의
// contentId)를 먼저 받아오고 2) 그 콘텐츠 상세(이미지)를 또 받아오는 2단계 조회가 필요하다.
// 맨 첫 방문지가 사진 없는 콘텐츠면 그다음 방문지 순으로 넘어가며 사진이 있는 곳을 찾는다
// (앞에서부터 MAX_PHOTO_CANDIDATES곳까지만). 카드 개수만큼 상세 조회가 늘어나는 비용이
// 있어서, 사진 외의 다른 정보(거리·경로 텍스트 등)는 일부러 이 훅에서 다루지 않는다.
export function useItineraryFirstStopPhotos(
  itineraryIds: string[],
): Record<string, string | null | undefined> {
  const planResults = useQueries({
    queries: itineraryIds.map((id) => ({
      queryKey: ['itinerary-first-stop', id],
      queryFn: () => getItineraryPlan(id),
    })),
  });

  const candidateContentIdsByItinerary: Record<string, string[]> = {};
  itineraryIds.forEach((id, index) => {
    const result = planResults[index];
    if (result?.isError) {
      // 원인을 남기지 않으면 이 카드만 사진이 안 뜨는 이유(권한 문제/삭제된 일정 등)를
      // 나중에 다시 알아내기 어렵다.
      console.warn('[useItineraryFirstStopPhotos] 일정 상세 조회 실패', {
        itineraryId: id,
        error: result.error,
      });
    }
    const sorted = sortStops(result?.data?.stops ?? []);
    candidateContentIdsByItinerary[id] = sorted
      .slice(0, MAX_PHOTO_CANDIDATES)
      .map((s) => s.contentId);
  });

  // 같은 콘텐츠가 여러 일정의 후보 방문지로 겹칠 수 있어 중복 조회를 피한다.
  const contentIds = Array.from(new Set(Object.values(candidateContentIdsByItinerary).flat()));

  const contentResults = useQueries({
    queries: contentIds.map((contentId) => ({
      queryKey: ['content-detail', contentId],
      queryFn: () => fetchContentDetail(contentId),
    })),
  });

  const imageUrlByContentId: Record<string, string | null | undefined> = {};
  const isLoadedContentId: Record<string, boolean> = {};
  contentIds.forEach((contentId, index) => {
    const result = contentResults[index];
    if (result?.isError) {
      console.warn('[useItineraryFirstStopPhotos] 콘텐츠 상세 조회 실패', {
        contentId,
        error: result.error,
      });
    }
    imageUrlByContentId[contentId] = result?.data?.imageUrl;
    // 성공/실패 어느 쪽이든 응답이 왔으면 "로딩 끝"으로 본다 — 실패했으면 이 후보는
    // 사진을 못 구한 걸로 치고 다음 후보로 넘어간다.
    isLoadedContentId[contentId] = result ? !result.isLoading : false;
  });

  const photoByItinerary: Record<string, string | null | undefined> = {};
  itineraryIds.forEach((id) => {
    const candidates = candidateContentIdsByItinerary[id] ?? [];
    // 앞쪽 방문지부터 순서대로 사진이 있는 콘텐츠를 찾는다. 아직 응답 안 온 후보를
    // 만나면(그 후보가 사진을 갖고 있을 수도 있으므로) 그 시점에서 "로딩 중"으로 멈춘다 —
    // 뒤 후보에 사진이 있다고 앞 후보 응답을 기다리지 않고 넘어가 버리면, 나중에 앞
    // 후보 사진이 도착했을 때 순서가 뒤바뀌어 보일 수 있다.
    let photo: string | null | undefined = null;
    for (const contentId of candidates) {
      const imageUrl = imageUrlByContentId[contentId];
      if (imageUrl) {
        photo = imageUrl;
        break;
      }
      if (!isLoadedContentId[contentId]) {
        photo = undefined;
        break;
      }
      // 로딩은 끝났는데 사진이 없는 후보 — 다음 후보를 계속 본다.
    }
    photoByItinerary[id] = photo;
  });

  return photoByItinerary;
}
