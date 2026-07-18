import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import styled from 'styled-components';
import { COLORS } from '../../constants/colors';

export interface ProgressStep {
  label: string;
  sub: string;
}

interface ProgressChecklistProps {
  icon: string;
  heading: string;
  subText: string;
  steps: ProgressStep[];
  stepIntervalMs?: number;
  onDone: () => void;
}

const Container = styled(View)`
  align-items: center;
  justify-content: center;
  width: 100%;
`;

const SpinnerWrapper = styled(View)`
  width: 104px;
  height: 104px;
  margin-bottom: 24px;
  align-items: center;
  justify-content: center;
`;

const SpinnerRing = styled(Animated.View)`
  position: absolute;
  width: 104px;
  height: 104px;
  border-radius: 52px;
  border-width: 6px;
  border-color: ${COLORS.amber100};
  border-top-color: ${COLORS.amber500};
`;

const SpinnerEmoji = styled(Text)`
  font-size: 34px;
`;

const HeadingText = styled(Text)`
  font-size: 20px;
  font-weight: 700;
  color: ${COLORS.gray900};
  letter-spacing: -0.3px;
  margin-bottom: 6px;
  text-align: center;
`;

const SubText = styled(Text)`
  font-size: 14px;
  color: ${COLORS.gray500};
  margin-bottom: 22px;
  text-align: center;
`;

const ProgressTrack = styled(View)`
  width: 100%;
  max-width: 320px;
  height: 6px;
  border-radius: 100px;
  background-color: ${COLORS.gray200};
  overflow: hidden;
  margin-bottom: 20px;
`;

const ProgressFill = styled(View)<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => `${$percent}%`};
  border-radius: 100px;
  background-color: ${COLORS.amber500};
`;

const StepCard = styled(View)`
  width: 100%;
  max-width: 320px;
  background-color: ${COLORS.white};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  padding: 6px 16px;
`;

const StepRow = styled(View)<{ $last: boolean; $dimmed: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 11px 0;
  border-bottom-width: ${({ $last }) => ($last ? '0px' : '1px')};
  border-bottom-color: ${COLORS.gray100};
  opacity: ${({ $dimmed }) => ($dimmed ? 0.45 : 1)};
`;

const StepIconBox = styled(View)`
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
`;

const StepDoneCircle = styled(View)`
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: ${COLORS.teal600};
  align-items: center;
  justify-content: center;
`;

const StepDoneCheck = styled(Text)`
  font-size: 12px;
  color: ${COLORS.white};
  font-weight: 700;
`;

const StepPendingDot = styled(View)`
  width: 9px;
  height: 9px;
  border-radius: 5px;
  background-color: ${COLORS.gray300};
`;

const StepTextColumn = styled(View)`
  flex: 1;
`;

const StepLabel = styled(Text)<{ $active: boolean }>`
  font-size: 14px;
  font-weight: 500;
  color: ${({ $active }) => ($active ? COLORS.gray900 : COLORS.gray700)};
`;

const StepSub = styled(Text)`
  font-size: 11px;
  color: ${COLORS.gray400};
`;

const DEFAULT_STEP_INTERVAL_MS = 650;

export function ProgressChecklist({
  icon,
  heading,
  subText,
  steps,
  stepIntervalMs = DEFAULT_STEP_INTERVAL_MS,
  onDone,
}: ProgressChecklistProps) {
  const [done, setDone] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;

  // biome-ignore lint/correctness/useExhaustiveDependencies: 마운트 시 1회만 타이머/애니메이션 시작
  useEffect(() => {
    const timers = steps.map((_, i) => setTimeout(() => setDone(i + 1), stepIntervalMs * (i + 1)));
    timers.push(setTimeout(onDone, stepIntervalMs * steps.length + 700));

    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();

    return () => {
      timers.forEach(clearTimeout);
      loop.stop();
    };
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const pct = Math.round((done / steps.length) * 100);

  return (
    <Container>
      <SpinnerWrapper>
        <SpinnerRing style={{ transform: [{ rotate }] }} />
        <SpinnerEmoji>{icon}</SpinnerEmoji>
      </SpinnerWrapper>
      <HeadingText>{heading}</HeadingText>
      <SubText>{subText}</SubText>
      <ProgressTrack>
        <ProgressFill $percent={pct} />
      </ProgressTrack>
      <StepCard>
        {steps.map((step, i) => {
          const isDone = i < done;
          const isActive = i === done;
          return (
            <StepRow key={step.label} $last={i === steps.length - 1} $dimmed={!isDone && !isActive}>
              <StepIconBox>
                {isDone ? (
                  <StepDoneCircle>
                    <StepDoneCheck>✓</StepDoneCheck>
                  </StepDoneCircle>
                ) : (
                  <StepPendingDot />
                )}
              </StepIconBox>
              <StepTextColumn>
                <StepLabel $active={isActive}>{step.label}</StepLabel>
                <StepSub>{step.sub}</StepSub>
              </StepTextColumn>
            </StepRow>
          );
        })}
      </StepCard>
    </Container>
  );
}
