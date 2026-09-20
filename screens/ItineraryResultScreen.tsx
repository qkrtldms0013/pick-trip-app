import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components';
import { Badge } from '../components/atoms/Badge';
import { ConfirmModal } from '../components/molecules/ConfirmModal';
import { FlowStepBar } from '../components/molecules/FlowStepBar';
import {
  DEFAULT_STEP_INTERVAL_MS,
  GeneratingProgress,
} from '../components/molecules/GeneratingProgress';
import { ItineraryDayDistanceList } from '../components/molecules/ItineraryDayDistanceList';
import { ItineraryRouteMap } from '../components/molecules/ItineraryRouteMap';
import { ItineraryTitleModal } from '../components/molecules/ItineraryTitleModal';
import { CATEGORIES } from '../constants/categories';
import { COLORS } from '../constants/colors';
import { REGIONS } from '../constants/regions';
import { FONT } from '../constants/typography';
import { useContents } from '../hooks/useContents';
import { useContentsByIds } from '../hooks/useContentsByIds';
import { useItineraryRoutes } from '../hooks/useItineraryRoutes';
import { toErrorMessage } from '../services/apiError';
import { syncBasketToServer } from '../services/basketService';
import { generateItinerary } from '../services/generateItinerary';
import type { SavedItinerarySummary } from '../services/itineraryHistoryStorage';
import {
  generateItineraryPreview,
  saveItineraryPlan,
  updateItineraryPlan,
} from '../services/itineraryService';
import { addStop, moveStop, removeStop, swapStops } from '../services/scheduleActions';
import { buildShareText, shareItinerary } from '../services/shareItinerary';
import { createShareLink } from '../services/shareService';
import type { CompanionType, StylePreference } from '../types/companion';
import type {
  GenerateMode,
  ItineraryStop,
  ItinerarySuggestion,
  ItineraryVariant,
  TravelMode,
} from '../types/itinerary';
import type { Priority } from '../types/priority';
import { computeDayHops, sumDistanceKm } from '../utils/geoDistance';
import {
  addDays,
  formatDateRange,
  formatDayDate,
  formatStayDuration,
  fromDateString,
} from '../utils/tripDate';

interface ItineraryResultScreenProps {
  selectedRegions: string[];
  selectedIds: string[];
  priorities: Record<string, Priority>;
  stayMinutesByContentId: Record<string, number | null>;
  // 일차별 하루 시작 시각("HH:mm"). 키는 일차 번호(1부터). 값이 없는 일차는 서버 기본값(09:00).
  dayStartTimesByDay: Record<number, string>;
  travelDate: string | null;
  duration: number | null;
  companion: CompanionType | null;
  stylePrefs: StylePreference[];
  travelModes: TravelMode[];
  generateMode: GenerateMode;
  startContentId: string | null;
  initialStops?: ItineraryStop[];
  initialItineraryId?: string;
  initialItineraryTitle?: string;
  isGuest: boolean;
  onRequireLogin: () => void;
  onSaved?: (summary: SavedItinerarySummary) => void;
  onGoHome: () => void;
}

const GENERATING_STEPS = [
  { label: '담은 장소 분석', desc: '위치와 카테고리를 확인하고 있어요' },
  { label: '이동 시간 계산', desc: '가장 짧은 동선을 찾고 있어요' },
  { label: '운영 시간 확인', desc: '방문 가능한 시간을 맞추고 있어요' },
  { label: '일정 구성', desc: '우선순위와 흐름을 반영하고 있어요' },
  { label: '마무리', desc: '일정을 정리하고 있어요' },
];

// 실제 생성이 이보다 먼저 끝나도(드물게 아주 빠른 응답) GeneratingProgress가
// 마지막 단계("마무리")까지 보여줄 시간은 확보해준다 — 안 그러면 로딩 화면이
// 중간 단계에서 뚝 끊기고 바로 완성 화면으로 넘어가 버린다.
const MIN_LOADING_MS = GENERATING_STEPS.length * DEFAULT_STEP_INTERVAL_MS + 500;

// 이 화면은 네이티브 스택 헤더(RootNavigator의 headerScreenOptions)가 이미 위에 떠 있어서
// top 세이프에어리어를 또 적용하면 헤더와 본문 사이가 붕 떠 보인다.
const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

const LoadingContainer = styled(View)`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const LoadingFooterNote = styled(Text)`
  font-size: 11.5px;
  font-family: ${FONT.regular};
  line-height: 18px;
  color: ${COLORS.gray500};
  text-align: center;
  padding: 0 28px 46px;
`;

const RetryButton = styled(TouchableOpacity)`
  margin-top: 16px;
  border-width: 1px;
  border-color: ${COLORS.coral500};
  border-radius: 8px;
  padding-vertical: 8px;
  padding-horizontal: 16px;
`;

const RetryLabel = styled(Text)`
  color: ${COLORS.coral500};
  font-size: 14px;
  font-family: ${FONT.medium};
`;

const Header = styled(View)`
  padding: 16px 20px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${COLORS.gray100};
`;

const Subtitle = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 15px;
  color: ${COLORS.gray500};
  margin-top: 14px;
`;

// 일차 전환 탭. 리스트·동선 섹션이 이 하나의 선택을 같이 쓴다(따로 지도 위에 일차 칩을
// 또 두지 않는다). 안이 하나뿐인 여행(당일치기 등)엔 고를 대상이 없으므로 숨긴다.
const DayTabsRow = styled(View)`
  flex-direction: row;
  margin-top: 16px;
`;

