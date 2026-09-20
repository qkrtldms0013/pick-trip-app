import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components';
import { SkeletonBox } from '../components/atoms/SkeletonBox';
import { ConfirmModal } from '../components/molecules/ConfirmModal';
import { ItineraryDayDistanceList } from '../components/molecules/ItineraryDayDistanceList';
import { ItineraryRouteMap } from '../components/molecules/ItineraryRouteMap';
import { ItineraryStopSkeleton } from '../components/molecules/ItineraryStopSkeleton';
import { ItineraryTitleModal } from '../components/molecules/ItineraryTitleModal';
import { CATEGORIES } from '../constants/categories';
import { COLORS } from '../constants/colors';
import { REGIONS } from '../constants/regions';
import { FONT } from '../constants/typography';
import { useContents } from '../hooks/useContents';
import { useContentsByIds } from '../hooks/useContentsByIds';
import { useItineraryRoutes } from '../hooks/useItineraryRoutes';
import { toErrorMessage } from '../services/apiError';
import type { SavedItinerarySummary } from '../services/itineraryHistoryStorage';
import {
  getItineraryPlan,
  type ItineraryPlan,
  updateItineraryPlan,
} from '../services/itineraryService';
import { addStop, moveStop, removeStop } from '../services/scheduleActions';
import { buildShareText, shareItinerary } from '../services/shareItinerary';
import { createShareLink } from '../services/shareService';
import type { ItineraryStop } from '../types/itinerary';
import { computeDayHops, sumDistanceKm } from '../utils/geoDistance';
import {
  addDays,
  formatDateRange,
  formatDayDate,
  formatStayDuration,
  fromDateString,
} from '../utils/tripDate';

interface SavedItineraryScreenProps {
  itineraryId: string;
  // 저장에 성공하면 홈/마이페이지 목록도 같이 최신화할 수 있도록 알려준다. 목록 화면이 없는
  // 경로(딥링크 등)에서는 안 넘겨도 되게 선택값으로 둔다.
  onSaved?: (summary: SavedItinerarySummary) => void;
}

// 이 화면은 네이티브 스택 헤더(RootNavigator의 headerScreenOptions)가 이미 위에 떠 있어서
// top 세이프에어리어를 또 적용하면 헤더와 본문 사이가 붕 떠 보인다.
const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

const CenterBox = styled(View)`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 12px;
`;

// ScrollView 밖에 둬서 스크롤해도 일차 탭이 계속 눌리는 위치에 남아있게 한다(ItineraryResultScreen과 동일).
const Header = styled(View)`
  padding: 16px 20px 4px;
  border-bottom-width: 1px;
  border-bottom-color: ${COLORS.gray100};
`;

const TitleRow = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const Title = styled(Text)`
  flex-shrink: 1;
  font-size: 20px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
`;

const TitleEditButton = styled(TouchableOpacity)`
  padding: 6px;
`;

const Subtitle = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 14px;
  color: ${COLORS.gray500};
  margin-top: 6px;
`;

const RetryButton = styled(TouchableOpacity)`
  margin-top: 4px;
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

// 일차 전환 탭. 리스트·동선 섹션이 이 하나의 선택을 같이 쓴다(ItineraryResultScreen과 동일 패턴).
const DayTabsRow = styled(View)`
  flex-direction: row;
  margin-top: 14px;
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

// 지역·기간·총 곳 수를 코랄 톤 블록 하나로 묶는다(ItineraryResultScreen의 여행 요약 카드와 동일 톤).
const SummaryCard = styled(View)`
  background-color: ${COLORS.coral50};
  border-radius: 14px;
  margin: 18px 20px 4px;
  padding: 14px 16px;
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
  font-family: ${FONT.bold};
  color: ${COLORS.coral700};
`;

const SummaryDivider = styled(View)`
  width: 1px;
  height: 12px;
  background-color: ${COLORS.coral100};
`;

const EditingBanner = styled(View)`
  flex-direction: row;
  gap: 8px;
  background-color: ${COLORS.coral50};
  border-radius: 12px;
  margin: 12px 20px 4px;
  padding: 12px 14px;
`;

const EditingBannerText = styled(Text)`
  flex: 1;
  font-family: ${FONT.regular};
  font-size: 12px;
  line-height: 18px;
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

// 하단 고정 바 위에 18px 페이드 스트립을 얹는다(ItineraryResultScreen과 동일 패턴).
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

const ButtonRow = styled(View)`
  flex-direction: row;
  gap: 9px;
`;

