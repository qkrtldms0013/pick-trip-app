import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components';
import { ConfirmModal } from '../components/molecules/ConfirmModal';
import { TabBar } from '../components/molecules/TabBar';
import { COLORS } from '../constants/colors';
import { useAppState } from '../contexts/AppStateContext';
import { useOpenSavedItinerary } from '../hooks/useOpenSavedItinerary';
import { BasketContent } from '../screens/BasketContent';
import { ContentExploreScreen } from '../screens/ContentExploreScreen';
import { HomeContent } from '../screens/HomeContent';
import { ProfileContent } from '../screens/ProfileContent';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';
import { routeNameToTabKey, tabKeyToRouteName } from './tabRoutes';

const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

const Tab = createBottomTabNavigator<MainTabParamList>();

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { selectedIds } = useAppState();
  const activeRouteName = state.routes[state.index].name as keyof MainTabParamList;

  return (
    <TabBar
      active={routeNameToTabKey(activeRouteName)}
      onChange={(key) => navigation.navigate(tabKeyToRouteName(key))}
      basketCount={selectedIds.length}
    />
  );
}

function HomeTabScreen() {
  const {
    isGuest,
    selectedRegions,
    selectedIds,
    tripDate,
    handleChangeTripDate,
    favoriteIds,
    handleToggleFavorite,
    recentlyViewedIds,
    handleToggleContent,
    handleSelectRegion,
  } = useAppState();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList & MainTabParamList>>();
  const { itineraryHistory, openingItineraryId, openItinerary, deleteItinerary, deleteModal } =
    useOpenSavedItinerary();

  // 홈 탭은 상단이 코랄색으로 상태바 아래까지 꽉 차 있어서, 이 탭에 있는 동안만 상태바
  // 아이콘을 밝은색으로 바꾼다. 다른 탭으로 이동하면(blur) App.tsx의 기본값(dark)으로 되돌린다.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  return (
    <>
      <HomeContent
        isGuest={isGuest}
        selectedRegions={selectedRegions}
        selectedIds={selectedIds}
        tripDate={tripDate}
        itineraryHistory={itineraryHistory}
        openingItineraryId={openingItineraryId}
        onOpenItinerary={openItinerary}
        onDeleteItinerary={deleteItinerary}
        onOpenSavedTrips={() => navigation.navigate('SavedTrips')}
        onBrowse={() => navigation.navigate('Explore')}
        onOpenBasket={() => navigation.navigate('Basket')}
        onLogin={() => navigation.navigate('Login')}
        onSelectDate={handleChangeTripDate}
        favoriteIds={favoriteIds}
        onToggleFavorite={handleToggleFavorite}
        onOpenFavorites={() => navigation.navigate('Favorites')}
        onPressDetail={(contentId) => navigation.navigate('ContentDetail', { contentId })}
        onToggle={handleToggleContent}
        recentlyViewedIds={recentlyViewedIds}
        onSelectRegion={handleSelectRegion}
      />
      {deleteModal}
    </>
  );
}

function ExploreTabScreen() {
  const {
    selectedRegions,
    handleToggleRegion,
    selectedIds,
    handleToggleContent,
    favoriteIds,
    handleToggleFavorite,
  } = useAppState();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <ContentExploreScreen
      selectedRegions={selectedRegions}
      onToggleRegion={handleToggleRegion}
      selectedIds={selectedIds}
      onToggle={handleToggleContent}
      onContinue={() => navigation.navigate('Priority')}
      favoriteIds={favoriteIds}
      onToggleFavorite={handleToggleFavorite}
      onPressDetail={(contentId) => navigation.navigate('ContentDetail', { contentId })}
    />
  );
}