const DayTabButton = styled(TouchableOpacity)`
  flex: 1;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
`;

const DayTabTextRow = styled(View)`
  flex-direction: row;
  align-items: baseline;
  gap: 6px;
`;

const DayTabLabel = styled(Text)<{ $active: boolean }>`
  font-size: 14px;
  font-family: ${({ $active }) => ($active ? FONT.bold : FONT.medium)};
  color: ${({ $active }) => ($active ? COLORS.coral700 : COLORS.gray500)};
`;

const DayTabCount = styled(Text)<{ $active: boolean }>`
  font-size: 10.5px;
  font-family: ${FONT.regular};
  color: ${({ $active }) => ($active ? COLORS.coral600 : COLORS.gray400)};
`;

const DayTabUnderline = styled(View)<{ $active: boolean }>`
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background-color: ${({ $active }) => ($active ? COLORS.coral500 : 'transparent')};
`;

// 지역·기간·총 곳 수 + 이동시간/도보/교통비를 코랄 톤 블록 하나로 묶는다.
const SummaryCard = styled(View)`
  background-color: ${COLORS.coral50};
  border-radius: 14px;
  margin: 18px 20px 4px;
  padding: 14px 16px;
`;

const SummaryTopRow = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const SummaryRegionText = styled(Text)`
  font-size: 13.5px;
  font-family: ${FONT.bold};
  color: ${COLORS.coral700};
`;

const SummarySeparator = styled(View)`
  width: 1px;
  height: 12px;
  background-color: ${COLORS.coral100};
`;

const SummaryDateText = styled(Text)`
  font-size: 13px;
  font-family: ${FONT.regular};
  color: ${COLORS.coral600};
`;

const SummaryTotalText = styled(Text)`
  margin-left: auto;
  font-size: 13px;
  font-family: ${FONT.bold};
  color: ${COLORS.coral700};
`;

const SummaryMetricsRow = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 11px;
  padding-top: 11px;
  border-top-width: 1px;
  border-top-color: ${COLORS.coral100};
`;

const SummaryMetricText = styled(Text)`
  font-size: 11.5px;
  font-family: ${FONT.regular};
  color: ${COLORS.coral600};
`;

const GuestBanner = styled(View)`
  flex-direction: row;
  gap: 8px;
  background-color: ${COLORS.coral50};
  border-radius: 12px;
  margin: 12px 20px 4px;
  padding: 12px 14px;
`;

const GuestBannerText = styled(Text)`
  flex: 1;
  font-family: ${FONT.regular};
  font-size: 12px;
  line-height: 18px;
  color: ${COLORS.coral700};
`;

// 이동수단별 여러 안(variant)을 오가는 탭. 2개 이상 안이 있을 때만 보여준다(선택지가
// 하나뿐이면 비교할 대상이 없으므로).
const VariantTabRow = styled(View)`
  flex-direction: row;
  gap: 8px;
  margin: 14px 20px 4px;
`;

const VariantTab = styled(TouchableOpacity)<{ $active: boolean }>`
  flex: 1;
  align-items: center;
  padding-vertical: 10px;
  border-radius: 100px;
  background-color: ${({ $active }) => ($active ? COLORS.coral500 : COLORS.white)};
  border-width: 1px;
  border-color: ${({ $active }) => ($active ? COLORS.coral500 : COLORS.gray200)};
`;

const VariantTabLabel = styled(Text)<{ $active: boolean }>`
  font-size: 13px;
  font-family: ${FONT.bold};
  color: ${({ $active }) => ($active ? COLORS.white : COLORS.gray700)};
`;

// 혼잡 기반 순서변경 제안. 일정 상세 상단에 모아서 보여준다 — 수락/거절해야 다음 제안으로
// 넘어가는 게 아니라, 여러 개면 한눈에 보이도록 세로로 쌓아 보여준다.
const SuggestionSection = styled(View)`
  margin: 8px 20px 4px;
  gap: 8px;
`;

const SuggestionCard = styled(View)`
  flex-direction: row;
  gap: 10px;
  background-color: ${COLORS.coral50};
  border-radius: 12px;
  padding: 12px 14px;
`;

const SuggestionTextColumn = styled(View)`
  flex: 1;
  gap: 8px;
`;

const SuggestionMessage = styled(Text)`
  font-family: ${FONT.medium};
  font-size: 13px;
  line-height: 18px;
  color: ${COLORS.coral700};
`;

const SuggestionActionRow = styled(View)`
  flex-direction: row;
  gap: 8px;
`;

const SuggestionAcceptButton = styled(TouchableOpacity)`
  padding-vertical: 6px;
  padding-horizontal: 12px;
  border-radius: 8px;
  background-color: ${COLORS.coral500};
`;

const SuggestionAcceptLabel = styled(Text)`
  font-size: 12px;
  font-family: ${FONT.semibold};
  color: ${COLORS.white};
`;

const SuggestionRejectButton = styled(TouchableOpacity)`
  padding-vertical: 6px;
  padding-horizontal: 12px;
  border-radius: 8px;
  border-width: 1px;
  border-color: ${COLORS.coral300};
`;

const SuggestionRejectLabel = styled(Text)`
  font-size: 12px;
  font-family: ${FONT.medium};
  color: ${COLORS.coral700};