const SecondaryButton = styled(TouchableOpacity)<{ $disabled?: boolean }>`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 54px;
  border-radius: 15px;
  background-color: ${COLORS.gray50};
  border-width: 1px;
  border-color: ${({ $disabled }) => ($disabled ? COLORS.gray100 : COLORS.gray200)};
`;

const SecondaryButtonLabel = styled(Text)<{ $disabled?: boolean }>`
  color: ${({ $disabled }) => ($disabled ? COLORS.gray400 : COLORS.gray700)};
  font-size: 15px;
  font-family: ${FONT.bold};
`;

const PrimaryButton = styled(TouchableOpacity)<{ $disabled: boolean }>`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 54px;
  border-radius: 15px;
  background-color: ${({ $disabled }) => ($disabled ? COLORS.gray200 : COLORS.coral500)};
  shadow-color: ${COLORS.coral500};
  shadow-opacity: ${({ $disabled }) => ($disabled ? 0 : 0.24)};
  shadow-radius: 20px;
  shadow-offset: 0px 8px;
  elevation: ${({ $disabled }) => ($disabled ? 0 : 6)};
`;

const PrimaryButtonLabel = styled(Text)`
  color: ${COLORS.white};
  font-size: 15px;
  font-family: ${FONT.bold};
`;

// "저장한 여행" 목록에서 일정을 열면 이 화면으로 온다. 예전엔 "일정 수정"을 누르면 방금 AI가
// 만든 일정을 보여주는 화면(ItineraryResultScreen)으로 이동시켜서 거기서 고치게 했는데,
// 그러면 화면이 "일정이 완성됐어요" 문구·진행 스텝 같은 생성 흐름 UI를 그대로 뒤집어쓴 채
// 나타나서 지금 하려는 게 "수정"인지 "새로 만들기"인지 헷갈렸다. 이제는 "일정 수정" 버튼이
// 이 화면 자체를 편집 모드로 바꿔서, 같은 화면 안에서 장소 추가·삭제·순서 변경을 하고
// 바로 저장한다.
export function SavedItineraryScreen({ itineraryId, onSaved }: SavedItineraryScreenProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [plan, setPlan] = useState<ItineraryPlan | null>(null);
  const [stops, setStops] = useState<ItineraryStop[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ItineraryStop | null>(null);
  const [editSaveState, setEditSaveState] = useState<'idle' | 'saving' | 'error'>('idle');

  const [showTitleModal, setShowTitleModal] = useState(false);
  const [titleSaveState, setTitleSaveState] = useState<'idle' | 'saving'>('idle');
  // 일차 탭 하나로 장소 리스트와 동선 섹션(지도·구간 거리)이 함께 갱신된다.
  const [selectedDay, setSelectedDay] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    getItineraryPlan(itineraryId)
      .then((result) => {
        if (cancelled) return;
        setPlan(result);
        setStops(result.stops);
        setStatus('done');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [itineraryId]);

  const stopIds = stops.map((s) => s.contentId);
  const { contents: stopContents } = useContentsByIds(stopIds);
  // 후보 장소 목록은 편집 모드에서 "장소 추가"를 눌러야만 필요하다 — 그냥 보기만 할 때도
  // 지역 전체 콘텐츠를 매번 불러오지 않도록 편집 모드에서만 활성화한다.
  const { contents: regionContents } = useContents(isEditing && plan ? [plan.region] : []);
  const contentById = useMemo(() => {
    const map = Object.fromEntries(regionContents.map((c) => [c.id, c]));
    for (const c of stopContents) map[c.id] = c;
    return map;
  }, [regionContents, stopContents]);
  const candidates = regionContents.filter((c) => !stopIds.includes(c.id));

  // totalDays는 지도·일차 탭(useItineraryRoutes)에도 필요해서, 로딩/에러 조기 return보다
  // 앞에 둬야 훅 호출 순서가 렌더마다 흔들리지 않는다. plan이 아직 없으면(로딩 중) 1로 둔다 —
  // 이 값은 그 상태에서 화면에 그려지지 않으므로 실제로 쓰이진 않는다.
  const totalDays = plan
    ? plan.duration != null
      ? plan.duration + 1
      : Math.max(1, ...stops.map((s) => s.day))
    : 1;
  const { routeByDay } = useItineraryRoutes(stops, contentById, totalDays);
  const activeDay = Math.min(selectedDay, totalDays);

  // updateItineraryPlan은 PATCH로 일정 전체(제목 포함)를 다시 보내는 방식이라, 이름만 바꿀 때도
  // days[].items의 title을 채워야 한다 — 편집 저장(handleSaveEdits)과 이름 저장(handleConfirmTitle)
  // 둘 다 이 매핑이 필요해서 공통으로 뺐다.
  const buildTitleByContentId = () =>
    Object.fromEntries(stops.map((s) => [s.contentId, contentById[s.contentId]?.name ?? '']));

  const handleShare = async () => {
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

  const handleStartEdit = () => {
    setIsEditing(true);
    setIsAddingPlace(false);
    setEditSaveState('idle');
  };

  const handleCancelEdit = () => {
    // 저장을 안 눌렀으니 지금까지 편집 중이던 변경사항은 버리고 원래 저장된 내용으로 되돌린다.
    if (plan) setStops(plan.stops);
    setIsEditing(false);
    setIsAddingPlace(false);
    setEditSaveState('idle');
  };

  const handleSaveEdits = async () => {
    if (!plan) return;
    // days[].items는 서버에서 빈 배열을 거부한다(@NotEmpty). 모든 장소를 지운 채로
    // 저장하면 그대로 검증 실패로 이어지므로, 요청을 보내기 전에 미리 막는다.
    if (stops.length === 0) {
      Alert.alert('저장할 장소가 없어요', '일정에서 장소를 모두 지우면 저장할 수 없어요.');
      return;
    }
    setEditSaveState('saving');
    try {
      const saved = await updateItineraryPlan(itineraryId, {
        title: plan.title,
        region: plan.region,
        travelDate: plan.travelDate,
        duration: plan.duration,
        stops,
        titleByContentId: buildTitleByContentId(),
      });
      setPlan(saved);
      setStops(saved.stops);
      setIsEditing(false);
      setIsAddingPlace(false);
      setEditSaveState('idle');
      // "저장한 여행" 카드 사진은 첫 방문지 콘텐츠를 기준으로 캐시돼 있다(useItineraryFirstStopPhotos).
      // 방문지 순서를 바꾸거나 첫 방문지를 지웠는데 이 캐시를 그대로 두면, 홈은 루트 스택
      // 아래에 계속 마운트돼 있어 refetchOnMount도 안 타서 gc되거나 앱을 재시작하기 전까지
      // 예전 첫 방문지의 사진이 계속 보인다 — 저장 성공 시점에 직접 무효화해 새 첫 방문지
      // 기준으로 다시 가져오게 한다.
      queryClient.invalidateQueries({ queryKey: ['itinerary-first-stop', itineraryId] });
      onSaved?.({
        itineraryId,
        title: saved.title,
        region: saved.region,
        travelDate: saved.travelDate,
        duration: saved.duration,
        savedAt: new Date().toISOString(),
      });
    } catch (error) {
      // 원인을 남기지 않으면 서버 응답인지 네트워크 문제인지 구분할 수 없다.
      console.warn('[itinerary] 일정 수정 저장 실패', { itineraryId, error });
      setEditSaveState('error');
      Alert.alert('저장 실패', toErrorMessage(error, '잠시 후 다시 시도해주세요.'));
    }
  };

  // 장소 편집과 별개로, 일정 제목만 따로 고칠 수 있게 한다(헤더의 연필 아이콘 → 모달).
  // 장소 편집 중일 때는 아직 저장 안 된 stops가 섞여 있을 수 있어 연필 버튼 자체를 숨긴다
  // (JSX 쪽에서 isEditing이면 렌더링하지 않음).
  const handleConfirmTitle = async (title: string) => {
    if (!plan) return;
    setTitleSaveState('saving');
    try {
      const saved = await updateItineraryPlan(itineraryId, {
        title,
        region: plan.region,
        travelDate: plan.travelDate,
        duration: plan.duration,
        stops,
        titleByContentId: buildTitleByContentId(),
      });
      setPlan(saved);
      setStops(saved.stops);
      setShowTitleModal(false);
      onSaved?.({
        itineraryId,
        title: saved.title,
        region: saved.region,
        travelDate: saved.travelDate,
        duration: saved.duration,
        savedAt: new Date().toISOString(),
      });
    } catch (error) {
      // 원인을 남기지 않으면 서버 응답인지 네트워크 문제인지 구분할 수 없다.
      console.warn('[itinerary] 일정 이름 변경 실패', { itineraryId, error });
      Alert.alert('이름 변경 실패', toErrorMessage(error, '잠시 후 다시 시도해주세요.'));
    } finally {
      setTitleSaveState('idle');
    }
  };

  if (status === 'loading') {
    return (
      <ScreenContainer edges={['bottom', 'left', 'right']}>
        <Header>
          <SkeletonBox width="60%" height={20} radius={4} />
        </Header>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <ItineraryStopSkeleton />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (status === 'error' || !plan) {
    return (
      <ScreenContainer edges={['bottom', 'left', 'right']}>
        <CenterBox>
          <Subtitle>일정을 불러오지 못했어요.</Subtitle>
          <RetryButton onPress={() => setStatus('loading')} activeOpacity={0.8}>
            <RetryLabel>다시 시도</RetryLabel>
          </RetryButton>
        </CenterBox>
      </ScreenContainer>
    );
  }

  const regionName = REGIONS.find((r) => r.id === plan.region)?.name ?? null;
  const dateRange = formatDateRange(plan.travelDate, plan.duration);
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
  const activeDayDate = plan.travelDate
    ? addDays(fromDateString(plan.travelDate), activeDay - 1)
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
      <Header>
        <TitleRow>
          <Title numberOfLines={1}>{plan.title}</Title>
          {!isEditing && (
            <TitleEditButton
              onPress={() => setShowTitleModal(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={16} color={COLORS.gray500} />
            </TitleEditButton>
          )}
        </TitleRow>
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
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {(regionName || dateRange) && (
          <SummaryCard>
            {regionName && (
              <SummaryItem>
                <Ionicons name="location-outline" size={13} color={COLORS.coral700} />
                <SummaryText>{regionName}</SummaryText>
              </SummaryItem>
            )}
            {dateRange && (
              <>
                {regionName && <SummaryDivider />}
                <SummaryItem>
                  <Ionicons name="calendar-outline" size={13} color={COLORS.coral700} />
                  <SummaryText>{dateRange}</SummaryText>
                </SummaryItem>
              </>
            )}
            <SummaryDivider />
            <SummaryText>총 {stops.length}곳</SummaryText>
          </SummaryCard>
        )}

        {isEditing && (
          <EditingBanner>
            <Ionicons name="create-outline" size={14} color={COLORS.coral700} />
            <EditingBannerText>
              장소 오른쪽 ▲▼로 순서를, ×로 제거를, "+ 장소 추가"로 새 장소를 넣을 수 있어요. 끝나면
              아래 "변경사항 저장"을 눌러주세요.
            </EditingBannerText>
          </EditingBanner>
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
                    {category && (
                      <NameRow style={{ marginBottom: 0 }}>
                        <CategoryBadge>
                          <CategoryLabel>{category.label}</CategoryLabel>
                        </CategoryBadge>
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
                  {isEditing && (
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
                  )}
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
        {isEditing && (
          <>
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
          </>
        )}

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
          {isEditing ? (
            <ButtonRow>
              <SecondaryButton
                onPress={handleCancelEdit}
                activeOpacity={0.8}
                disabled={editSaveState === 'saving'}
                $disabled={editSaveState === 'saving'}
              >
                <SecondaryButtonLabel $disabled={editSaveState === 'saving'}>
                  취소
                </SecondaryButtonLabel>
              </SecondaryButton>
              <PrimaryButton
                onPress={handleSaveEdits}
                activeOpacity={0.8}
                disabled={editSaveState === 'saving' || stops.length === 0}
                $disabled={editSaveState === 'saving' || stops.length === 0}
              >
                <PrimaryButtonLabel>
                  {editSaveState === 'saving' ? '저장 중...' : '변경사항 저장'}
                </PrimaryButtonLabel>
              </PrimaryButton>
            </ButtonRow>
          ) : (
            <ButtonRow>
              <SecondaryButton onPress={handleStartEdit} activeOpacity={0.8}>
                <Ionicons name="create-outline" size={16} color={COLORS.gray700} />
                <SecondaryButtonLabel>일정 수정</SecondaryButtonLabel>
              </SecondaryButton>
              <PrimaryButton
                onPress={handleShare}
                activeOpacity={0.8}
                disabled={isSharing}
                $disabled={isSharing}
              >
                {!isSharing && <Ionicons name="share-outline" size={16} color={COLORS.white} />}
                <PrimaryButtonLabel>
                  {isSharing ? '공유 링크 만드는 중...' : '일정 공유'}
                </PrimaryButtonLabel>
              </PrimaryButton>
            </ButtonRow>
          )}
        </BottomBar>
      </BottomBarWrap>
      <ItineraryTitleModal
        visible={showTitleModal}
        initialTitle={plan.title}
        isSaving={titleSaveState === 'saving'}
        heading="일정 이름을 수정해주세요"
        subtitle="저장한 여행 목록에도 바로 반영돼요"
        onConfirm={handleConfirmTitle}
        onClose={() => setShowTitleModal(false)}
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
