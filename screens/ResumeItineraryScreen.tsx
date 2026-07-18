import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { COLORS } from '../constants/colors';

interface ResumeItineraryScreenProps {
  savedAt: string;
  onResume: () => void;
  onStartNew: () => void;
}

const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.gray50};
  padding-horizontal: 24px;
  justify-content: center;
`;

const IconBox = styled(View)`
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background-color: ${COLORS.amber50};
  align-items: center;
  justify-content: center;
  align-self: center;
  margin-bottom: 20px;
`;

const IconText = styled(Text)`
  font-size: 30px;
`;

const Title = styled(Text)`
  font-size: 22px;
  font-weight: 700;
  color: ${COLORS.gray900};
  letter-spacing: -0.3px;
  text-align: center;
`;

const Subtitle = styled(Text)`
  font-size: 14px;
  color: ${COLORS.gray500};
  margin-top: 8px;
  text-align: center;
`;

const ResumeButton = styled(TouchableOpacity)`
  background-color: ${COLORS.amber500};
  border-radius: 12px;
  padding-vertical: 14px;
  align-items: center;
  margin-top: 32px;
`;

const ResumeButtonLabel = styled(Text)`
  color: ${COLORS.white};
  font-size: 16px;
  font-weight: 500;
`;

const StartNewButton = styled(TouchableOpacity)`
  border-radius: 12px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  padding-vertical: 14px;
  align-items: center;
  margin-top: 12px;
`;

const StartNewButtonLabel = styled(Text)`
  color: ${COLORS.gray700};
  font-size: 16px;
  font-weight: 500;
`;

function formatSavedAt(savedAt: string): string {
  const date = new Date(savedAt);
  return `${date.getMonth() + 1}월 ${date.getDate()}일에 저장함`;
}

export function ResumeItineraryScreen({
  savedAt,
  onResume,
  onStartNew,
}: ResumeItineraryScreenProps) {
  return (
    <ScreenContainer>
      <View>
        <IconBox>
          <IconText>📅</IconText>
        </IconBox>
        <Title>저장된 일정이 있어요</Title>
        <Subtitle>{formatSavedAt(savedAt)}</Subtitle>
        <ResumeButton onPress={onResume} activeOpacity={0.8}>
          <ResumeButtonLabel>이어보기</ResumeButtonLabel>
        </ResumeButton>
        <StartNewButton onPress={onStartNew} activeOpacity={0.8}>
          <StartNewButtonLabel>새로 만들기</StartNewButtonLabel>
        </StartNewButton>
      </View>
    </ScreenContainer>
  );
}
