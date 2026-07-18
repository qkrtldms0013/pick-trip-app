import { Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { COLORS } from '../../constants/colors';
import type { Companion } from '../../types/companion';

interface CompanionCardProps {
  companion: Companion;
  selected: boolean;
  onPress: () => void;
}

const Card = styled(TouchableOpacity)<{ $selected: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 14px;
  border-radius: 14px;
  padding: 16px 18px;
  border-width: 1.5px;
  border-color: ${({ $selected }) => ($selected ? COLORS.amber500 : COLORS.gray200)};
  background-color: ${({ $selected }) => ($selected ? COLORS.amber50 : COLORS.white)};
`;

const EmojiBox = styled(View)<{ $selected: boolean }>`
  width: 46px;
  height: 46px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  background-color: ${({ $selected }) => ($selected ? COLORS.white : COLORS.gray50)};
`;

const EmojiText = styled(Text)`
  font-size: 24px;
`;

const TextColumn = styled(View)`
  flex: 1;
`;

const CardLabel = styled(Text)<{ $selected: boolean }>`
  font-size: 16px;
  font-weight: 600;
  color: ${({ $selected }) => ($selected ? COLORS.amber700 : COLORS.gray900)};
`;

const CardDescription = styled(Text)`
  font-size: 13px;
  color: ${COLORS.gray500};
  margin-top: 1px;
`;

const RadioCircle = styled(View)<{ $selected: boolean }>`
  width: 24px;
  height: 24px;
  border-radius: 100px;
  align-items: center;
  justify-content: center;
  border-width: ${({ $selected }) => ($selected ? '0px' : '2px')};
  border-color: ${COLORS.gray200};
  background-color: ${({ $selected }) => ($selected ? COLORS.amber500 : 'transparent')};
`;

const RadioCheck = styled(Text)`
  font-size: 13px;
  color: ${COLORS.white};
  font-weight: 700;
`;

export function CompanionCard({ companion, selected, onPress }: CompanionCardProps) {
  return (
    <Card $selected={selected} onPress={onPress} activeOpacity={0.8}>
      <EmojiBox $selected={selected}>
        <EmojiText>{companion.emoji}</EmojiText>
      </EmojiBox>
      <TextColumn>
        <CardLabel $selected={selected}>{companion.label}</CardLabel>
        <CardDescription>{companion.description}</CardDescription>
      </TextColumn>
      <RadioCircle $selected={selected}>{selected && <RadioCheck>✓</RadioCheck>}</RadioCircle>
    </Card>
  );
}
