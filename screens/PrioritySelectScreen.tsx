import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components';
import { ConfirmModal } from '../components/molecules/ConfirmModal';
import { FlowStepBar } from '../components/molecules/FlowStepBar';
import { PriorityCardSkeleton } from '../components/molecules/PriorityCardSkeleton';
import { TripDatePickerModal } from '../components/molecules/TripDatePickerModal';
import { CATEGORIES } from '../constants/categories';
import { COLORS } from '../constants/colors';
import { REGIONS } from '../constants/regions';
import { FONT } from '../constants/typography';
import { useContentsByIds } from '../hooks/useContentsByIds';
import type { TravelMode } from '../types/itinerary';
import { PRIORITY_LABELS, PRIORITY_ORDER, type Priority } from '../types/priority';
import type { TripDate } from '../types/trip';
import { formatMinutesDuration } from '../utils/tripDate';

interface PrioritySelectScreenProps {
  selectedIds: string[];
  initialPriorities: Record<string, Priority>;
  // 사용자가 직접 지정한 희망 체류시간(분). null이면 콘텐츠 타입별 기본값을 그대로 쓴다.
  initialStayMinutes: Record<string, number | null>;
  selectedRegions: string[];
  tripDate: TripDate | null;
  onChangeDate: (value: TripDate) => void;
  travelModes: TravelMode[];
  onToggleTravelMode: (mode: TravelMode) => void;
  // AUGMENT 모드(AI가 바구니 밖 장소도 추가 제안) 노출 토글. 기본은 꺼짐(STRICT).
  isAugmentMode: boolean;
  onToggleAugmentMode: (enabled: boolean) => void;
  // 시작 장소 고정(Phase 5). 바구니에 담은 장소 중 하나를 고르면 AI가 그 장소부터 일정을 시작한다.
  startContentId: string | null;
  onSelectStartContent: (contentId: string | null) => void;
  // 일차별 하루 시작 시각("HH:mm"). 키는 일차 번호(1부터). 값이 없는 일차는 서버 기본값(09:00).
  initialDayStartTimes: Record<number, string>;
  onContinue: (
    priorities: Record<string, Priority>,
    stayMinutes: Record<string, number | null>,
    dayStartTimes: Record<number, string>,
  ) => void;
}

// 희망 체류시간 스테퍼 범위. 서버 검증(10~480분)과 맞춘다.
const STAY_MIN_MINUTES = 10;
const STAY_MAX_MINUTES = 480;
const STAY_STEP_MINUTES = 10;
// 아직 지정 안 한 곳에서 "직접 설정"을 처음 누르면 시작하는 값.
const STAY_DEFAULT_MINUTES = 60;

// 일차 시작 시각 스테퍼 범위. 서버 검증(05:00~18:00)과 맞춘다.
const DAY_START_MIN_MINUTES = 5 * 60;
const DAY_START_MAX_MINUTES = 18 * 60;
const DAY_START_STEP_MINUTES = 30;
const DAY_START_DEFAULT = '09:00';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const TRAVEL_MODE_OPTIONS: {
  id: TravelMode;
  label: string;
  icon: 'car-outline' | 'bus-outline';
}[] = [
  { id: 'CAR', label: '자동차', icon: 'car-outline' },
  { id: 'TRANSIT', label: '대중교통', icon: 'bus-outline' },
];

// 우선순위별 강조색. 카드 좌측 색 바 · 세그먼트 컨트롤 선택 상태 · 하단 범례 도트가
// 전부 이 한 맵을 같이 쓴다 — "시간 남으면"은 옅은 코랄 대신 중립 회색을 써서
// 흰 배경 위에서도 다른 상태와 뚜렷이 구분되게 한다(디자인 안 7a 기준).
const PRIORITY_COLORS: Record<Priority, { bg: string; fg: string }> = {
  must: { bg: COLORS.coral500, fg: COLORS.white },
  good: { bg: COLORS.coral100, fg: COLORS.coral700 },
  optional: { bg: COLORS.gray200, fg: COLORS.gray700 },
};

