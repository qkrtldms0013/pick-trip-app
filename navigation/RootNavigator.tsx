import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { createStackNavigator } from '@react-navigation/stack';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/colors';
import {
  PRIVACY_LAST_UPDATED,
  PRIVACY_POLICY,
  TERMS_LAST_UPDATED,
  TERMS_OF_SERVICE,
} from '../constants/legalDocuments';
import { FONT } from '../constants/typography';
import { useAppState } from '../contexts/AppStateContext';
import { useOpenSavedItinerary } from '../hooks/useOpenSavedItinerary';
import { AuthScreen } from '../screens/AuthScreen';
import { ContentDetailScreen } from '../screens/ContentDetailScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { ItineraryResultScreen } from '../screens/ItineraryResultScreen';
import { LegalDocumentScreen } from '../screens/LegalDocumentScreen';
import { PrioritySelectScreen } from '../screens/PrioritySelectScreen';
import { SavedItineraryScreen } from '../screens/SavedItineraryScreen';
import { SavedTripsScreen } from '../screens/SavedTripsScreen';
import { SharedItineraryScreen } from '../screens/SharedItineraryScreen';
import { SplashScreen } from '../screens/SplashScreen';
import type { RootStackParamList } from '../types/navigation';
import { toDateString } from '../utils/tripDate';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createStackNavigator<RootStackParamList>();

// react-navigation 기본 뒤로가기 아이콘 대신, 앱 전체(탭바·카드 화살표 등)에서 쓰는
// @expo/vector-icons(Ionicons)로 통일한다. canGoBack이 false면(스택의 첫 화면) 렌더링하지 않는다 —
// 기본 동작과 동일하게, 딥링크로 곧장 들어온 Shared 화면 등에서 눌러도 아무 동작 없는 버튼이 뜨는 걸 막는다.
function HeaderBackButton({
  canGoBack,
  onPress,
  tintColor,
}: {
  canGoBack?: boolean;
  onPress?: () => void;
  tintColor?: string;
}) {
  if (!canGoBack) return null;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ paddingLeft: 16, paddingRight: 12, paddingVertical: 8 }}
    >
      <Ionicons name="chevron-back" size={24} color={tintColor ?? COLORS.gray900} />
    </TouchableOpacity>
  );
}

