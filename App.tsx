import { NavigationContainer, type NavigationContainerRef } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { type RefObject, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ConfirmModal } from './components/molecules/ConfirmModal';
import { AppStateProvider, useAppState } from './contexts/AppStateContext';
import { RootNavigator } from './navigation/RootNavigator';
import { setOnSessionExpired } from './services/apiClient';
import { setOnRequireLogin } from './services/authPrompt';
import type { RootStackParamList } from './types/navigation';

const queryClient = new QueryClient();

const linking = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      // biome-ignore lint/style/useNamingConvention: react-navigation 화면 이름은 PascalCase 컨벤션을 따른다
      Shared: 'share/:token',
    },
  },
};

type NavRef = RefObject<NavigationContainerRef<RootStackParamList> | null>;

function SessionExpiryHandler({ navigationRef }: { navigationRef: NavRef }) {
  const { resetSessionState } = useAppState();

  // biome-ignore lint/correctness/useExhaustiveDependencies: 마운트 시 1회만 콜백 등록
  useEffect(() => {
    setOnSessionExpired(() => {
      Alert.alert('로그인이 만료됐어요', '다시 로그인해주세요.');
      resetSessionState();
      navigationRef.current?.reset({ index: 0, routes: [{ name: 'Auth' }] });
    });
  }, []);

  return null;
}

// AppStateContext(네비게이션에 직접 접근 못함)가 로그인이 필요한 동작(찜하기 등)을
// 게스트가 시도했을 때 로그인 화면으로 보내기 위한 등록. OS 기본 Alert 대신 앱 디자인이
// 적용된 ConfirmModal을 쓴다.
function RequireLoginHandler({ navigationRef }: { navigationRef: NavRef }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setOnRequireLogin(() => setVisible(true));
  }, []);

  return (
    <ConfirmModal
      visible={visible}
      title="로그인이 필요해요"
      message="찜하기는 로그인 후 이용할 수 있어요."
      confirmLabel="로그인"
      onConfirm={() => {
        setVisible(false);
        navigationRef.current?.navigate('Login');
      }}
      onCancel={() => setVisible(false)}
    />
  );
}

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* 기본값은 어두운 아이콘(대부분 화면이 흰/연회색 배경). 코랄색 배경을 화면 맨 위까지
          꽉 채우는 화면(홈 탭, 로그인)은 포커스될 때 스스로 밝은 아이콘으로 바꾸고, 벗어나면
          다시 이 기본값으로 되돌린다 — MainTabNavigator의 HomeTabScreen, RootNavigator의
          LoginGate 참고. */}
      <StatusBar style="dark" />
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppStateProvider>
            <SessionExpiryHandler navigationRef={navigationRef} />
            <RequireLoginHandler navigationRef={navigationRef} />
            <NavigationContainer ref={navigationRef} linking={linking}>
              <RootNavigator />
            </NavigationContainer>
          </AppStateProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
