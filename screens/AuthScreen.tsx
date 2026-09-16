import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components';
import { COLORS } from '../constants/colors';
import { FONT } from '../constants/typography';
import { type AuthProvider, loginWithProvider } from '../services/authService';

export type { AuthProvider };

interface AuthScreenProps {
  onAuthed: () => void;
  onGuest?: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.white};
`;

// padding-top을 넉넉히 둬서, 투명 헤더 위에 떠 있는 뒤로가기 아이콘과 겹치거나
// 너무 붙어 보이지 않게 한다.
const BrandSection = styled(View)`
  padding: 80px 28px 40px;
  background-color: ${COLORS.coral500};
  overflow: hidden;
`;

const BrandRow = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
`;

const BrandIcon = styled(Image)`
  width: 40px;
  height: 40px;
  border-radius: 10px;
`;

const BrandName = styled(Text)`
  font-size: 22px;
  font-family: ${FONT.bold};
  color: ${COLORS.white};
`;

const HeroText = styled(Text)`
  font-size: 26px;
  font-family: ${FONT.bold};
  color: ${COLORS.white};
  line-height: 34px;
  letter-spacing: -0.3px;
`;

const HeroSubtitle = styled(Text)`
  margin-top: 12px;
  font-size: 14px;
  font-family: ${FONT.regular};
  color: rgba(255, 255, 255, 0.85);
  line-height: 21px;
`;

const ButtonSection = styled(View)`
  flex: 1;
  padding: 32px 24px;
`;

const HelperText = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 15px;
  color: ${COLORS.gray500};
  margin-bottom: 20px;
`;

// 카카오 공식 완성형 이미지는 심볼이 왼쪽에 붙어 있어 구글 버튼(중앙 정렬)과 나란히 두면
// 안 어울린다. 로그인 버튼 생성 도구엔 중앙 정렬 옵션이 없어서(공유하기 버튼 쪽에만 있음),
// 구글과 같은 방식으로 심볼만 공식 이미지에서 잘라 쓰고(assets/auth/kakao-symbol.png,
// 배경 제거해 추출) 배경·심볼색·문구는 디자인 가이드가 지정한 값대로 직접 구성한다.
// https://developers.kakao.com/docs/ko/kakaologin/design-guide
const KakaoButton = styled(TouchableOpacity)`
  width: 100%;
  height: 52px;
  border-radius: 12px;
  background-color: #fee500;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
`;

// 심볼은 순검정(#000000), 텍스트만 85% 불투명도 — 카카오 로그인 디자인 가이드 규정.
const KakaoButtonLabel = styled(Text)`
  font-size: 15px;
  font-family: ${FONT.semibold};
  color: rgba(0, 0, 0, 0.85);
`;

// 구글은 카카오와 달리 완성형 버튼을 언어별로 제공하지 않는다(다운로드 도구가 영어 텍스트만
// 구움). 그래서 공식 심볼만 잘라 쓰고(assets/auth/google-g-logo.png, 원본 배지에서 배경을
// 제거해 추출함), 문구·테두리·배경색은 브랜딩 가이드라인이 지정한 값대로 직접 구성한다.
// https://developers.google.com/identity/branding-guidelines
// 여백은 가이드라인이 명시한 값 그대로: 로고 앞 12px, 로고와 텍스트 사이 10px, 텍스트 뒤 12px.
// 모서리 radius는 가이드라인이 각짐/보통/완전 둥근 형태 중 선택 가능하도록 허용한 범위 안에서,
// 옆 카카오 버튼(12px)과 통일감을 맞춤.
const GoogleButton = styled(TouchableOpacity)`
  width: 100%;
  height: 52px;
  border-radius: 12px;
  background-color: ${COLORS.white};
  border-width: 1px;
  border-color: #747775;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding-left: 12px;
  padding-right: 12px;
  gap: 10px;
`;

// 서체는 가이드라인 그대로 Roboto Medium. 크기는 가이드라인 권장값(14/20)보다 살짝 키워서
// (15/21, 원래 비율 유지) 옆 카카오 버튼과 체감 크기를 맞췄다 — 금지 항목은 아니라 의도적 이탈.
const GoogleButtonLabel = styled(Text)`
  font-size: 15px;
  line-height: 21px;
  font-family: Roboto-Medium;
  color: #1f1f1f;
`;

const TermsText = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray400};
  line-height: 20px;
  text-align: center;
  margin: 24px 0;
`;

const TermsHighlight = styled(Text)`
  font-family: ${FONT.regular};
  color: ${COLORS.gray700};
  text-decoration-line: underline;
`;

const ErrorText = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 13px;
  color: ${COLORS.error};
  text-align: center;
  margin-bottom: 12px;
`;

const GuestButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: auto;
  padding: 12px;
`;

const GuestButtonLabel = styled(Text)`
  font-size: 14px;
  font-family: ${FONT.medium};
  color: ${COLORS.gray500};
  text-align: center;
`;

export function AuthScreen({ onAuthed, onGuest, onOpenTerms, onOpenPrivacy }: AuthScreenProps) {
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (provider: AuthProvider) => {
    setErrorMessage('');
    setLoadingProvider(provider);
    const result = await loginWithProvider(provider);
    setLoadingProvider(null);
    if (result.success) {
      onAuthed();
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <ScreenContainer>
      <BrandSection>
        <BrandRow>
          <BrandIcon source={require('../assets/icon.png')} resizeMode="contain" />
          <BrandName>PickTrip</BrandName>
        </BrandRow>
        <HeroText>고른 콘텐츠가{'\n'}일정이 됩니다</HeroText>
        <HeroSubtitle>
          담아둔 콘텐츠와 찜한 장소는 로그인하면 어디서든 이어볼 수 있어요.
        </HeroSubtitle>
      </BrandSection>

      <ButtonSection>
        <HelperText>소셜 계정으로 3초 만에 시작하세요.</HelperText>

        {errorMessage !== '' && <ErrorText>{errorMessage}</ErrorText>}

        <KakaoButton
          onPress={() => handleLogin('kakao')}
          activeOpacity={0.85}
          disabled={loadingProvider !== null}
        >
          {loadingProvider === 'kakao' ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <>
              <Image
                source={require('../assets/auth/kakao-symbol.png')}
                style={{ width: 18, height: 18 }}
                resizeMode="contain"
              />
              <KakaoButtonLabel>카카오 로그인</KakaoButtonLabel>
            </>
          )}
        </KakaoButton>

        <GoogleButton
          onPress={() => handleLogin('google')}
          activeOpacity={0.85}
          disabled={loadingProvider !== null}
        >
          {loadingProvider === 'google' ? (
            <ActivityIndicator color="#1F1F1F" />
          ) : (
            <>
              <Image
                source={require('../assets/auth/google-g-logo.png')}
                style={{ width: 18, height: 18 }}
                resizeMode="contain"
              />
              <GoogleButtonLabel>Google 계정으로 로그인</GoogleButtonLabel>
            </>
          )}
        </GoogleButton>

        <TermsText>
          로그인 시 <TermsHighlight onPress={onOpenTerms}>이용약관</TermsHighlight> 및{' '}
          <TermsHighlight onPress={onOpenPrivacy}>개인정보 처리방침</TermsHighlight>에{'\n'}동의하게
          됩니다.
        </TermsText>

        {onGuest && (
          <GuestButton onPress={onGuest} activeOpacity={0.7}>
            <GuestButtonLabel>먼저 둘러보기</GuestButtonLabel>
            <Ionicons name="arrow-forward" size={13} color={COLORS.gray500} />
          </GuestButton>
        )}
      </ButtonSection>
    </ScreenContainer>
  );
}
