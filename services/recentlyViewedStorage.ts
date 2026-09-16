import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'pick-trip:recently-viewed';

// 홈 화면 "최근에 본"엔 몇 개만 보여주지만, 같은 콘텐츠를 다시 봐서 맨 앞으로 올려도
// 화면을 채울 만큼 여유 있게 들고 있는다.
const MAX_ENTRIES = 20;

// "최근에 본"은 로그인 여부와 무관하게 이 기기에서 최근에 연 콘텐츠 순서만 기억한다
// (서버 API 없음 — pick-trip-server는 건드리지 않는다는 팀 규칙).
// 콘텐츠 정보(이름·사진·주소)는 저장하지 않고 id만 들고 있다가, 화면에서
// useContentsByIds로 최신 정보를 다시 받아온다. 상세 화면을 막 나온 직후라 대부분
// react-query 캐시에 그대로 남아있어 추가 네트워크 요청도 거의 없다.
export async function loadRecentlyViewedIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function recordRecentlyViewed(contentId: string): Promise<string[]> {
  const current = await loadRecentlyViewedIds();
  const next = [contentId, ...current.filter((id) => id !== contentId)].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