function BasketTabScreen() {
  const { selectedIds, tripDate, handleToggleContent, favoriteIds, handleToggleFavorite } =
    useAppState();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <BasketContent
      selectedIds={selectedIds}
      tripDate={tripDate}
      onToggle={handleToggleContent}
      onCreateItinerary={() => navigation.navigate('Priority')}
      favoriteIds={favoriteIds}
      onToggleFavorite={handleToggleFavorite}
      onPressDetail={(contentId) => navigation.navigate('ContentDetail', { contentId })}
    />
  );
}

// 탈퇴는 되돌릴 수 없는 동작이라 확인 모달을 한 번 더 거친다 — 실제로는 30일
// 유예 기간이 있지만(같은 계정으로 재로그인하면 자동 복구), 그 안내는 모달 문구로 대신한다.
function useWithdraw() {
  const { handleWithdraw } = useAppState();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [withdrawConfirmVisible, setWithdrawConfirmVisible] = useState(false);

  const confirmWithdraw = async () => {
    setWithdrawConfirmVisible(false);
    const result = await handleWithdraw();
    if (result.success) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } else {
      Alert.alert('탈퇴에 실패했어요', result.message);
    }
  };

  const withdrawModal = (
    <ConfirmModal
      visible={withdrawConfirmVisible}
      title="정말 탈퇴하시겠어요?"
      message="탈퇴 후 30일 안에 같은 계정으로 다시 로그인하면 자동으로 복구돼요. 그 기간이 지나면 계정과 모든 데이터가 완전히 삭제돼요."
      confirmLabel="탈퇴하기"
      destructive
      onConfirm={confirmWithdraw}
      onCancel={() => setWithdrawConfirmVisible(false)}
    />
  );

  return { requestWithdraw: () => setWithdrawConfirmVisible(true), withdrawModal };
}

function ProfileTabScreen() {
  const {
    isGuest,
    companion,
    stylePrefs,
    selectedRegions,
    setCompanion,
    handleToggleStylePref,
    handleToggleRegion,
    favoriteIds,
    handleToggleFavorite,
    handleLogout,
    tripReminderEnabled,
    handleToggleTripReminder,
  } = useAppState();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { itineraryHistory, openingItineraryId, openItinerary, deleteItinerary, deleteModal } =
    useOpenSavedItinerary();
  const { requestWithdraw, withdrawModal } = useWithdraw();

  return (
    <>
      <ProfileContent
        isGuest={isGuest}
        companion={companion}
        stylePrefs={stylePrefs}
        selectedRegions={selectedRegions}
        itineraryHistory={itineraryHistory}
        openingItineraryId={openingItineraryId}
        onOpenItinerary={openItinerary}
        onDeleteItinerary={deleteItinerary}
        onOpenSavedTrips={() => navigation.navigate('SavedTrips')}
        onChangeCompanion={setCompanion}
        onToggleStylePref={handleToggleStylePref}
        onToggleRegion={handleToggleRegion}
        favoriteIds={favoriteIds}
        onToggleFavorite={handleToggleFavorite}
        onOpenFavorites={() => navigation.navigate('Favorites')}
        onPressContent={(contentId) => navigation.navigate('ContentDetail', { contentId })}
        onLogin={() => navigation.navigate('Login')}
        onLogout={() => {
          handleLogout();
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        }}
        onWithdraw={requestWithdraw}
        tripReminderEnabled={tripReminderEnabled}
        onToggleTripReminder={handleToggleTripReminder}
        onOpenTerms={() => navigation.navigate('Terms')}
        onOpenPrivacy={() => navigation.navigate('Privacy')}
      />
      {deleteModal}
      {withdrawModal}
    </>
  );
}

export function MainTabNavigator() {
  return (
    <ScreenContainer>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home" component={HomeTabScreen} />
        <Tab.Screen name="Explore" component={ExploreTabScreen} />
        <Tab.Screen name="Basket" component={BasketTabScreen} />
        <Tab.Screen name="Profile" component={ProfileTabScreen} />
      </Tab.Navigator>
    </ScreenContainer>
  );
}