function formatDateRange(tripDate: TripDate | null): string | null {
  if (!tripDate) return null;
  const fmt = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;
  if (tripDate.nights <= 0) return fmt(tripDate.startDate);
  const end = new Date(tripDate.startDate);
  end.setDate(end.getDate() + tripDate.nights);
  return `${fmt(tripDate.startDate)} - ${fmt(end)}`;
}

// 이 화면은 네이티브 스택 헤더(RootNavigator의 headerScreenOptions)가 이미 위에 떠 있어서
// top 세이프에어리어를 또 적용하면 헤더와 본문 사이가 붕 떠 보인다.
const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

// 이 화면은 네이티브 스택 헤더(RootNavigator의 headerScreenOptions)가 이미 타이틀·뒤로가기를
// 그려준다. 그 아래에 별도 헤더를 또 만들지 않고, 단계 진행 바만 이 자리에 놓는다.
const Header = styled(View)`
  padding: 12px 20px 0;
`;

// 지역/날짜/담은 수 + 이동수단 + AI 추천을 한 카드로 묶고, 행 사이는 구분선으로만 나눈다.
const SettingsCard = styled(View)`
  background-color: ${COLORS.white};
  border-radius: 18px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  margin: 12px 20px 0;
  overflow: hidden;
`;

const SettingsRow = styled(View)`
  flex-direction: row;
  align-items: center;
  padding: 14px 16px;
  gap: 10px;
`;

const SettingsDivider = styled(View)`
  height: 1px;
  background-color: ${COLORS.gray100};
`;

const SummaryLeftGroup = styled(View)`
  flex: 1;
  min-width: 0;
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

const SummaryItem = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 5px;
`;

const SummaryText = styled(Text)`
  font-size: 13px;
  font-family: ${FONT.semibold};
  color: ${COLORS.gray900};
`;

const SummaryDivider = styled(View)`
  width: 1px;
  height: 12px;
  background-color: ${COLORS.gray200};
`;

const SummaryCountText = styled(Text)`
  font-size: 12px;
  font-family: ${FONT.bold};
  color: ${COLORS.coral500};
`;

const TravelModeLabel = styled(Text)`
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-family: ${FONT.medium};
  color: ${COLORS.gray700};
`;

const TravelModeChipGroup = styled(View)`
  flex-direction: row;
  gap: 8px;
`;

const TravelModeChip = styled(TouchableOpacity)<{ $active: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding-vertical: 8px;
  padding-horizontal: 14px;
  border-radius: 10px;
  border-width: 1px;
  background-color: ${({ $active }) => ($active ? COLORS.coral50 : COLORS.white)};
  border-color: ${({ $active }) => ($active ? COLORS.coral500 : COLORS.gray200)};
`;

const TravelModeChipLabel = styled(Text)<{ $active: boolean }>`
  font-size: 12px;
  font-family: ${FONT.bold};
  color: ${({ $active }) => ($active ? COLORS.coral700 : COLORS.gray700)};
`;

const AugmentTextColumn = styled(View)`
  flex: 1;
  min-width: 0;
  gap: 2px;
`;

const AugmentTitle = styled(Text)`
  font-size: 13px;
  font-family: ${FONT.medium};
  color: ${COLORS.gray900};
`;

const AugmentDescription = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 11px;
  line-height: 15px;
  color: ${COLORS.gray500};
`;

// 네이티브 Switch 대신 이 화면의 다른 토글(이동수단 칩)과 같은 필 형태 컴포넌트로 통일한다.
const AugmentToggleTrack = styled(TouchableOpacity)<{ $active: boolean }>`
  width: 48px;
  height: 28px;
  border-radius: 14px;
  padding: 3px;
  background-color: ${({ $active }) => ($active ? COLORS.coral500 : COLORS.gray200)};
  align-items: ${({ $active }) => ($active ? 'flex-end' : 'flex-start')};
  justify-content: center;
`;

const AugmentToggleThumb = styled(View)`
  width: 22px;
  height: 22px;
  border-radius: 100px;
  background-color: ${COLORS.white};
`;

const ListSectionHeader = styled(View)`
  margin: 18px 20px 4px;
  gap: 4px;
`;

const ListSectionTitleRow = styled(View)`
  flex-direction: row;
  align-items: baseline;
  gap: 6px;
`;

const ListSectionTitle = styled(Text)`
  font-size: 15px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
`;

const ListSectionCount = styled(Text)`
  font-size: 11px;
  font-family: ${FONT.regular};
  color: ${COLORS.gray500};
`;

const ListSectionDescription = styled(Text)`
  font-size: 11px;
  font-family: ${FONT.regular};
  color: ${COLORS.gray500};
`;

const DayStartSection = styled(View)`
  margin: 4px 20px 0;
  gap: 8px;
`;

const DayStartCard = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: ${COLORS.white};
  border-radius: 12px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  padding: 12px 14px;
`;

const DayStartLabel = styled(Text)`
  font-size: 13px;
  font-family: ${FONT.medium};
  color: ${COLORS.gray900};
`;

// 아직 지정 안 한 상태 — 서버 기본값을 보여주고, 누르면 커스터마이즈를 시작한다.
const DayStartDefaultButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

const DayStartDefaultLabel = styled(Text)`
  font-size: 12.5px;
  font-family: ${FONT.medium};
  color: ${COLORS.coral600};
`;

const DayStartStepper = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const DayStartStepButton = styled(TouchableOpacity)<{ $disabled: boolean }>`
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background-color: ${COLORS.gray50};
  opacity: ${({ $disabled }) => ($disabled ? 0.4 : 1)};
`;

const DayStartStepButtonLabel = styled(Text)`
  font-size: 14px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray700};
