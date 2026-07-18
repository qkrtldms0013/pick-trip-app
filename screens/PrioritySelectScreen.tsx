import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { PriorityChips } from '../components/molecules/PriorityChips';
import { CATEGORIES } from '../constants/categories';
import { COLORS } from '../constants/colors';
import { CONTENTS } from '../constants/contents';
import type { Priority } from '../types/priority';

interface PrioritySelectScreenProps {
  selectedIds: string[];
  onContinue: (priorities: Record<string, Priority>) => void;
}

const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

const Header = styled(View)`
  padding-top: 24px;
  padding-horizontal: 20px;
  padding-bottom: 12px;
`;

const Title = styled(Text)`
  font-size: 24px;
  font-weight: 500;
  color: ${COLORS.gray900};
`;

const Subtitle = styled(Text)`
  font-size: 15px;
  color: ${COLORS.gray500};
  margin-top: 6px;
`;

const BottomBar = styled(View)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding-top: 12px;
  padding-horizontal: 20px;
  padding-bottom: 28px;
  background-color: ${COLORS.white};
`;

const CTAButton = styled(TouchableOpacity)`
  background-color: ${COLORS.amber500};
  border-radius: 12px;
  padding-vertical: 14px;
  align-items: center;
`;

const CTALabel = styled(Text)`
  color: ${COLORS.white};
  font-size: 16px;
  font-weight: 500;
`;

const Card = styled(View)`
  background-color: ${COLORS.white};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  margin-horizontal: 20px;
  padding: 14px 16px;
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

const ThumbnailBox = styled(View)<{ $color: string }>`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background-color: ${({ $color }) => `${$color}33`};
  align-items: center;
  justify-content: center;
`;

const ThumbnailEmoji = styled(Text)`
  font-size: 22px;
`;

const InfoColumn = styled(View)`
  flex: 1;
  gap: 8px;
`;

const ContentName = styled(Text)`
  font-size: 15px;
  font-weight: 600;
  color: ${COLORS.gray900};
`;

export function PrioritySelectScreen({ selectedIds, onContinue }: PrioritySelectScreenProps) {
  const selectedContents = useMemo(
    () => CONTENTS.filter((c) => selectedIds.includes(c.id)),
    [selectedIds],
  );

  const [priorities, setPriorities] = useState<Record<string, Priority>>(() =>
    Object.fromEntries(selectedIds.map((id) => [id, 'good' as Priority])),
  );

  const handleChange = (id: string, priority: Priority) => {
    setPriorities((prev) => ({ ...prev, [id]: priority }));
  };

  return (
    <ScreenContainer>
      <Header>
        <Title>우선순위를 정해주세요</Title>
        <Subtitle>담은 콘텐츠별로 얼마나 가고 싶은지 알려주세요</Subtitle>
      </Header>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120, gap: 12 }}
      >
        {selectedContents.map((content) => {
          const category = CATEGORIES.find((c) => c.id === content.category);
          return (
            <Card key={content.id}>
              <ThumbnailBox $color={content.color}>
                <ThumbnailEmoji>{category?.emoji ?? '📍'}</ThumbnailEmoji>
              </ThumbnailBox>
              <InfoColumn>
                <ContentName>{content.name}</ContentName>
                <PriorityChips
                  value={priorities[content.id]}
                  onChange={(priority) => handleChange(content.id, priority)}
                />
              </InfoColumn>
            </Card>
          );
        })}
      </ScrollView>
      <BottomBar>
        <CTAButton onPress={() => onContinue(priorities)} activeOpacity={0.8}>
          <CTALabel>일정 만들기</CTALabel>
        </CTAButton>
      </BottomBar>
    </ScreenContainer>
  );
}
