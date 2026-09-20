import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useBasket } from '../hooks/useBasket';
import { toErrorMessage } from '../services/apiError';
import { promptLogin } from '../services/authPrompt';
import { logout } from '../services/authService';
import { hasStoredSession } from '../services/authStorage';
import { addFavorite, getFavoriteIds, removeFavorite } from '../services/favoriteApi';
import {
  hideItineraryId,
  loadHiddenItineraryIds,
  type SavedItinerarySummary,
} from '../services/itineraryHistoryStorage';
import { listItineraryPlans } from '../services/itineraryService';
import {
  cancelAllTripReminders,
  ensureNotificationPermission,
  scheduleTripReminder,
} from '../services/notifications';
import {
  loadRecentlyViewedIds,
  recordRecentlyViewed as recordRecentlyViewedStorage,
} from '../services/recentlyViewedStorage';
import { loadTripReminderEnabled, saveTripReminderEnabled } from '../services/tripReminderStorage';
import { withdrawAccount } from '../services/userService';
import type { CompanionType, StylePreference } from '../types/companion';
import type { Content } from '../types/content';
import type { GenerateMode, ItineraryStop, TravelMode } from '../types/itinerary';
import type { Priority } from '../types/priority';
import type { TripDate } from '../types/trip';
import { toDateString, toDurationType } from '../utils/tripDate';

export type { TripDate };