`;

const DayStartValueLabel = styled(Text)`
  font-size: 13px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
  min-width: 44px;
  text-align: center;
`;

// 하단 고정 바 위에 18px 페이드 스트립을 얹어, 스크롤되는 카드가 불투명 바 경계에서
// 뚝 끊기지 않고 배경색으로 자연스럽게 녹아들게 한다.
const BottomBarWrap = styled(View)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
`;

const FadeStrip = styled(LinearGradient)`
  height: 18px;
`;

const BottomBar = styled(View)`
  padding-horizontal: 20px;
  padding-bottom: 28px;
  background-color: ${COLORS.gray50};
`;

const LegendRow = styled(View)`
  flex-direction: row;
  justify-content: center;
  gap: 18px;
  margin-bottom: 12px;
`;

const LegendItem = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

// "시간 남으면"의 옅은 배경처럼 흰 배경에 거의 묻히는 색도 있어서, 테두리를 얇게 둘러
// 어떤 배경 위에서도 점이 보이게 한다.
const LegendDot = styled(View)<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 100px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  background-color: ${({ $color }) => $color};
`;

const LegendLabel = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 11.5px;
  color: ${COLORS.gray700};
`;

const CTAButton = styled(TouchableOpacity)`
  background-color: ${COLORS.coral500};
  border-radius: 15px;
  padding-vertical: 16px;
  align-items: center;
  shadow-color: ${COLORS.coral500};
  shadow-opacity: 0.26;
  shadow-radius: 20px;
  shadow-offset: 0px 8px;
  elevation: 6;
`;

const CTALabel = styled(Text)`
  color: ${COLORS.white};
  font-size: 15px;
  font-family: ${FONT.bold};
`;

const Card = styled(View)`
  flex-direction: row;
  background-color: ${COLORS.white};
  border-radius: 16px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  margin-horizontal: 20px;
  overflow: hidden;
`;

const CardColorBar = styled(View)<{ $color: string }>`
  width: 4px;
  background-color: ${({ $color }) => $color};
`;

const CardBody = styled(View)`
  flex: 1;
  padding: 14px 15px;
  gap: 10px;
`;

const CardTopRow = styled(View)`
  flex-direction: row;
  align-items: flex-start;
  gap: 10px;
`;

const NameColumn = styled(View)`
  flex: 1;
  min-width: 0;
`;

const ContentName = styled(Text)`
  font-size: 14.5px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
`;

const ContentMeta = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 11px;
  color: ${COLORS.gray500};
  margin-top: 2px;
