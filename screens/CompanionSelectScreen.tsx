import { useState } from 'react';
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { CompanionCard } from '../components/molecules/CompanionCard';
import { COLORS } from '../constants/colors';
import { COMPANIONS, STYLE_OPTIONS } from '../constants/companions';
import type { CompanionType, StylePreference } from '../types/companion';

interface CompanionSelectScreenProps {
  onContinue: (companion: CompanionType, stylePrefs: StylePreference[]) => void;
}

const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

const Header = styled(View)`
  padding-top: 24px;
  padding-horizontal: 20px;
  padding-bottom: 8px;
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

const CompanionList = styled(View)`
  padding-horizontal: 20px;
  gap: 10px;
  margin-top: 8px;
`;

const StyleSection = styled(View)`
  margin-top: 32px;
  padding-horizontal: 20px;
`;

const StyleTitle = styled(Text)`
  font-size: 16px;
  font-weight: 600;
  color: ${COLORS.gray900};
`;

const StyleSubtitle = styled(Text)`
  font-size: 13px;
  color: ${COLORS.gray500};
  margin-top: 4px;
  margin-bottom: 14px;
`;

const ChipRow = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const StyleChip = styled(TouchableOpacity)<{ $active: boolean }>`
  padding-vertical: 10px;
  padding-horizontal: 16px;
  border-radius: 100px;
  border-width: 1.5px;
  background-color: ${({ $active }) => ($active ? COLORS.amber50 : COLORS.white)};
  border-color: ${({ $active }) => ($active ? COLORS.amber500 : COLORS.gray200)};
`;

const StyleChipLabel = styled(Text)<{ $active: boolean }>`
  font-size: 14px;
  font-weight: 500;
  color: ${({ $active }) => ($active ? COLORS.amber700 : COLORS.gray700)};
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

const CTAButton = styled(TouchableOpacity)<{ $disabled: boolean }>`
  background-color: ${({ $disabled }) => ($disabled ? COLORS.gray200 : COLORS.amber500)};
  border-radius: 12px;
  padding-vertical: 14px;
  align-items: center;
`;

const CTALabel = styled(Text)<{ $disabled: boolean }>`
  color: ${({ $disabled }) => ($disabled ? COLORS.gray400 : COLORS.white)};
  font-size: 16px;
  font-weight: 500;
`;

const HelperText = styled(Text)`
  font-size: 12px;
  color: ${COLORS.gray400};
  text-align: center;
  margin-top: 8px;
`;

export function CompanionSelectScreen({ onContinue }: CompanionSelectScreenProps) {
  const [companion, setCompanion] = useState<CompanionType | null>(null);
  const [stylePrefs, setStylePrefs] = useState<StylePreference[]>([]);

  const toggleStyle = (id: StylePreference) => {
    setStylePrefs((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const ready = companion !== null;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <Header>
          <Title>누구와 함께 가시나요?</Title>
          <Subtitle>취향에 딱 맞는 여행 콘텐츠를 골라서 보여드릴게요</Subtitle>
        </Header>
        <CompanionList>
          {COMPANIONS.map((item) => (
            <CompanionCard
              key={item.id}
              companion={item}
              selected={companion === item.id}
              onPress={() => setCompanion(item.id)}
            />
          ))}
        </CompanionList>

        <StyleSection>
          <StyleTitle>어떤 여행을 선호하세요?</StyleTitle>
          <StyleSubtitle>여러 개 골라도 좋아요 (선택 사항)</StyleSubtitle>
          <ChipRow>
            {STYLE_OPTIONS.map((option) => (
              <StyleChip
                key={option.id}
                $active={stylePrefs.includes(option.id)}
                onPress={() => toggleStyle(option.id)}
                activeOpacity={0.8}
              >
                <StyleChipLabel $active={stylePrefs.includes(option.id)}>
                  {option.label}
                </StyleChipLabel>
              </StyleChip>
            ))}
          </ChipRow>
        </StyleSection>
      </ScrollView>

      <BottomBar>
        <CTAButton
          $disabled={!ready}
          disabled={!ready}
          onPress={() => {
            if (companion) onContinue(companion, stylePrefs);
          }}
          activeOpacity={ready ? 0.8 : 1}
        >
          <CTALabel $disabled={!ready}>여행 준비 완료!</CTALabel>
        </CTAButton>
        {!ready && <HelperText>동행을 선택하면 시작할 수 있어요</HelperText>}
      </BottomBar>
    </ScreenContainer>
  );
}
