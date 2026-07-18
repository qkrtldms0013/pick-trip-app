import { Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { COLORS } from '../../constants/colors';
import { PRIORITY_LABELS, PRIORITY_ORDER, type Priority } from '../../types/priority';

interface PriorityChipsProps {
  value: Priority;
  onChange: (priority: Priority) => void;
}

const PRIORITY_ACTIVE_COLORS: Record<Priority, { bg: string; fg: string }> = {
  must: { bg: COLORS.amber500, fg: COLORS.white },
  good: { bg: COLORS.teal600, fg: COLORS.white },
  optional: { bg: COLORS.gray200, fg: COLORS.gray700 },
};

const Row = styled(View)`
  flex-direction: row;
  gap: 8px;
`;

const Chip = styled(TouchableOpacity)<{ $active: boolean; $priority: Priority }>`
  padding-vertical: 8px;
  padding-horizontal: 14px;
  border-radius: 20px;
  background-color: ${({ $active, $priority }) =>
    $active ? PRIORITY_ACTIVE_COLORS[$priority].bg : COLORS.gray100};
`;

const ChipLabel = styled(Text)<{ $active: boolean; $priority: Priority }>`
  font-size: 13px;
  font-weight: 500;
  color: ${({ $active, $priority }) =>
    $active ? PRIORITY_ACTIVE_COLORS[$priority].fg : COLORS.gray500};
`;

export function PriorityChips({ value, onChange }: PriorityChipsProps) {
  return (
    <Row>
      {PRIORITY_ORDER.map((priority) => (
        <Chip
          key={priority}
          $active={value === priority}
          $priority={priority}
          onPress={() => onChange(priority)}
          activeOpacity={0.8}
        >
          <ChipLabel $active={value === priority} $priority={priority}>
            {PRIORITY_LABELS[priority]}
          </ChipLabel>
        </Chip>
      ))}
    </Row>
  );
}