`;

const StartButton = styled(TouchableOpacity)<{ $active: boolean }>`
  padding-vertical: 6px;
  padding-horizontal: 10px;
  border-radius: 8px;
  background-color: ${({ $active }) => ($active ? COLORS.coral50 : COLORS.gray50)};
`;

const StartButtonLabel = styled(Text)<{ $active: boolean }>`
  font-size: 11.5px;
  font-family: ${FONT.semibold};
  color: ${({ $active }) => ($active ? COLORS.coral600 : COLORS.gray500)};
`;

const SegmentTrack = styled(View)`
  flex-direction: row;
  background-color: ${COLORS.gray50};
  border-radius: 11px;
  padding: 3px;
  gap: 3px;
`;

const SegmentButton = styled(TouchableOpacity)<{ $active: boolean; $priority: Priority }>`
  flex: 1;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background-color: ${({ $active, $priority }) =>
    $active ? PRIORITY_COLORS[$priority].bg : 'transparent'};
`;

const SegmentButtonLabel = styled(Text)<{ $active: boolean; $priority: Priority }>`
  font-size: 11.5px;
  font-family: ${({ $active }) => ($active ? FONT.bold : FONT.medium)};
  color: ${({ $active, $priority }) => ($active ? PRIORITY_COLORS[$priority].fg : COLORS.gray500)};
`;

const StayRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const StayLabel = styled(Text)`
  font-size: 11.5px;
  font-family: ${FONT.medium};
  color: ${COLORS.gray500};
`;

// 아직 직접 지정 안 한 상태 — 콘텐츠 타입 기본값을 보여주고, 누르면 커스터마이즈를 시작한다.
const StayDefaultButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

const StayDefaultLabel = styled(Text)`
  font-size: 11.5px;
  font-family: ${FONT.medium};
  color: ${COLORS.coral600};
`;

// 한번 지정하면(서버 제약상) 되돌릴 방법이 없어 스테퍼만 제공한다 — types/basket.ts의
// BasketItem.desiredStayMinutes 주석 참고.
const StayStepper = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const StayStepButton = styled(TouchableOpacity)<{ $disabled: boolean }>`
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background-color: ${COLORS.gray50};
  opacity: ${({ $disabled }) => ($disabled ? 0.4 : 1)};
`;

const StayStepButtonLabel = styled(Text)`
  font-size: 14px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray700};
`;

const StayValueLabel = styled(Text)`
  font-size: 12.5px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
  min-width: 58px;
  text-align: center;
