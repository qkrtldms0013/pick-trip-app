import { Text, View } from 'react-native';
import styled from 'styled-components';
import { COLORS } from '../../constants/colors';
import { FONT } from '../../constants/typography';

// AI 일정 생성 플로우(담기 → 날짜 → 우선순위 → 완성) 전체에서 같은 모양으로 쓰는
// 4분할 진행 바. PrioritySelectScreen·ItineraryResultScreen이 이 컴포넌트를 같이 쓴다.
export const FLOW_STEPS = [
  { key: 'basket', label: '담기' },
  { key: 'date', label: '날짜' },
  { key: 'priority', label: '우선순위' },
  { key: 'done', label: '완성' },
] as const;

interface FlowStepBarProps {
  // 지금 이 화면이 어느 단계인지(FLOW_STEPS의 인덱스). 그보다 앞 단계는 완료로,
  // 뒤 단계는 미완료로 표시한다.
  activeIndex: number;
}

const Row = styled(View)`
  flex-direction: row;
  gap: 6px;
`;

const StepItem = styled(View)`
  flex: 1;
  gap: 7px;
`;

const StepBarFill = styled(View)<{ $variant: 'done' | 'active' | 'pending' }>`
  height: 3px;
  border-radius: 2px;
  background-color: ${({ $variant }) =>
    $variant === 'pending' ? COLORS.gray200 : COLORS.coral500};
`;

const StepBarLabel = styled(Text)<{ $variant: 'done' | 'active' | 'pending' }>`
  font-size: 11px;
  font-family: ${({ $variant }) => ($variant === 'active' ? FONT.bold : FONT.medium)};
  color: ${({ $variant }) =>
    $variant === 'pending'
      ? COLORS.gray400
      : $variant === 'active'
        ? COLORS.gray900
        : COLORS.gray500};
`;

export function FlowStepBar({ activeIndex }: FlowStepBarProps) {
  return (
    <Row>
      {FLOW_STEPS.map((step, index) => {
        const variant = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'pending';
        return (
          <StepItem key={step.key}>
            <StepBarFill $variant={variant} />
            <StepBarLabel $variant={variant}>{step.label}</StepBarLabel>
          </StepItem>
        );
      })}
    </Row>
  );
}