`;

const DayHeadRow = styled(View)`
  flex-direction: row;
  align-items: baseline;
  gap: 9px;
  padding: 22px 20px 0;
  margin-bottom: 16px;
`;

const DayHeadDate = styled(Text)`
  font-size: 18px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
  letter-spacing: -0.4px;
`;

const DayHeadMeta = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 11.5px;
  color: ${COLORS.gray500};
`;

const StopRow = styled(View)`
  flex-direction: row;
  gap: 12px;
  padding-horizontal: 20px;
`;

const TimeColumn = styled(View)`
  width: 46px;
  align-items: flex-end;
`;

const TimeValue = styled(Text)`
  font-size: 13px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
  text-align: right;
`;

const TimeStay = styled(Text)`
  font-size: 9.5px;
  font-family: ${FONT.regular};
  color: ${COLORS.gray500};
  margin-top: 3px;
  text-align: right;
`;

// 행 높이만큼 늘어나는 코랄 세로 띠. 시간 열과 본문 사이를 잇는 자리 표시다.
const Stripe = styled(View)`
  width: 3px;
  align-self: stretch;
  border-radius: 2px;
  background-color: ${COLORS.coral500};
`;

const StopBody = styled(View)`
  flex: 1;
  min-width: 0;
  padding-bottom: 6px;
`;

const NameRow = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
`;

const StopName = styled(Text)`
  font-size: 16px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
  letter-spacing: -0.3px;
`;

// 카테고리 배지는 항목마다 다른 색을 쓰지 않는다 — 이 화면 팔레트는 코랄 + 중성 회색뿐이다.
const CategoryBadge = styled(View)`
  padding-vertical: 2px;
  padding-horizontal: 7px;
  border-radius: 5px;
  background-color: ${COLORS.coral50};
`;

const CategoryLabel = styled(Text)`
  font-size: 10px;
  font-family: ${FONT.bold};
  color: ${COLORS.coral700};
`;

const StopAddress = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 11px;
  color: ${COLORS.gray500};
  margin-top: 5px;
`;

const ReasonText = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 11.5px;
  line-height: 18px;
  color: ${COLORS.gray700};
  margin-top: 9px;
`;

const OpsColumn = styled(View)`
  gap: 5px;
`;

const OpsButton = styled(TouchableOpacity)<{ $variant: 'move' | 'delete' }>`
  width: 30px;
  height: 27px;
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  background-color: ${({ $variant }) => ($variant === 'delete' ? COLORS.coral50 : COLORS.gray100)};
`;

// 연속한 두 장소 사이에만 보이는 구간 거리. 마지막 장소 뒤에는 없다.
const LegRow = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 9px;
  margin: 10px 0 14px 58px;
`;

const LegLine = styled(View)`
  width: 16px;
  height: 1px;
  background-color: ${COLORS.gray200};
`;

const LegText = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 10.5px;
  color: ${COLORS.gray500};
`;

const EmptyDayBlock = styled(View)`
  background-color: ${COLORS.gray50};
  border-radius: 12px;
  align-items: center;
  padding: 20px;
  margin: 0 20px 16px;
`;

const EmptyDayText = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray500};
`;

const AddButton = styled(TouchableOpacity)`
  margin-horizontal: 20px;
  margin-bottom: 16px;
  height: 44px;
  border-radius: 12px;
  background-color: ${COLORS.coral50};
  align-items: center;
  justify-content: center;
`;

const AddButtonLabel = styled(Text)`
  font-size: 12.5px;
  color: ${COLORS.coral700};
  font-family: ${FONT.bold};
`;

const CandidateRow = styled(TouchableOpacity)`
  background-color: ${COLORS.white};
  border-radius: 8px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  margin-horizontal: 20px;
  margin-bottom: 8px;
  padding: 10px 14px;
`;

const CandidateName = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 14px;
  color: ${COLORS.gray900};
`;

const RouteDivider = styled(View)`
  height: 1px;
  background-color: ${COLORS.gray100};
  margin: 26px 20px 0;
`;

// 하단 고정 바 위에 18px 페이드 스트립을 얹어, 스크롤되는 카드가 불투명 바 경계에서
// 뚝 끊기지 않고 배경색으로 자연스럽게 녹아들게 한다(PrioritySelectScreen과 동일 패턴).
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

const BottomActionRow = styled(View)`
  flex-direction: row;
  align-items: stretch;
  gap: 9px;
`;

const SaveButton = styled(TouchableOpacity)<{ $disabled: boolean }>`
  flex: 1;
  height: 54px;
  border-radius: 15px;
  align-items: center;
  justify-content: center;
  background-color: ${({ $disabled }) => ($disabled ? COLORS.gray200 : COLORS.coral500)};
  shadow-color: ${COLORS.coral500};
  shadow-opacity: ${({ $disabled }) => ($disabled ? 0 : 0.24)};
  shadow-radius: 20px;
  shadow-offset: 0px 8px;
  elevation: ${({ $disabled }) => ($disabled ? 0 : 6)};
`;

const SaveButtonLabel = styled(Text)`
  color: ${COLORS.white};
  font-size: 15px;
  font-family: ${FONT.bold};
  text-align: center;
`;

// "공유하기"는 텍스트 없이 아이콘만 있는 작은 정사각형 버튼으로 일정 저장 옆에 붙인다.
const ShareIconButton = styled(TouchableOpacity)`
  width: 54px;
  height: 54px;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  background-color: ${COLORS.gray50};
  border-width: 1px;
  border-color: ${COLORS.gray200};