`;

export function PrioritySelectScreen({
  selectedIds,
  initialPriorities,
  initialStayMinutes,
  selectedRegions,
  tripDate,
  onChangeDate,
  travelModes,
  onToggleTravelMode,
  isAugmentMode,
  onToggleAugmentMode,
  startContentId,
  onSelectStartContent,
  initialDayStartTimes,
  onContinue,
}: PrioritySelectScreenProps) {
  const { contents: selectedContents, isLoading } = useContentsByIds(selectedIds);
  const [showDatePicker, setShowDatePicker] = useState(false);
  // CTA를 눌렀는데 날짜가 없을 때 뜨는 안내. 날짜 선택 시트와 동시에 띄우지 않고,
  // 이 안내를 닫아야(확인을 눌러야) 그 다음 시트가 열리도록 순서를 분리한다.
  const [showDateRequiredModal, setShowDateRequiredModal] = useState(false);

  const [priorities, setPriorities] = useState<Record<string, Priority>>(() =>
    Object.fromEntries(selectedIds.map((id) => [id, initialPriorities[id] ?? 'good'])),
  );
  const [stayMinutes, setStayMinutes] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(selectedIds.map((id) => [id, initialStayMinutes[id] ?? null])),
  );
  const [dayStartTimes, setDayStartTimes] = useState<Record<number, string>>(initialDayStartTimes);

  const handleChange = (id: string, priority: Priority) => {
    setPriorities((prev) => ({ ...prev, [id]: priority }));
  };

  // 처음 커스터마이즈를 시작할 때는 기본값(STAY_DEFAULT_MINUTES)에서 시작하고,
  // 이후엔 스테퍼로 10분 단위 조정만 한다 — 되돌리기는 서버 제약상 지원하지 않는다.
  const handleAdjustStay = (id: string, delta: number) => {
    setStayMinutes((prev) => {
      const current = prev[id];
      const base = current ?? STAY_DEFAULT_MINUTES;
      const next = Math.min(STAY_MAX_MINUTES, Math.max(STAY_MIN_MINUTES, base + delta));
      return { ...prev, [id]: next };
    });
  };

  // 30분 단위로 조정한다. 05:00~18:00 범위(서버 검증)를 벗어나지 않게 자른다.
  const handleAdjustDayStart = (day: number, delta: number) => {
    setDayStartTimes((prev) => {
      const current = prev[day];
      const base = current ? timeToMinutes(current) : timeToMinutes(DAY_START_DEFAULT);
      const next = Math.min(DAY_START_MAX_MINUTES, Math.max(DAY_START_MIN_MINUTES, base + delta));
      return { ...prev, [day]: minutesToTime(next) };
    });
  };

  const totalTripDays = tripDate ? tripDate.nights + 1 : 1;

  const regionNames = REGIONS.filter((r) => selectedRegions.includes(r.id))
    .map((r) => r.name)
    .join(', ');
  const dateRange = formatDateRange(tripDate);
  const priorityCounts = PRIORITY_ORDER.reduce<Record<Priority, number>>(
    (acc, priority) => {
      acc[priority] = Object.values(priorities).filter((p) => p === priority).length;
      return acc;
    },
    { must: 0, good: 0, optional: 0 },
  );

  return (
    <ScreenContainer edges={['bottom', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <Header>
          <FlowStepBar activeIndex={2} />
        </Header>

        <SettingsCard>
          {/* 예전엔 이 행 전체가 regionNames가 있을 때만 떠서, 지역 정보 없이 이 화면에
            들어온 경우 날짜를 고를 곳도 고른 날짜를 확인할 곳도 없었다. 지역 표시만
            조건부로 두고, 날짜는 지역 유무와 무관하게 항상 뜨도록 분리한다. */}
          <SettingsRow>
            <SummaryLeftGroup>
              {regionNames !== '' && (
                <>
                  <SummaryItem>
                    <Ionicons name="location-outline" size={13} color={COLORS.gray900} />
                    <SummaryText>{regionNames}</SummaryText>
                  </SummaryItem>
                  <SummaryDivider />
                </>
              )}
              {/* 날짜가 없어도 항상 탭 가능하게 해서, 탐색 화면에서 날짜 없이 바로 넘어온
                경우에도 이 화면에서 날짜를 고를 방법이 있게 한다. */}
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8 }}
              >
                <SummaryItem>
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={dateRange ? COLORS.gray900 : COLORS.coral500}
                  />
                  <SummaryText style={!dateRange && { color: COLORS.coral700 }}>
                    {dateRange ?? '날짜를 선택해주세요'}
                  </SummaryText>
                  <Ionicons name="chevron-down-outline" size={12} color={COLORS.gray400} />
                </SummaryItem>
              </TouchableOpacity>
            </SummaryLeftGroup>
            <SummaryCountText>{selectedIds.length}곳 담음</SummaryCountText>
          </SettingsRow>

          <SettingsDivider />

          <SettingsRow>
            <TravelModeLabel numberOfLines={1}>이동 수단</TravelModeLabel>
            <TravelModeChipGroup>
              {TRAVEL_MODE_OPTIONS.map((option) => {
                const active = travelModes.includes(option.id);
                return (
                  <TravelModeChip
                    key={option.id}
                    $active={active}
                    onPress={() => onToggleTravelMode(option.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={option.icon}
                      size={14}
                      color={active ? COLORS.coral600 : COLORS.gray500}
                    />
                    <TravelModeChipLabel $active={active} numberOfLines={1}>
                      {option.label}
                    </TravelModeChipLabel>
                  </TravelModeChip>
                );
              })}
            </TravelModeChipGroup>
          </SettingsRow>

          <SettingsDivider />

          <SettingsRow>
            <AugmentTextColumn>
              <AugmentTitle>AI가 새로운 장소도 추천하게 할까요?</AugmentTitle>
              <AugmentDescription>담지 않은 근처 장소를 일정에 더해요</AugmentDescription>
            </AugmentTextColumn>
            <AugmentToggleTrack
              $active={isAugmentMode}
              onPress={() => onToggleAugmentMode(!isAugmentMode)}
              activeOpacity={0.8}
              accessibilityRole="switch"
              accessibilityState={{ checked: isAugmentMode }}
            >
              <AugmentToggleThumb />
            </AugmentToggleTrack>
          </SettingsRow>
        </SettingsCard>

        <ListSectionHeader>
          <ListSectionTitleRow>
            <ListSectionTitle>일차별 시작 시각</ListSectionTitle>
          </ListSectionTitleRow>
          <ListSectionDescription>
            숙소 체크아웃·도착 시각이 다르면 일차마다 다르게 정할 수 있어요
          </ListSectionDescription>
        </ListSectionHeader>
        <DayStartSection>
          {Array.from({ length: totalTripDays }, (_, i) => i + 1).map((day) => {
            const value = dayStartTimes[day] ?? null;
            return (
              <DayStartCard key={day}>
                <DayStartLabel>{day}일차 시작</DayStartLabel>
                {value == null ? (
                  <DayStartDefaultButton
                    onPress={() => handleAdjustDayStart(day, 0)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <DayStartDefaultLabel>기본 {DAY_START_DEFAULT}</DayStartDefaultLabel>
                    <Ionicons name="pencil-outline" size={11} color={COLORS.coral600} />
                  </DayStartDefaultButton>
                ) : (
                  <DayStartStepper>
                    <DayStartStepButton
                      $disabled={timeToMinutes(value) <= DAY_START_MIN_MINUTES}
                      disabled={timeToMinutes(value) <= DAY_START_MIN_MINUTES}
                      onPress={() => handleAdjustDayStart(day, -DAY_START_STEP_MINUTES)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <DayStartStepButtonLabel>−</DayStartStepButtonLabel>
                    </DayStartStepButton>
                    <DayStartValueLabel>{value}</DayStartValueLabel>
                    <DayStartStepButton
                      $disabled={timeToMinutes(value) >= DAY_START_MAX_MINUTES}
                      disabled={timeToMinutes(value) >= DAY_START_MAX_MINUTES}
                      onPress={() => handleAdjustDayStart(day, DAY_START_STEP_MINUTES)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <DayStartStepButtonLabel>＋</DayStartStepButtonLabel>
                    </DayStartStepButton>
                  </DayStartStepper>
                )}
              </DayStartCard>
            );
          })}
        </DayStartSection>

        <ListSectionHeader>
          <ListSectionTitleRow>
            <ListSectionTitle>장소별 우선순위</ListSectionTitle>
            <ListSectionCount>{selectedIds.length}곳</ListSectionCount>
          </ListSectionTitleRow>
          <ListSectionDescription>
            우선순위에 따라 AI가 일정 순서를 조율해줘요
          </ListSectionDescription>
        </ListSectionHeader>

        {isLoading ? (
          <View style={{ paddingTop: 4, gap: 10 }}>
            {Array.from({ length: Math.min(selectedIds.length, 6) || 1 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 로딩 중 고정 개수의 자리표시자라 인덱스 키로 충분
              <PriorityCardSkeleton key={i} />
            ))}
          </View>
        ) : (
          <View style={{ paddingTop: 4, gap: 10 }}>
            {selectedContents.map((content) => {
              const category = CATEGORIES.find((c) => c.id === content.category);
              // priorities는 마운트 시점 selectedIds 스냅샷으로 한 번만 초기화된다(초기
              // useState). 화면이 열린 채로 바구니에 새 항목이 추가되거나, 뺐다가 다시
              // 담은 콘텐츠의 캐시된 상세가 나중에 도착하면 이 id가 아직 키에 없을 수
              // 있다 — 기본값 'good'으로 방어한다.
              const priority = priorities[content.id] ?? 'good';
              const isStart = startContentId === content.id;
              const stay = stayMinutes[content.id] ?? null;
              return (
                <Card key={content.id}>
                  <CardColorBar $color={PRIORITY_COLORS[priority].bg} />
                  <CardBody>
                    <CardTopRow>
                      <NameColumn>
                        <ContentName numberOfLines={1}>{content.name}</ContentName>
                        <ContentMeta numberOfLines={1}>
                          {category?.label ?? content.category} · {content.address}
                        </ContentMeta>
                      </NameColumn>
                      <StartButton
                        $active={isStart}
                        onPress={() => onSelectStartContent(isStart ? null : content.id)}
                        activeOpacity={0.8}
                      >
                        <StartButtonLabel $active={isStart}>시작</StartButtonLabel>
                      </StartButton>
                    </CardTopRow>
                    <SegmentTrack>
                      {PRIORITY_ORDER.map((option) => {
                        const active = priority === option;
                        return (
                          <SegmentButton
                            key={option}
                            $active={active}
                            $priority={option}
                            onPress={() => handleChange(content.id, option)}
                            activeOpacity={0.8}
                          >
                            <SegmentButtonLabel $active={active} $priority={option}>
                              {PRIORITY_LABELS[option]}
                            </SegmentButtonLabel>
                          </SegmentButton>
                        );
                      })}
                    </SegmentTrack>
                    <StayRow>
                      <StayLabel>체류시간</StayLabel>
                      {stay == null ? (
                        <StayDefaultButton
                          onPress={() => handleAdjustStay(content.id, 0)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <StayDefaultLabel>
                            {content.stayDuration
                              ? `기본 ${content.stayDuration}`
                              : '기본 체류시간'}
                          </StayDefaultLabel>
                          <Ionicons name="pencil-outline" size={11} color={COLORS.coral600} />
                        </StayDefaultButton>
                      ) : (
                        <StayStepper>
                          <StayStepButton
                            $disabled={stay <= STAY_MIN_MINUTES}
                            disabled={stay <= STAY_MIN_MINUTES}
                            onPress={() => handleAdjustStay(content.id, -STAY_STEP_MINUTES)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <StayStepButtonLabel>−</StayStepButtonLabel>
                          </StayStepButton>
                          <StayValueLabel>{formatMinutesDuration(stay)}</StayValueLabel>
                          <StayStepButton
                            $disabled={stay >= STAY_MAX_MINUTES}
                            disabled={stay >= STAY_MAX_MINUTES}
                            onPress={() => handleAdjustStay(content.id, STAY_STEP_MINUTES)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <StayStepButtonLabel>＋</StayStepButtonLabel>
                          </StayStepButton>
                        </StayStepper>
                      )}
                    </StayRow>
                  </CardBody>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomBarWrap>
        <FadeStrip colors={['transparent', COLORS.gray50]} />
        <BottomBar>
          <LegendRow>
            {PRIORITY_ORDER.map((priority) => (
              <LegendItem key={priority}>
                <LegendDot $color={PRIORITY_COLORS[priority].bg} />
                <LegendLabel>
                  {PRIORITY_LABELS[priority]} {priorityCounts[priority]}
                </LegendLabel>
              </LegendItem>
            ))}
          </LegendRow>
          <CTAButton
            onPress={() => {
              if (!tripDate) {
                setShowDateRequiredModal(true);
                return;
              }
              onContinue(priorities, stayMinutes, dayStartTimes);
            }}
            activeOpacity={0.9}
          >
            <CTALabel>{selectedIds.length}곳으로 일정 만들기</CTALabel>
          </CTAButton>
        </BottomBar>
      </BottomBarWrap>

      <ConfirmModal
        visible={showDateRequiredModal}
        title="날짜를 선택해주세요"
        message="언제 떠나는지 알려주시면 일정을 만들 수 있어요."
        confirmLabel="날짜 선택하기"
        onConfirm={() => {
          setShowDateRequiredModal(false);
          setShowDatePicker(true);
        }}
        onCancel={() => setShowDateRequiredModal(false)}
      />

      <TripDatePickerModal
        visible={showDatePicker}
        initialValue={tripDate}
        onConfirm={(value) => {
          onChangeDate(value);
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />
    </ScreenContainer>
  );
}
