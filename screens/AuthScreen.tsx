import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { COLORS } from '../constants/colors';

export type AuthProvider = 'kakao' | 'google';

interface AuthScreenProps {
  onAuthed: (provider: AuthProvider) => void;
  onGuest: () => void;
}

const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.white};
`;

const BrandSection = styled(View)`
  padding: 48px 28px 40px;
  background-color: ${COLORS.amber600};
  overflow: hidden;
`;

const DecoCircle = styled(View)`
  position: absolute;
  top: -40px;
  right: -30px;
  width: 180px;
  height: 180px;
  border-radius: 100px;
  background-color: rgba(255, 255, 255, 0.12);
`;

const BrandRow = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
`;

const BrandIcon = styled(View)`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: rgba(255, 255, 255, 0.2);
  align-items: center;
  justify-content: center;
`;

const BrandIconText = styled(Text)`
  font-size: 20px;
`;

const BrandName = styled(Text)`
  font-size: 22px;
  font-weight: 700;
  color: ${COLORS.white};
`;

const HeroText = styled(Text)`
  font-size: 26px;
  font-weight: 700;
  color: ${COLORS.white};
  line-height: 34px;
  letter-spacing: -0.3px;
`;

const ButtonSection = styled(View)`
  flex: 1;
  padding: 32px 24px;
`;

const HelperText = styled(Text)`
  font-size: 15px;
  color: ${COLORS.gray500};
  margin-bottom: 20px;
`;

const KakaoButton = styled(TouchableOpacity)`
  width: 100%;
  height: 52px;
  border-radius: 12px;
  background-color: #fee500;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 12px;
`;

const GoogleButton = styled(TouchableOpacity)`
  width: 100%;
  height: 52px;
  border-radius: 12px;
  background-color: ${COLORS.white};
  border-width: 1px;
  border-color: ${COLORS.gray200};
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const ButtonEmoji = styled(Text)`
  font-size: 18px;
`;

const KakaoButtonLabel = styled(Text)`
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
`;

const GoogleButtonLabel = styled(Text)`
  font-size: 15px;
  font-weight: 600;
  color: ${COLORS.gray700};
`;

const TermsText = styled(Text)`
  font-size: 12px;
  color: ${COLORS.gray400};
  line-height: 20px;
  text-align: center;
  margin: 24px 0;
`;

const TermsHighlight = styled(Text)`
  color: ${COLORS.gray700};
  text-decoration-line: underline;
`;

const GuestButton = styled(TouchableOpacity)`
  margin-top: auto;
  padding: 12px;
`;

const GuestButtonLabel = styled(Text)`
  font-size: 14px;
  font-weight: 500;
  color: ${COLORS.gray500};
  text-align: center;
`;

export function AuthScreen({ onAuthed, onGuest }: AuthScreenProps) {
  return (
    <ScreenContainer>
      <BrandSection>
        <DecoCircle />
        <BrandRow>
          <BrandIcon>
            <BrandIconText>📍</BrandIconText>
          </BrandIcon>
          <BrandName>PickTrip</BrandName>
        </BrandRow>
        <HeroText>
          로그인하고{'\n'}나만의 AI 여행{'\n'}일정을 만들어보세요
        </HeroText>
      </BrandSection>

      <ButtonSection>
        <HelperText>소셜 계정으로 3초 만에 시작하세요.</HelperText>

        <KakaoButton onPress={() => onAuthed('kakao')} activeOpacity={0.85}>
          <ButtonEmoji>💬</ButtonEmoji>
          <KakaoButtonLabel>카카오로 시작하기</KakaoButtonLabel>
        </KakaoButton>

        <GoogleButton onPress={() => onAuthed('google')} activeOpacity={0.85}>
          <ButtonEmoji>🔍</ButtonEmoji>
          <GoogleButtonLabel>Google로 시작하기</GoogleButtonLabel>
        </GoogleButton>

        <TermsText>
          로그인 시 <TermsHighlight>이용약관</TermsHighlight> 및{' '}
          <TermsHighlight>개인정보 처리방침</TermsHighlight>에{'\n'}동의하게 됩니다.
        </TermsText>

        <GuestButton onPress={onGuest} activeOpacity={0.7}>
          <GuestButtonLabel>먼저 둘러보기 →</GuestButtonLabel>
        </GuestButton>
      </ButtonSection>
    </ScreenContainer>
  );
}
