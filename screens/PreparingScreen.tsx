import { SafeAreaView } from 'react-native';
import styled from 'styled-components';
import { ProgressChecklist } from '../components/molecules/ProgressChecklist';
import { COLORS } from '../constants/colors';

interface PreparingScreenProps {
  companionLabel: string;
  onDone: () => void;
}

const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: ${COLORS.gray50};
  padding: 24px;
`;

export function PreparingScreen({ companionLabel, onDone }: PreparingScreenProps) {
  return (
    <ScreenContainer>
      <ProgressChecklist
        icon="✨"
        heading="취향에 맞는 여행을 준비 중이에요"
        subText="잠시만 기다려 주세요"
        steps={[
          { label: '취향 분석', sub: `${companionLabel} 여행에 맞춰 설정` },
          { label: '콘텐츠 선별', sub: '어울리는 장소 골라내기' },
          { label: '지역 매칭', sub: '가까운 볼거리 연결' },
          { label: '목록 구성', sub: '추천 순서로 정렬' },
        ]}
        onDone={onDone}
      />
    </ScreenContainer>
  );
}
