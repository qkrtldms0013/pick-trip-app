import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, View } from 'react-native';
import styled from 'styled-components';
import { COLORS } from '../../constants/colors';
import { FONT } from '../../constants/typography';

export interface GeneratingStep {
  label: string;
  desc: string;
}

interface GeneratingProgressProps {
  steps: GeneratingStep[];
  // 하단 메타 행 좌측에 보여줄 컨텍스트 문구(예: "예천 · 5곳 · 9.19 - 9.21").
  metaText: string;
  stepIntervalMs?: number;
}

// 백엔드가 생성 진행 상황을 단계별 이벤트로 내려주지 않고 한 번의 요청/응답으로만
// 결과를 주기 때문에, 실제 단계 이벤트에 연결하는 대신 이 화면 자체의 타이머로
// 단계를 넘긴다. 마지막 단계에서 멈춘 채로 기다리게 해서(다음 단계로 넘어가지
// 않음) 실제 생성이 이보다 오래 걸려도 "다 끝난 것처럼 보이는데 안 끝나는" 상태가
// 되지 않게 한다. 호출부(ItineraryResultScreen)가 이 값을 기준으로 최소 로딩
// 시간을 잡아서, 응답이 이보다 빨리 와도 마지막 단계("마무리")까지는 보여준다.
// 디자인 레퍼런스의 데모 타이머 간격(1.6초)을 그대로 쓴다.
export const DEFAULT_STEP_INTERVAL_MS = 1600;

const Body = styled(View)`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding-horizontal: 28px;
`;

const RingWrap = styled(View)`
  width: 64px;
  height: 64px;
  align-items: center;
  justify-content: center;
`;

const RingTrack = styled(View)`
  position: absolute;
  width: 64px;
  height: 64px;
  border-radius: 32px;
  border-width: 3px;
  border-color: ${COLORS.coral50};
`;

const RingArc = styled(Animated.View)`
  position: absolute;
  width: 64px;
  height: 64px;
  border-radius: 32px;
  border-width: 3px;
  border-color: transparent;
  border-top-color: ${COLORS.coral500};
  border-right-color: ${COLORS.coral500};
`;

const Eyebrow = styled(Text)`
  font-size: 12px;
  font-family: ${FONT.bold};
  letter-spacing: 1px;
  color: ${COLORS.coral500};
  margin-top: 34px;
`;

const Title = styled(Text)`
  font-size: 27px;
  font-family: ${FONT.bold};
  letter-spacing: -0.8px;
  line-height: 36px;
  color: ${COLORS.gray900};
  text-align: center;
  margin-top: 12px;
`;

const Description = styled(Text)`
  font-size: 13.5px;
  font-family: ${FONT.regular};
  line-height: 21px;
  color: ${COLORS.gray500};
  text-align: center;
  margin-top: 11px;
`;

const TickRow = styled(View)`
  flex-direction: row;
  align-self: stretch;
  gap: 6px;
  margin-top: 34px;
`;

const TickTrack = styled(View)`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background-color: ${COLORS.gray100};
  overflow: hidden;
`;

const TickFill = styled(View)<{ $percent: number }>`
  width: ${({ $percent }) => `${$percent}%`};
  height: 100%;
  border-radius: 2px;
  background-color: ${COLORS.coral500};
`;

const MetaRow = styled(View)`
  flex-direction: row;
  align-self: stretch;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
`;

const MetaText = styled(Text)`
  font-size: 12px;
  font-family: ${FONT.regular};
  color: ${COLORS.gray500};
`;

const PercentText = styled(Text)`
  font-size: 12px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
`;

export function GeneratingProgress({
  steps,
  metaText,
  stepIntervalMs = DEFAULT_STEP_INTERVAL_MS,
}: GeneratingProgressProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, spin]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 마운트 시 1회만 단계 타이머 시작
  useEffect(() => {
    const timers = steps
      .slice(0, -1)
      .map((_, i) => setTimeout(() => setStepIndex(i + 1), stepIntervalMs * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const current = steps[stepIndex];
  const percent = Math.round((stepIndex / steps.length) * 100);

  return (
    <Body accessibilityLiveRegion="polite">
      <RingWrap accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <RingTrack />
        <RingArc style={!reduceMotion && { transform: [{ rotate }] }} />
      </RingWrap>
      <Eyebrow>GENERATING</Eyebrow>
      <Title>{current.label}</Title>
      <Description>{current.desc}</Description>
      <TickRow>
        {steps.map((step, index) => {
          const percentFilled = index < stepIndex ? 100 : index === stepIndex ? 62 : 0;
          return (
            <TickTrack key={step.label}>
              <TickFill $percent={percentFilled} />
            </TickTrack>
          );
        })}
      </TickRow>
      <MetaRow>
        <MetaText>{metaText}</MetaText>
        <PercentText>{percent}%</PercentText>
      </MetaRow>
    </Body>
  );
}