interface AppStateValue {
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
  isAuthLoading: boolean;
  selectedRegions: string[];
  setSelectedRegions: (value: string[]) => void;
  handleToggleRegion: (regionId: string) => void;
  handleSelectRegion: (regionId: string) => void;
  tripDate: TripDate | null;
  setTripDate: (value: TripDate | null) => void;
  companion: CompanionType | null;
  setCompanion: (value: CompanionType | null) => void;
  stylePrefs: StylePreference[];
  setStylePrefs: (value: StylePreference[]) => void;
  handleToggleStylePref: (pref: StylePreference) => void;
  // 일정 생성(POST /itineraries/generate)이 만들 이동수단별 안(variant) 목록. 바구니 조건과
  // 달리 서버에 동기화하지 않는 순수 요청 파라미터라 updateConditions에는 안 실어 보낸다.
  travelModes: TravelMode[];
  setTravelModes: (value: TravelMode[]) => void;
  handleToggleTravelMode: (mode: TravelMode) => void;
  // AI 일정 생성 모드. STRICT(기본) = 바구니에 담은 장소만으로 구성, AUGMENT = AI가 같은
  // 지역의 다른 콘텐츠를 추가 제안할 수 있음. PrioritySelectScreen의 토글로 켜고 끈다.
  generateMode: GenerateMode;
  handleToggleAugmentMode: (enabled: boolean) => void;
  // 시작 장소 고정(Phase 5). 바구니에 담은 장소 중 하나를 골라두면 그 장소부터 일정을
  // 시작한다. null이면 AI가 시작 장소도 알아서 정한다.
  startContentId: string | null;
  setStartContentId: (value: string | null) => void;
  // 일차별 하루 시작 시각("HH:mm"). 키는 일차 번호(1부터). 값이 없는 일차는 서버 기본값
  // (09:00)으로 시작한다. 바구니 항목이 아니라 생성 요청 파라미터라 travelModes와 같은
  // 자리에 둔다(세션 상태, 기기 저장 안 함).
  dayStartTimesByDay: Record<number, string>;
  setDayStartTimesByDay: (value: Record<number, string>) => void;
  itineraryHistory: SavedItinerarySummary[];
  recordSavedItinerary: (summary: SavedItinerarySummary) => void;
  removeSavedItinerary: (itineraryId: string) => void;
  favoriteIds: string[];
  handleToggleFavorite: (content: Content) => void;
  recentlyViewedIds: string[];
  recordRecentlyViewed: (contentId: string) => void;
  tripReminderEnabled: boolean;
  handleToggleTripReminder: (enabled: boolean) => void;
  initialStops: ItineraryStop[] | undefined;
  setInitialStops: (value: ItineraryStop[] | undefined) => void;
  initialItineraryId: string | undefined;
  setInitialItineraryId: (value: string | undefined) => void;
  // 저장된 일정을 "수정"으로 열었을 때 원래 이름. 저장 모달의 기본값으로 써서, 그냥 저장만
  // 다시 눌러도 제목이 "나만의 여행 일정"으로 바뀌어버리지 않게 한다.
  initialItineraryTitle: string | undefined;
  setInitialItineraryTitle: (value: string | undefined) => void;
  isBasketLoading: boolean;
  hasBasketItems: boolean;
  selectedIds: string[];
  priorities: Record<string, Priority>;
  // 사용자가 직접 지정한 희망 체류시간(분). 지정 안 했으면 null(콘텐츠 타입별 기본값을 따름).
  stayMinutesByContentId: Record<string, number | null>;
  itemIdByContentId: Record<string, string>;
  handleToggleContent: (content: Content) => Promise<void>;
  updateItemPriority: (itemId: string, priority: Priority) => Promise<void>;
  updateItemStayMinutes: (itemId: string, minutes: number) => Promise<void>;
  updateConditions: (input: {
    regionId: string | null;
    travelDate: string | null;
    duration: number | null;
    companion: CompanionType | null;
    stylePrefs: StylePreference[];
  }) => Promise<void>;
  resetSessionState: () => void;
  handleLogout: () => void;
  handleWithdraw: () => Promise<{ success: true } | { success: false; message: string }>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  // 온보딩 없이 메인보드로 바로 진입하므로, 별도 로그인 전까지는 게스트 상태로 시작한다.
  // 단 SecureStore에 토큰이 남아 있으면 아래 useEffect가 로그인 상태로 되돌린다.
  const [isGuest, setIsGuest] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [tripDate, setTripDate] = useState<TripDate | null>(null);
  const [companion, setCompanion] = useState<CompanionType | null>(null);
  const [stylePrefs, setStylePrefs] = useState<StylePreference[]>([]);
  const [travelModes, setTravelModes] = useState<TravelMode[]>(['CAR']);
  const [generateMode, setGenerateMode] = useState<GenerateMode>('STRICT');
  const [startContentId, setStartContentId] = useState<string | null>(null);
  const [dayStartTimesByDay, setDayStartTimesByDay] = useState<Record<number, string>>({});
  const [itineraryHistory, setItineraryHistory] = useState<SavedItinerarySummary[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [initialStops, setInitialStops] = useState<ItineraryStop[] | undefined>(undefined);
  const [initialItineraryId, setInitialItineraryId] = useState<string | undefined>(undefined);
  const [initialItineraryTitle, setInitialItineraryTitle] = useState<string | undefined>(undefined);

  // 앱을 다시 켰을 때 저장된 토큰으로 로그인 상태를 복원한다.
  // 이 확인이 끝나기 전에 화면을 그리면 게스트 UI가 잠깐 보였다 바뀌므로,
  // isAuthLoading을 진입 게이트(RootNavigator의 AuthGate)에서 기다린다.
  useEffect(() => {
    let cancelled = false;

    hasStoredSession()
      .then((restored) => {
        if (cancelled || !restored) return;
        setIsGuest(false);
      })
      .finally(() => {
        if (!cancelled) setIsAuthLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // "저장한 여행" 목록은 계정 기준 서버 API(GET /itineraries)에서 받아온다. 찜하기(favoriteIds)와
  // 같은 패턴: 로그인 여부가 확정되기 전엔 기다리고, 게스트는 서버에 저장한 게 있을 수 없으니
  // 빈 목록으로 둔다. 로그인하면 이 effect가 isGuest 변화를 감지해 다시 불러온다.
  // 단건 삭제 API는 아직 없어서, 로컬에 숨긴 id는 매번 이 목록에서 걸러낸다
  // (자세한 배경은 services/itineraryHistoryStorage.ts 참고).
  useEffect(() => {
    if (isAuthLoading) return;
    if (isGuest) {
      setItineraryHistory([]);
      return;
    }
    let cancelled = false;
    Promise.all([listItineraryPlans(), loadHiddenItineraryIds()])
      .then(([list, hiddenIds]) => {
        if (cancelled) return;
        const hidden = new Set(hiddenIds);
        setItineraryHistory(list.filter((item) => !hidden.has(item.itineraryId)));
      })
      .catch(() => {
        // 목록을 못 불러와도 조용히 빈 상태로 둔다 — 화면을 다시 열면 재시도된다.
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, isGuest]);

  // 방금 저장한 일정을 서버를 다시 조회하지 않고 목록 맨 앞에 바로 반영한다(낙관적 업데이트).
  const recordSavedItinerary = (summary: SavedItinerarySummary) => {
    setItineraryHistory((prev) => [
      summary,
      ...prev.filter((item) => item.itineraryId !== summary.itineraryId),
    ]);
  };

  const removeSavedItinerary = (itineraryId: string) => {
    setItineraryHistory((prev) => prev.filter((item) => item.itineraryId !== itineraryId));
    hideItineraryId(itineraryId);
  };

  // 여행 리마인더는 서버 없이 기기에 로컬로 예약하는 알림이라(services/notifications.ts 참고),
  // 켜짐 여부만 기기에 저장해두고 앱을 다시 켤 때 복원한다.
  const [tripReminderEnabled, setTripReminderEnabled] = useState(false);

  useEffect(() => {
    loadTripReminderEnabled().then(setTripReminderEnabled);
  }, []);

  // 켜져 있으면 저장한 여행이 바뀔 때마다(새로 저장/삭제) 예약을 최신 상태로 다시 맞춘다.
  // 꺼져 있으면 예약해뒀던 걸 전부 취소한다.
  useEffect(() => {
    if (!tripReminderEnabled) {
      cancelAllTripReminders();
      return;
    }
    for (const item of itineraryHistory) {
      scheduleTripReminder(item);
    }
  }, [tripReminderEnabled, itineraryHistory]);

  const handleToggleTripReminder = async (enabled: boolean) => {
    if (enabled) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        Alert.alert(
          '알림 권한이 필요해요',
          '기기 설정에서 PickTrip의 알림 권한을 허용한 뒤 다시 시도해주세요.',
        );
        return;
      }
    }
    setTripReminderEnabled(enabled);
    saveTripReminderEnabled(enabled);
  };

  // 찜하기는 로그인 계정 기준 서버 API다(로그인 상태가 결정되기 전엔 기다린다).
  // 게스트는 찜한 게 있을 수 없으므로 빈 목록으로 둔다 — 로그인하면 이 effect가
  // isGuest 변화를 감지해 서버에서 다시 불러온다.
  useEffect(() => {
    if (isAuthLoading) return;
    if (isGuest) {
      setFavoriteIds([]);
      return;
    }
    let cancelled = false;
    getFavoriteIds()
      .then((ids) => {
        if (!cancelled) setFavoriteIds(ids);
      })
      .catch(() => {
        // 목록을 못 불러와도 조용히 빈 상태로 둔다 — 화면을 다시 열면 재시도된다.
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, isGuest]);

  // "최근에 본"은 계정이 아니라 기기 기준 로컬 히스토리라(services/recentlyViewedStorage.ts
  // 참고), 로그인 여부와 상관없이 앱을 켤 때 한 번만 불러온다.
  useEffect(() => {
    loadRecentlyViewedIds().then(setRecentlyViewedIds);
  }, []);

  const recordRecentlyViewed = (contentId: string) => {
    setRecentlyViewedIds((prev) => [contentId, ...prev.filter((id) => id !== contentId)]);
    recordRecentlyViewedStorage(contentId);
  };

  const handleToggleFavorite = async (content: Content) => {
    if (isGuest) {
      promptLogin();
      return;
    }
    const wasFavorited = favoriteIds.includes(content.id);
    // 낙관적 업데이트: 서버 응답을 기다리지 않고 화면부터 반영하고, 실패하면 되돌린다.
    setFavoriteIds((prev) =>
      wasFavorited ? prev.filter((id) => id !== content.id) : [...prev, content.id],
    );
    try {
      if (wasFavorited) {
        await removeFavorite(content.id);
      } else {
        await addFavorite(content);
      }
    } catch (error) {
      setFavoriteIds((prev) =>
        wasFavorited ? [...prev, content.id] : prev.filter((id) => id !== content.id),
      );
      Alert.alert('찜하기 실패', toErrorMessage(error, '잠시 후 다시 시도해주세요.'));
    }
  };

  const {
    basket,
    isLoading: isBasketLoading,
    addItem,
    removeItem,
    clearItems,
    updateItemPriority,
    updateItemStayMinutes,
    updateConditions,
  } = useBasket();

  // 여행 조건(지역·날짜·동행·스타일)은 바구니와 같은 곳에 저장한다.
  // 바구니 로딩이 끝나면 1회만 화면 상태로 되돌린다.
  const hasRestoredConditions = useRef(false);

  useEffect(() => {
    if (isBasketLoading || !basket || hasRestoredConditions.current) return;
    hasRestoredConditions.current = true;

    const conditions = basket.conditions;
    if (conditions.region) setSelectedRegions([conditions.region]);
    setCompanion(conditions.companion);
    setStylePrefs(conditions.stylePrefs);
    if (conditions.travelDate) {
      // 저장된 날짜를 그대로 복원하면 며칠 뒤 다시 켰을 때 이미 지난 날짜가 보인다.
      // 여행 기간(박 수)만 이어받고, 시작일은 항상 오늘로 맞춘다.
      const nights = conditions.duration ?? 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setTripDate({
        startDate: today,
        durationType: toDurationType(nights),
        nights,
      });
    }
  }, [isBasketLoading, basket]);

  // 조건이 바뀌면 저장한다. 복원 전에 쓰면 초기 빈 값이 저장된 값을 덮어쓰므로
  // 복원이 끝난 뒤부터만 쓴다.
  useEffect(() => {
    if (!hasRestoredConditions.current) return;
    updateConditions({
      regionId: selectedRegions[0] ?? null,
      travelDate: tripDate ? toDateString(tripDate.startDate) : null,
      duration: tripDate?.nights ?? null,
      companion,
      stylePrefs,
    });
  }, [selectedRegions, tripDate, companion, stylePrefs, updateConditions]);

  const basketItems = basket?.items ?? [];
  const selectedIds = basketItems.map((item) => item.contentId);
  const priorities = Object.fromEntries(basketItems.map((item) => [item.contentId, item.priority]));
  // 옛 버전에서 저장된 로컬 바구니엔 이 필드가 아예 없을 수 있어(services/basketStorage.ts
  // 참고) ?? null로 방어한다.
  const stayMinutesByContentId = Object.fromEntries(
    basketItems.map((item) => [item.contentId, item.desiredStayMinutes ?? null]),
  );
  const itemIdByContentId = Object.fromEntries(
    basketItems.map((item) => [item.contentId, item.itemId]),
  );

  // 고정해둔 시작 장소가 바구니에서 빠지면(삭제/지역 변경으로 바구니 비움 등) 선택을 초기화한다.
  useEffect(() => {
    if (startContentId && !selectedIds.includes(startContentId)) {
      setStartContentId(null);
    }
  }, [selectedIds, startContentId]);

  const handleToggleContent = async (content: Content) => {
    try {
      const existingItemId = itemIdByContentId[content.id];
      if (existingItemId) {
        await removeItem(existingItemId);
      } else {
        await addItem(content, 'good');
      }
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : String(error);
      Alert.alert('바구니 처리 실패', message);
    }
  };

  // 복수 선택(체크박스 방식) 지역 토글 — 프로필의 "선호 지역"과 탐색 화면의 지역 칩이
  // 같은 selectedRegions를 공유하며 이 함수를 그대로 쓴다. 둘 중 어디서 바꾸든 FOR YOU
  // 추천·바구니가 같은 기준으로 맞춰진다.
  const handleToggleRegion = (regionId: string) => {
    const isSelecting = !selectedRegions.includes(regionId);
    // 담아둔 콘텐츠는 특정 지역에 속해있으므로, 새 지역을 고르면 이전 지역 것과 섞이지
    // 않도록 바구니를 비운다. 지역 해제(선택 취소)는 그냥 둔다.
    if (isSelecting && basketItems.length > 0) {
      clearItems();
    }
    setSelectedRegions((prev) =>
      isSelecting ? [...prev, regionId] : prev.filter((id) => id !== regionId),
    );
  };

  // 홈의 "어디부터 둘러볼까요?" 지역 카드는 프로필의 "선호 지역"(복수 선택 체크박스)과 달리
  // 한 번에 하나만 고르는 단일 선택이다 — 지역을 고르면 그 지역 하나로 선택을 통째로
  // 바꾸고(기존 다중 선택은 대체됨), 다른 지역 바구니 아이템과 섞이지 않도록 handleToggleRegion과
  // 같은 규칙으로 바구니를 비운다.
  const handleSelectRegion = (regionId: string) => {
    if (selectedRegions.includes(regionId)) return;
    if (basketItems.length > 0) {
      clearItems();
    }
    setSelectedRegions([regionId]);
  };

  const handleToggleStylePref = (pref: StylePreference) => {
    setStylePrefs((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref],
    );
  };

  const handleToggleTravelMode = (mode: TravelMode) => {
    setTravelModes((prev) => {
      if (!prev.includes(mode)) return [...prev, mode];
      // 최소 하나는 선택된 상태를 유지한다 — 다 해제하면 이동수단 없이 생성을 시도하게 된다.
      if (prev.length === 1) return prev;
      return prev.filter((m) => m !== mode);
    });
  };

  const handleToggleAugmentMode = (enabled: boolean) => {
    setGenerateMode(enabled ? 'AUGMENT' : 'STRICT');
  };

  const resetSessionState = () => {
    // 로그아웃/세션 만료 시 인증 관련 상태만 초기화한다.
    // 지역·날짜·동행 같은 여행 취향은 로그인 여부와 무관하게 메인보드에 남아있어야 하므로 건드리지 않는다.
    setIsGuest(true);
    setInitialStops(undefined);
    setInitialItineraryId(undefined);
    setInitialItineraryTitle(undefined);
  };

  const handleLogout = () => {
    logout();
    resetSessionState();
  };

  const handleWithdraw = async (): Promise<
    { success: true } | { success: false; message: string }
  > => {
    try {
      await withdrawAccount();
      resetSessionState();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: toErrorMessage(error, '탈퇴에 실패했어요. 잠시 후 다시 시도해주세요.'),
      };
    }
  };

  const value: AppStateValue = {
    isGuest,
    setIsGuest,
    isAuthLoading,
    selectedRegions,
    setSelectedRegions,
    handleToggleRegion,
    handleSelectRegion,
    tripDate,
    setTripDate,
    companion,
    setCompanion,
    stylePrefs,
    setStylePrefs,
    handleToggleStylePref,
    travelModes,
    setTravelModes,
    handleToggleTravelMode,
    generateMode,
    handleToggleAugmentMode,
    startContentId,
    setStartContentId,
    dayStartTimesByDay,
    setDayStartTimesByDay,
    itineraryHistory,
    recordSavedItinerary,
    removeSavedItinerary,
    favoriteIds,
    handleToggleFavorite,
    recentlyViewedIds,
    recordRecentlyViewed,
    tripReminderEnabled,
    handleToggleTripReminder,
    initialStops,
    setInitialStops,
    initialItineraryId,
    setInitialItineraryId,
    initialItineraryTitle,
    setInitialItineraryTitle,
    isBasketLoading,
    hasBasketItems: basketItems.length > 0,
    selectedIds,
    priorities,
    stayMinutesByContentId,
    itemIdByContentId,
    handleToggleContent,
    updateItemPriority,
    updateItemStayMinutes,
    updateConditions,
    resetSessionState,
    handleLogout,
    handleWithdraw,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}
