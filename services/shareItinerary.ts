import { Share } from 'react-native';

export { buildShareText } from './shareItineraryText';

export async function shareItinerary(message: string): Promise<void> {
  try {
    await Share.share({ message });
  } catch {
    // 공유 시트 취소/드문 네이티브 오류 — 사용자에게 별도 알릴 필요 없음
  }
}