`;

export function ItineraryResultScreen({
  selectedRegions,
  selectedIds,
  priorities,
  stayMinutesByContentId,
  dayStartTimesByDay,
  travelDate,
  duration,
  companion,
  stylePrefs,
  travelModes,
  generateMode,
  startContentId,
  initialStops,
  initialItineraryId,
  initialItineraryTitle,
  isGuest,
  onRequireLogin,
  onSaved,
  onGoHome,
}: ItineraryResultScreenProps) {
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>(
    initialStops ? 'done' : 'loading',
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [stops, setStops] = useState<ItineraryStop[]>(initialStops ?? []);
  // 로그인 사용자가 이동수단을 2개 이상 골랐을 때만 여러 안이 들어온다(게스트는 항상 빈 배열).
  // stops는 그중 선택된 하나를 그대로 담고 있으므로, 지도·일차별 목록·저장 등 나머지 로직은
  // variants를 몰라도 stops만 보고 그대로 동작한다.
  const [variants, setVariants] = useState<ItineraryVariant[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  // 혼잡 기반 순서변경 제안. 수락/거절한 제안은 이 목록에서 바로 지운다(다시 안 보여줌).
  const [suggestions, setSuggestions] = useState<ItinerarySuggestion[]>([]);
  const [plan, setPlan] = useState<{
    itineraryId: string | null;
    title: string;
    region: string;
    travelDate: string | null;
    duration: number | null;
  } | null>(null);
  // 일차 탭 하나로 장소 리스트와 동선 섹션(지도·구간 거리)이 함께 갱신된다.
  const [selectedDay, setSelectedDay] = useState(1);
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ItineraryStop | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const runGenerate = async () => {
    setStatus('loading');
    // 실제 생성이 아무리 빨리 끝나도, 진행 단계 체크리스트 애니메이션이 끝까지 재생될
    // 시간은 확보해준다(그래야 화면이 애니메이션 도중에 뚝 끊기지 않는다).
    const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS));
    try {
      if (isGuest) {
        // 백엔드 AI 일정 생성은 로그인이 필요하다. 게스트는 로그인 없이도 바로 일정을
        // 볼 수 있도록 프론트 규칙 기반 생성기를 대신 쓴다.
        const result = generateItinerary({ selectedIds, priorities });
        await minDelay;
        setVariants([]);
        setSelectedVariantIndex(0);
        setSuggestions([]);
        setStops(result.stops);
        setPlan({
          itineraryId: null,
          title: '나만의 여행 일정',
          region: selectedRegions[0] ?? '',
          travelDate,
          duration,
        });
      } else {
        const items = selectedIds.map((contentId) => ({
          contentId,
          priority: priorities[contentId] ?? 'good',
        }));
        const contentById = Object.fromEntries(selectedContents.map((c) => [c.id, c]));
        // syncBasketToServer는 여전히 필요하다 — /itineraries/generate는 region/travelDate/
        // duration/companion/stylePrefs/담은 콘텐츠를 요청 바디로 받지 않고(services/
        // itineraryService.ts 참고) 서버에 저장된 바구니만 그대로 읽으므로, 생성을 요청하기
        // 전에 로컬 바구니를 먼저 동기화해야 한다.
        await syncBasketToServer({
          region: (selectedRegions[0] ?? '').toUpperCase(),
          travelDate,
          duration,
          companion,
          stylePrefs,
          items: items.map((item) => ({
            contentId: item.contentId,
            priority: item.priority,
            title: contentById[item.contentId]?.name ?? null,
            thumbnailUrl: contentById[item.contentId]?.imageUrl ?? null,
            desiredStayMinutes: stayMinutesByContentId[item.contentId] ?? null,
          })),
        });
        // dayStartTimesByDay는 1부터 시작하는 일차 번호가 키다 — 요청 배열은 0번째가 1일차라
        // 인덱스를 맞춰서 채운다. 값이 없는 일차는 null로 둬서 서버 기본값(09:00)을 쓰게 한다.
        const totalGenerateDays = duration != null ? duration + 1 : 1;
        const dayStartTimes = Array.from(
          { length: totalGenerateDays },
          (_, i) => dayStartTimesByDay[i + 1] ?? null,
        );
        const preview = await generateItineraryPreview({
          travelModes,
          mode: generateMode,
          startContentId: startContentId ?? undefined,
          dayStartTimes,
        });
        await minDelay;
        setVariants(preview.variants);
        setSelectedVariantIndex(0);
        setSuggestions(preview.suggestions);
        // 첫 안(요청한 travelModes 중 첫 번째)을 기본으로 보여준다. 이후 탭을 눌러 다른
        // 안으로 바꾸면 handleSelectVariant가 stops를 그 안의 것으로 갈아끼운다.
        const primary = preview.variants[0];
        setStops(primary?.stops ?? []);
        setPlan({
          itineraryId: null,
          title: primary?.title ?? '나만의 여행 일정',
          region: preview.region,
          travelDate: preview.travelDate,
          duration: preview.duration,
        });
      }
      setStatus('done');
    } catch (error) {
      // 원인을 남기지 않으면 타임아웃인지 서버 에러인지 구분할 수 없다.
      console.warn('[itinerary] 일정 생성 실패', error);
      setErrorMessage('일정 생성에 실패했습니다. 컨텐츠를 추가하거나 다시 시도해주세요.');
      setStatus('error');
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: 마운트 시 1회만 생성 요청
  useEffect(() => {
    if (initialStops) return;
    runGenerate();
  }, []);

  // 안 탭을 누르면 stops를 그 안의 것으로 통째로 갈아끼운다 — 지도·일차별 목록은 stops만
  // 보고 그리므로 이 한 줄이면 화면 전체가 그 안 기준으로 바뀐다. 다른 안으로 넘어가면
  // 편집 중이던 순서 변경 등은 버려진다(서로 다른 두 일정이니 자연스러운 동작).
  const handleSelectVariant = (index: number) => {
    const variant = variants[index];
    if (!variant) return;
    setSelectedVariantIndex(index);
    setStops(variant.stops);
  };

  // 수락하면 로컬 stops 순서만 바꾼다 — 이 시점(저장 전 미리보기)엔 PATCH할 itineraryId가
  // 없으므로 서버에는 반영하지 않는다. "일정 저장"을 눌러야 실제로 저장된다.
  const handleAcceptSuggestion = (suggestion: ItinerarySuggestion) => {
    const swapWithContentId = suggestion.swapWithContentId;
    if (!swapWithContentId) return;
    setStops((prev) =>
      swapStops(prev, suggestion.dayIndex, suggestion.contentId, swapWithContentId),
    );
    setSuggestions((prev) => prev.filter((s) => s !== suggestion));
  };

  const handleRejectSuggestion = (suggestion: ItinerarySuggestion) => {
    setSuggestions((prev) => prev.filter((s) => s !== suggestion));
  };

  // 안(variant)을 바꾸면 stops가 통째로 교체되므로, 지금 stops에 없는 콘텐츠를 가리키는
  // 제안은 걸러낸다(엉뚱한 안 기준 제안이 남아있는 걸 막는다).
  const visibleSuggestions = suggestions.filter((s) =>
    stops.some((stop) => stop.contentId === s.contentId),
  );

  const { contents: selectedContents } = useContentsByIds(selectedIds);
  const titleByContentId = useMemo(
    () => Object.fromEntries(selectedContents.map((c) => [c.id, c.name])),
    [selectedContents],
  );

  // 저장 버튼을 누르면 바로 저장하지 않고, 이름을 정할 수 있게 모달부터 띄운다.
  const handleSaveButtonPress = () => {
    if (isGuest) {
      onRequireLogin();
      return;
    }
    // days[].items는 서버에서 빈 배열을 거부한다(@NotEmpty). 모든 장소를 지운 채로
    // 저장하면 그대로 검증 실패로 이어지므로, 요청을 보내기 전에 미리 막는다.
    if (stops.length === 0) {
      Alert.alert('저장할 장소가 없어요', '일정에서 장소를 모두 지우면 저장할 수 없어요.');
      return;
    }
    setShowSaveModal(true);
  };

  // 실제 저장 요청. 성공하면 저장된 결과를, 실패하면 null을 돌려준다.
  const submitSave = async (title: string) => {
    setSaveState('saving');
    try {
      const itineraryId = plan?.itineraryId ?? initialItineraryId;
      // plan은 AI가 새로 생성할 때만 채워진다. 저장된 일정을 다시 열어 편집하는 흐름은
      // runGenerate를 건너뛰어 plan이 계속 null이므로, 화면이 이미 갖고 있는
      // travelDate/duration prop을 fallback으로 써야 값이 비어 저장되지 않는다.
      const input = {
        title,
        region: plan?.region ?? selectedRegions[0] ?? '',
        travelDate: plan?.travelDate ?? travelDate,
        duration: plan?.duration ?? duration,
        stops,
        titleByContentId,
      };
      const saved = itineraryId
        ? await updateItineraryPlan(itineraryId, input)
        : await saveItineraryPlan(input);
      setPlan({
        itineraryId: saved.itineraryId,
        title: saved.title,
        region: saved.region,
        travelDate: saved.travelDate,
        duration: saved.duration,
      });
      if (saved.itineraryId) {
        onSaved?.({
          itineraryId: saved.itineraryId,
          title: saved.title,
          region: saved.region,
          travelDate: saved.travelDate,
          duration: saved.duration,
          savedAt: new Date().toISOString(),
        });
      }
      setSaveState('saved');
      return saved;
    } catch (error) {
      // 원인을 남기지 않으면 서버 응답인지 네트워크 문제인지 구분할 수 없다.
      console.warn('[itinerary] 일정 저장 실패', error);
      setSaveState('error');
      Alert.alert('저장 실패', toErrorMessage(error, '잠시 후 다시 시도해주세요.'));
      return null;
    }
  };

  const handleConfirmSave = async (title: string) => {
    const saved = await submitSave(title);
    // 모달은 성공했을 때만 닫는다 — 실패하면 열어둬서 이름 다시 안 치고 바로 재시도할 수 있게.
    if (saved) {
      setShowSaveModal(false);
      onGoHome();
    }
  };

  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isGuest) {
      onRequireLogin();
      return;
    }
    const itineraryId = plan?.itineraryId ?? initialItineraryId;
    if (!itineraryId) {
      Alert.alert('저장이 필요해요', '공유하려면 먼저 일정을 저장해주세요.');
      return;
    }
    setIsSharing(true);
    try {
      const link = await createShareLink(itineraryId);
      const text = `${buildShareText({ stops, contentById })}\n\n일정 보기: ${link}`;
      await shareItinerary(text);
    } catch (error) {
      // 원인을 남기지 않으면 서버 응답인지 네트워크 문제인지 구분할 수 없다.
      console.warn('[share] 공유 링크 생성 실패', { itineraryId, error });
      Alert.alert('공유 링크 생성 실패', toErrorMessage(error, '잠시 후 다시 시도해주세요.'));
    } finally {
      setIsSharing(false);
    }
  };

  const { contents: regionContents } = useContents(selectedRegions);
  const contentById = useMemo(() => {
    const map = Object.fromEntries(regionContents.map((c) => [c.id, c]));
    for (const content of selectedContents) map[content.id] = content;
    return map;
  }, [regionContents, selectedContents]);

  const usedIds = stops.map((s) => s.contentId);
  const candidates = regionContents.filter((c) => !usedIds.includes(c.id));

  // totalDays는 지도·일차 탭(useItineraryRoutes)에도 필요해서, 로딩/에러 조기 return보다
  // 앞에 둬야 훅 호출 순서가 렌더마다 흔들리지 않는다.
  const planDurationForDays = plan?.duration ?? duration;
  const totalDays =
    planDurationForDays != null ? planDurationForDays + 1 : Math.max(1, ...stops.map((s) => s.day));
  const { routeByDay } = useItineraryRoutes(stops, contentById, totalDays);
  const activeDay = Math.min(selectedDay, totalDays);

  if (status === 'loading') {
    // 아직 plan이 없는 생성 전 단계라, 저장된 결과가 아니라 화면에 넘어온 props(선택 지역·
    // 날짜·담은 수)로 메타 문구를 만든다.
    const loadingRegionName = REGIONS.find((r) => r.id === selectedRegions[0])?.name ?? null;
    const loadingDateRange = formatDateRange(travelDate, duration);
    const loadingMetaText = [loadingRegionName, `${selectedIds.length}곳`, loadingDateRange]
      .filter(Boolean)
      .join(' · ');

    return (
      <ScreenContainer edges={['bottom', 'left', 'right']}>
        <GeneratingProgress steps={GENERATING_STEPS} metaText={loadingMetaText} />
        <LoadingFooterNote>보통 30초 정도 걸려요.</LoadingFooterNote>
      </ScreenContainer>
    );
  }

  if (status === 'error') {
    return (
      <ScreenContainer edges={['bottom', 'left', 'right']}>
        <LoadingContainer>
          <Subtitle style={{ textAlign: 'center', marginBottom: 4 }}>{errorMessage}</Subtitle>
          <RetryButton onPress={runGenerate} activeOpacity={0.8}>
            <RetryLabel>다시 시도</RetryLabel>
          </RetryButton>
        </LoadingContainer>
      </ScreenContainer>
    );
  }

  const selectedVariant = variants[selectedVariantIndex] ?? null;
  const planRegion = plan?.region ?? selectedRegions[0] ?? null;
  const planTravelDate = plan?.travelDate ?? travelDate;
  const planDuration = planDurationForDays;
  const regionName = REGIONS.find((r) => r.id === planRegion)?.name ?? null;
  const dateRange = formatDateRange(planTravelDate, planDuration);
  const dayList = Array.from({ length: totalDays }, (_, i) => i + 1);

  // route(카카오 실도로 거리)가 아직 없으면 좌표로 즉석 계산한 직선거리로 채운다.
  const getDayDistanceKm = (day: number) => {
    const route = routeByDay[day];
    if (route) return route.totalDistanceKm;
    const dayStops = stops.filter((stop) => stop.day === day);
    return sumDistanceKm(computeDayHops(dayStops, contentById));
  };
  const totalTripDistanceKm = dayList.reduce((sum, day) => sum + getDayDistanceKm(day), 0);

  const activeDayStops = stops.filter((stop) => stop.day === activeDay);
  const activeDayDate = planTravelDate
    ? addDays(fromDateString(planTravelDate), activeDay - 1)
    : null;
  const activeDayRoute = routeByDay[activeDay];
  const activeDayLegs =
    activeDayRoute?.legs ??
    computeDayHops(activeDayStops, contentById).map((hop) => ({
      ...hop,
      durationMinutes: null as number | null,
    }));
  const activeDayDistanceKm = getDayDistanceKm(activeDay);
  const activeDayMeta = [
    `${activeDay}일차`,
    `${activeDayStops.length}곳`,
    activeDayStops.length > 1 ? `${activeDayDistanceKm.toFixed(1)}km` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScreenContainer edges={['bottom', 'left', 'right']}>
      {/* ScrollView 밖에 둬서 스크롤해도 일차 탭이 계속 눌리는 위치에 남아있게 한다
          (레퍼런스 디자인의 sticky 헤더와 같은 의도). */}
      <Header>
        <FlowStepBar activeIndex={3} />
        {totalDays > 1 && (
          <DayTabsRow>
            {dayList.map((day) => {
              const active = day === activeDay;
              return (
                <DayTabButton key={day} onPress={() => setSelectedDay(day)} activeOpacity={0.7}>
                  <DayTabTextRow>
                    <DayTabLabel $active={active}>{day}일차</DayTabLabel>
                    <DayTabCount $active={active}>
                      {stops.filter((stop) => stop.day === day).length}곳
                    </DayTabCount>
                  </DayTabTextRow>
                  <DayTabUnderline $active={active} />
                </DayTabButton>
              );
            })}
          </DayTabsRow>
        )}
      </Header>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        // 아래 고정 바(FadeStrip 18 + BottomBar 82 = 100px)를 딱 가릴 만큼만 확보한다.
        // PrioritySelectScreen의 140px는 그 화면의 범례 행까지 포함한 값이라 이 화면엔 과했다.
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {(regionName || dateRange || selectedVariant) && (
          <SummaryCard>
            {(regionName || dateRange) && (
              <SummaryTopRow>
                {regionName && <SummaryRegionText>{regionName}</SummaryRegionText>}
                {regionName && dateRange && <SummarySeparator />}
                {dateRange && <SummaryDateText>{dateRange}</SummaryDateText>}
                <SummaryTotalText>총 {stops.length}곳</SummaryTotalText>
              </SummaryTopRow>
            )}

            {selectedVariant && (
              <SummaryMetricsRow>
                {(
                  [
                    { key: 'totalTravelMinutes', label: '이동시간', unit: '분' },
                    { key: 'totalWalkingMinutes', label: '도보', unit: '분' },
                    { key: 'totalTransitCost', label: '교통비', unit: '원' },
                  ] as const
                ).map((metric) => {
                  const value = selectedVariant.metrics[metric.key];
                  return (
                    <SummaryMetricText key={metric.key}>
                      {metric.label}{' '}
                      {value == null
                        ? '산출 불가'
                        : `${value.toLocaleString('ko-KR')}${metric.unit}`}
                    </SummaryMetricText>
                  );
                })}
              </SummaryMetricsRow>
            )}
          </SummaryCard>
        )}

        {variants.length > 1 && (
          <VariantTabRow>
            {variants.map((variant, index) => (
              <VariantTab
                key={variant.travelMode}
                $active={index === selectedVariantIndex}
                onPress={() => handleSelectVariant(index)}
                activeOpacity={0.8}
              >
                <VariantTabLabel $active={index === selectedVariantIndex}>
                  {variant.label}
                </VariantTabLabel>
              </VariantTab>
            ))}
          </VariantTabRow>
        )}

        {visibleSuggestions.length > 0 && (
          <SuggestionSection>
            {visibleSuggestions.map((suggestion) => (
              <SuggestionCard key={`${suggestion.dayIndex}-${suggestion.contentId}`}>
                <Ionicons name="alert-circle-outline" size={16} color={COLORS.coral700} />
                <SuggestionTextColumn>
                  <SuggestionMessage>{suggestion.message}</SuggestionMessage>
                  <SuggestionActionRow>
                    {suggestion.swapWithContentId && (
                      <SuggestionAcceptButton
                        onPress={() => handleAcceptSuggestion(suggestion)}
                        activeOpacity={0.8}
                      >
                        <SuggestionAcceptLabel>순서 바꾸기</SuggestionAcceptLabel>
                      </SuggestionAcceptButton>
                    )}
                    <SuggestionRejectButton
                      onPress={() => handleRejectSuggestion(suggestion)}
                      activeOpacity={0.8}
                    >
                      <SuggestionRejectLabel>괜찮아요</SuggestionRejectLabel>
                    </SuggestionRejectButton>
                  </SuggestionActionRow>
                </SuggestionTextColumn>
              </SuggestionCard>
            ))}
          </SuggestionSection>
        )}

        {isGuest && (
          <GuestBanner>
            <Ionicons name="sparkles" size={14} color={COLORS.coral700} />
            <GuestBannerText>
              지금 보시는 일정은 담아주신 콘텐츠를 기반으로 만든 예시입니다. 로그인하면 실제 AI 일정
              생성/저장 기능을 이용할 수 있어요.
            </GuestBannerText>
          </GuestBanner>
        )}

        <DayHeadRow>
          <DayHeadDate>
            {activeDayDate ? formatDayDate(activeDayDate) : `${activeDay}일차`}
          </DayHeadDate>
          <DayHeadMeta>{activeDayMeta}</DayHeadMeta>
        </DayHeadRow>

        {activeDayStops.length === 0 ? (
          <EmptyDayBlock>
            <EmptyDayText>이 날은 아직 비어 있어요</EmptyDayText>
          </EmptyDayBlock>
        ) : (
          activeDayStops.map((stop, index) => {
            const content = contentById[stop.contentId];
            const category = content && CATEGORIES.find((c) => c.id === content.category);
            const stayDuration = formatStayDuration(stop.startTime, stop.endTime);
            const hopToNext = activeDayLegs.find((leg) => leg.fromContentId === stop.contentId);
            const isFirst = index === 0;
            const isLast = index === activeDayStops.length - 1;
            return (
              <View key={stop.contentId}>
                <StopRow>
                  <TimeColumn>
                    <TimeValue numberOfLines={1}>{stop.startTime}</TimeValue>
                    {stayDuration && <TimeStay numberOfLines={1}>{stayDuration}</TimeStay>}
                  </TimeColumn>
                  <Stripe />
                  <StopBody>
                    {(category || stop.addedByAi || stop.addedForRest) && (
                      <NameRow style={{ marginBottom: 0 }}>
                        {category && (
                          <CategoryBadge>
                            <CategoryLabel>{category.label}</CategoryLabel>
                          </CategoryBadge>
                        )}
                        {/* addedByAi와 addedForRest가 동시에 true인 경우는 서버 계약상 없다. */}
                        {stop.addedByAi && (
                          <Badge label="AI 추천" color={COLORS.teal700} bg={COLORS.teal50} />
                        )}
                        {stop.addedForRest && (
                          <Badge label="휴식" color={COLORS.gray700} bg={COLORS.gray100} />
                        )}
                      </NameRow>
                    )}
                    <NameRow>
                      <StopName>{content?.name}</StopName>
                    </NameRow>
                    {content?.address && (
                      <StopAddress numberOfLines={1}>{content.address}</StopAddress>
                    )}
                    <ReasonText>{stop.reason}</ReasonText>
                  </StopBody>
                  <OpsColumn>
                    <OpsButton
                      $variant="move"
                      disabled={isFirst}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => setStops((prev) => moveStop(prev, stop.contentId, 'up'))}
                      accessibilityLabel="위로"
                    >
                      <Ionicons
                        name="chevron-up-outline"
                        size={14}
                        color={isFirst ? COLORS.gray300 : COLORS.gray700}
                      />
                    </OpsButton>
                    <OpsButton
                      $variant="move"
                      disabled={isLast}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => setStops((prev) => moveStop(prev, stop.contentId, 'down'))}
                      accessibilityLabel="아래로"
                    >
                      <Ionicons
                        name="chevron-down-outline"
                        size={14}
                        color={isLast ? COLORS.gray300 : COLORS.gray700}
                      />
                    </OpsButton>
                    <OpsButton
                      $variant="delete"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => setDeleteTarget(stop)}
                      accessibilityLabel="삭제"
                    >
                      <Ionicons name="close-outline" size={16} color={COLORS.coral700} />
                    </OpsButton>
                  </OpsColumn>
                </StopRow>
                {!isLast && hopToNext && (
                  <LegRow>
                    <LegLine />
                    <LegText>
                      차로 {hopToNext.distanceKm.toFixed(1)}km
                      {hopToNext.durationMinutes != null ? ` · ${hopToNext.durationMinutes}분` : ''}
                    </LegText>
                  </LegRow>
                )}
              </View>
            );
          })
        )}
        <AddButton onPress={() => setIsAddingPlace((prev) => !prev)}>
          <AddButtonLabel>+ 장소 추가</AddButtonLabel>
        </AddButton>
        {isAddingPlace &&
          candidates.map((candidate) => (
            <CandidateRow
              key={candidate.id}
              onPress={() => {
                setStops((prev) => addStop(prev, candidate.id, activeDay));
                setIsAddingPlace(false);
              }}
            >
              <CandidateName>{candidate.name}</CandidateName>
            </CandidateRow>
          ))}

        <RouteDivider />
        <ItineraryRouteMap
          stops={stops}
          contentById={contentById}
          routeByDay={routeByDay}
          totalDays={totalDays}
          selectedDay={activeDay}
          dayLabel={`${activeDay}일차`}
          dayDistanceText={activeDayStops.length > 1 ? `${activeDayDistanceKm.toFixed(1)}km` : null}
        />
        <ItineraryDayDistanceList
          day={activeDay}
          dayStops={activeDayStops}
          contentById={contentById}
          route={routeByDay[activeDay] ?? null}
          tripTotalDistanceKm={totalTripDistanceKm}
        />
      </ScrollView>
      <BottomBarWrap>
        <FadeStrip colors={['transparent', COLORS.gray50]} />
        <BottomBar>
          <BottomActionRow>
            <SaveButton
              onPress={handleSaveButtonPress}
              activeOpacity={0.8}
              disabled={saveState === 'saving' || stops.length === 0}
              $disabled={stops.length === 0}
            >
              <SaveButtonLabel>
                {stops.length === 0
                  ? '저장할 장소가 없어요'
                  : saveState === 'saving'
                    ? '저장 중...'
                    : saveState === 'saved'
                      ? '저장 완료'
                      : saveState === 'error'
                        ? '저장 실패했습니다. 다시 시도해주세요.'
                        : isGuest
                          ? '로그인하고 일정 저장'
                          : '일정 저장'}
              </SaveButtonLabel>
            </SaveButton>
            <ShareIconButton
              onPress={handleShare}
              activeOpacity={0.8}
              disabled={isSharing}
              accessibilityLabel={isGuest ? '로그인하고 공유하기' : '공유하기'}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color={COLORS.gray500} />
              ) : (
                <Ionicons name="share-outline" size={20} color={COLORS.gray700} />
              )}
            </ShareIconButton>
          </BottomActionRow>
        </BottomBar>
      </BottomBarWrap>
      <ItineraryTitleModal
        visible={showSaveModal}
        initialTitle={plan?.title ?? initialItineraryTitle ?? '나만의 여행 일정'}
        isSaving={saveState === 'saving'}
        heading="여행 이름을 정해주세요"
        subtitle="나중에 '저장한 여행' 목록에서 이 이름으로 보여요"
        onConfirm={handleConfirmSave}
        onClose={() => setShowSaveModal(false)}
      />
      <ConfirmModal
        visible={deleteTarget != null}
        title="이 장소를 일정에서 뺄까요?"
        confirmLabel="빼기"
        cancelLabel="취소"
        destructive
        onConfirm={() => {
          if (deleteTarget) setStops((prev) => removeStop(prev, deleteTarget.contentId));
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </ScreenContainer>
  );
}