// 스택 화면(뒤로가기가 필요한 Login/Priority/Itinerary/Shared)에 공통으로 쓰는 헤더 스타일.
// 그림자 대신 다른 카드 컴포넌트들과 통일된 gray200 밑줄 테두리를 쓴다.
const headerScreenOptions = {
  headerShown: true,
  headerStyle: {
    backgroundColor: COLORS.white,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerTintColor: COLORS.gray900,
  headerTitleStyle: { fontFamily: FONT.semibold, fontSize: 17 },
  headerTitleAlign: 'left' as const,
  headerBackTitleVisible: false,
  headerLeft: (props: { canGoBack?: boolean; onPress?: () => void; tintColor?: string }) => (
    <HeaderBackButton {...props} />
  ),
};

type Nav = StackNavigationProp<RootStackParamList>;

// 온보딩 단계 없이, 앱을 열면 바로 메인보드로 진입한다.
// 브랜드 스플래시가 너무 빨리 사라지면(로그인·바구니 복원이 순식간에 끝나는 경우)
// 깜빡였다 사라지는 것처럼 보인다. 실제 로딩이 더 빨라도 최소 이 시간만큼은 보여준다.
const MIN_SPLASH_MS = 3000;

function AuthGate() {
  const navigation = useNavigation<Nav>();
  const { isAuthLoading, isBasketLoading } = useAppState();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 진입 경로 결정 조건이 바뀔 때마다 재평가
  useEffect(() => {
    // 로그인·여행 조건 복원이 끝나기 전에 메인으로 보내면
    // 게스트 UI와 빈 취향 칩이 잠깐 보였다 바뀐다. 복원은 AppStateProvider가 한다.
    if (isAuthLoading || isBasketLoading || !minTimeElapsed) return;

    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }, [isAuthLoading, isBasketLoading, minTimeElapsed]);

  return <SplashScreen />;
}

function PriorityGate() {
  const navigation = useNavigation<Nav>();
  const {
    selectedIds,
    priorities,
    itemIdByContentId,
    updateItemPriority,
    selectedRegions,
    tripDate,
    setTripDate,
    setInitialStops,
    setInitialItineraryId,
    setInitialItineraryTitle,
  } = useAppState();

  return (
    <PrioritySelectScreen
      selectedIds={selectedIds}
      initialPriorities={priorities}
      selectedRegions={selectedRegions}
      tripDate={tripDate}
      onChangeDate={setTripDate}
      onContinue={async (newPriorities) => {
        await Promise.all(
          Object.entries(newPriorities).map(([contentId, priority]) => {
            const itemId = itemIdByContentId[contentId];
            return itemId ? updateItemPriority(itemId, priority) : Promise.resolve();
          }),
        );
        // 저장한 여행을 한 번이라도 열어봤으면 initialItineraryId/initialStops/initialItineraryTitle이
        // 그때 값으로 남아있다. 여기서 안 지우면 방금 새로 만든 일정을 저장할 때 그 값으로 폴백해서
        // (ItineraryResultScreen.handleSave 참고) 새 일정 대신 예전 일정을 덮어써버린다.
        setInitialStops(undefined);
        setInitialItineraryId(undefined);
        setInitialItineraryTitle(undefined);
        navigation.navigate('Itinerary');
      }}
    />
  );
}

function ItineraryGate() {
  const navigation = useNavigation<Nav>();
  const {
    selectedRegions,
    selectedIds,
    priorities,
    tripDate,
    companion,
    stylePrefs,
    initialStops,
    initialItineraryId,
    initialItineraryTitle,
    isGuest,
    recordSavedItinerary,
  } = useAppState();

  return (
    <ItineraryResultScreen
      selectedRegions={selectedRegions}
      selectedIds={selectedIds}
      priorities={priorities}
      travelDate={tripDate ? toDateString(tripDate.startDate) : null}
      duration={tripDate?.nights ?? null}
      companion={companion}
      stylePrefs={stylePrefs}
      initialStops={initialStops}
      initialItineraryId={initialItineraryId}
      initialItineraryTitle={initialItineraryTitle}
      isGuest={isGuest}
      onRequireLogin={() => navigation.navigate('Login')}
      onSaved={recordSavedItinerary}
      onGoHome={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
    />
  );
}

// "저장한 여행" 카드를 눌렀을 때 들어오는 화면. "일정 수정"은 이제 이 화면을 나가지 않고
// SavedItineraryScreen 안에서 바로 편집(장소 추가·삭제·순서 변경)하고 저장한다 — 예전처럼
// 일정 생성 완료 화면(ItineraryGate)으로 이동시키지 않는다. 저장에 성공하면 홈/마이페이지
// 목록도 같이 최신화되도록 recordSavedItinerary만 연결해준다.
function SavedItineraryGate({
  route,
}: {
  route: { params: RootStackParamList['SavedItinerary'] };
}) {
  const { recordSavedItinerary } = useAppState();
  return (
    <SavedItineraryScreen itineraryId={route.params.itineraryId} onSaved={recordSavedItinerary} />
  );
}

// 홈의 "저장한 여행 → 전체보기"로 들어오는 전체 목록 화면. 카드 눌렀을 때 동작(SavedItinerary로
// 이동/삭제 확인 모달)은 홈·마이페이지와 완전히 같아서 useOpenSavedItinerary를 그대로 쓴다.
function SavedTripsGate() {
  const { itineraryHistory, openingItineraryId, openItinerary, deleteItinerary, deleteModal } =
    useOpenSavedItinerary();
  return (
    <>
      <SavedTripsScreen
        itineraryHistory={itineraryHistory}
        openingItineraryId={openingItineraryId}
        onOpenItinerary={openItinerary}
        onDeleteItinerary={deleteItinerary}
      />
      {deleteModal}
    </>
  );
}

function LoginGate() {
  const navigation = useNavigation<Nav>();
  const { setIsGuest } = useAppState();

  // 로그인 화면은 상단이 코랄색 브랜드 배경으로 상태바 아래까지 꽉 차 있어서, 이 화면에
  // 있는 동안만 상태바 아이콘을 밝은색으로 바꾼다. 벗어나면 App.tsx의 기본값(dark)으로 되돌린다.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  return (
    <AuthScreen
      onAuthed={() => {
        setIsGuest(false);
        navigation.goBack();
      }}
      onOpenTerms={() => navigation.navigate('Terms')}
      onOpenPrivacy={() => navigation.navigate('Privacy')}
    />
  );
}

function FavoritesGate() {
  const navigation = useNavigation<Nav>();
  const { favoriteIds, handleToggleFavorite } = useAppState();
  return (
    <FavoritesScreen
      favoriteIds={favoriteIds}
      onToggleFavorite={handleToggleFavorite}
      onPressDetail={(contentId) => navigation.navigate('ContentDetail', { contentId })}
    />
  );
}

// 콘텐츠 카드에서 "상세 설명"을 눌렀을 때 들어오는 화면. 예전엔 팝업 시트(모달)였는데,
// 뒤로가기·헤더 없이 화면 위에 겹쳐 뜨는 방식이 다른 화면들과 이질감이 있어서 일반 스택
// 화면으로 바꿨다 — 뒤로가기는 네이티브 헤더가 대신 처리해준다.
function ContentDetailGate({ route }: { route: { params: RootStackParamList['ContentDetail'] } }) {
  const navigation = useNavigation<Nav>();
  const {
    favoriteIds,
    handleToggleFavorite,
    selectedIds,
    handleToggleContent,
    recordRecentlyViewed,
  } = useAppState();
  const { contentId } = route.params;

  return (
    <ContentDetailScreen
      contentId={contentId}
      favorite={favoriteIds.includes(contentId)}
      onToggleFavorite={handleToggleFavorite}
      inBasket={selectedIds.includes(contentId)}
      onToggleBasket={handleToggleContent}
      onTitleReady={(title) => {
        navigation.setOptions({ title });
        // 콘텐츠가 실제로 로드된 시점(제목이 확정된 시점)에만 "최근에 본"에 남긴다 —
        // 잘못된 id로 들어와 로딩에 실패한 경우까지 남기지 않기 위함.
        recordRecentlyViewed(contentId);
      }}
      onPressNearby={(nearbyContentId) =>
        navigation.push('ContentDetail', { contentId: nearbyContentId })
      }
    />
  );
}

function TermsGate() {
  return <LegalDocumentScreen sections={TERMS_OF_SERVICE} lastUpdated={TERMS_LAST_UPDATED} />;
}

function PrivacyGate() {
  return <LegalDocumentScreen sections={PRIVACY_POLICY} lastUpdated={PRIVACY_LAST_UPDATED} />;
}

function SharedGate({ route }: { route: { params: RootStackParamList['Shared'] } }) {
  const navigation = useNavigation<Nav>();
  return (
    <SharedItineraryScreen
      token={route.params.token}
      onTitleReady={(title) => navigation.setOptions({ title })}
    />
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={headerScreenOptions}>
      <Stack.Screen name="Auth" component={AuthGate} options={{ headerShown: false }} />
      <Stack.Screen
        name="Login"
        component={LoginGate}
        options={{
          title: '',
          // AuthScreen은 화면 상단을 코랄색 브랜드 배경으로 꽉 채우는 구조라, 다른 화면과
          // 같은 흰 헤더 바를 얹으면 이질감이 생긴다. 헤더를 투명하게 만들어 뒤로가기
          // 버튼이 브랜드 배경 위에 바로 떠 있도록 한다.
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 },
          headerTintColor: COLORS.white,
        }}
      />
      <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="Priority"
        component={PriorityGate}
        options={{ title: '우선순위를 정해주세요' }}
      />
      <Stack.Screen
        name="Itinerary"
        component={ItineraryGate}
        options={{ title: '일정이 완성됐어요' }}
      />
      <Stack.Screen
        name="SavedItinerary"
        component={SavedItineraryGate}
        options={{ title: '저장한 일정' }}
      />
      <Stack.Screen
        name="SavedTrips"
        component={SavedTripsGate}
        options={{ title: '저장한 여행' }}
      />
      <Stack.Screen name="Shared" component={SharedGate} options={{ title: '공유된 일정' }} />
      <Stack.Screen name="Favorites" component={FavoritesGate} options={{ title: '찜한 콘텐츠' }} />
      <Stack.Screen
        name="ContentDetail"
        component={ContentDetailGate}
        options={{ title: '콘텐츠 정보' }}
      />
      <Stack.Screen name="Terms" component={TermsGate} options={{ title: '이용약관' }} />
      <Stack.Screen
        name="Privacy"
        component={PrivacyGate}
        options={{ title: '개인정보처리방침' }}
      />
    </Stack.Navigator>
  );
}
