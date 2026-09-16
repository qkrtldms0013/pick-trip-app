import { useState } from 'react';
import { Alert } from 'react-native';
import { toErrorMessage } from '../services/apiError';
import type { SavedItinerarySummary } from '../services/itineraryHistoryStorage';
import { shareItinerary } from '../services/shareItinerary';
import { createShareLink } from '../services/shareService';

// "저장한 여행" 카드의 공유 버튼 — 홈 미리보기(HomeContent)와 전체 목록 화면
// (SavedTripsScreen)이 똑같은 흐름을 쓰므로 훅으로 공통화한다. buildShareText처럼 전체
// 방문지 이름을 넣은 경로 텍스트는 만들지 않고 제목+링크만 공유한다 —
// hooks/useItineraryFirstStopPhotos.ts와 같은 이유로, 카드마다 전체 방문지의 콘텐츠 상세를
// 추가로 불러오는 비용을 들이지 않기 위해서다.
export function useItineraryShare() {
  const [sharingItineraryId, setSharingItineraryId] = useState<string | null>(null);

  const shareSavedItinerary = async (item: SavedItinerarySummary) => {
    setSharingItineraryId(item.itineraryId);
    try {
      const link = await createShareLink(item.itineraryId);
      await shareItinerary(`${item.title}\n\n일정 보기: ${link}`);
    } catch (error) {
      // 원인을 남기지 않으면 서버 응답인지 네트워크 문제인지 구분할 수 없다.
      console.warn('[itinerary] 저장한 여행 공유 링크 생성 실패', {
        itineraryId: item.itineraryId,
        error,
      });
      Alert.alert('공유 링크 생성 실패', toErrorMessage(error, '잠시 후 다시 시도해주세요.'));
    } finally {
      setSharingItineraryId(null);
    }
  };

  return { sharingItineraryId, shareSavedItinerary };
}
