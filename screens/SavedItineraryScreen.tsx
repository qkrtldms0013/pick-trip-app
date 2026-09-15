import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components';
import { SkeletonBox } from '../components/atoms/SkeletonBox';
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
import { addDays, formatDateRange, formatDayDate, fromDateString } from '../utils/tripDate';

interface SavedItineraryScreenProps {
  itineraryId: string;
  // 저장에 성공하면 홈/마이페이지 목록도 같이 최신화할 수 있도록 알려준다. 목록 화면이 없는
  // 경로(딥링크 등)에서는 안 넘겨도 되게 선택값으로 둔다.
  onSaved?: (summary: SavedItinerarySummary) => void;
}

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

// 이 화면은 네이티브 스택 헤더(RootNavigator의 headerScreenOptions)가 이미 위에 떠 있다.
// 그 아래에 padding-top을 또 주면 헤더와 본문 사이가 붕 떠 보여서, 여기서는 0으로 둔다.
const Header = styled(View)`
  padding-horizontal: 20px;
  padding-bottom: 4px;
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

const SummaryCard = styled(View)`
  background-color: ${COLORS.white};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  margin: 16px 20px 4px;
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
  font-family: ${FONT.semibold};
  color: ${COLORS.gray900};
`;

const SummaryDivider = styled(View)`
  width: 1px;
  height: 12px;
  background-color: ${COLORS.gray200};
`;

const EditingBanner = styled(View)`
  flex-direction: row;
  align-items: center;
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

const DayHeaderRow = styled(View)`
  flex-direction: row;
  align-items: baseline;
  gap: 10px;
  margin: 20px 20px 12px;
`;

const DayBadge = styled(View)`
  background-color: ${COLORS.gray900};
  border-radius: 100px;
  padding-vertical: 4px;
  padding-horizontal: 12px;
`;

const DayBadgeLabel = styled(Text)`
  color: ${COLORS.white};
  font-size: 13px;
  font-family: ${FONT.bold};
`;

const DayMeta = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 13px;
  color: ${COLORS.gray500};
`;

const StopRow = styled(View)`
  flex-direction: row;
  gap: 14px;
  padding-horizontal: 20px;
  margin-bottom: 18px;
`;

const TimeColumn = styled(View)`
  align-items: center;
  width: 52px;
  position: relative;
`;

const TimeText = styled(Text)`
  font-size: 13px;
  font-family: ${FONT.semibold};
  color: ${COLORS.gray700};
`;

const TimeDot = styled(View)`
  width: 7px;
  height: 7px;
  border-radius: 100px;
  background-color: ${COLORS.coral500};
  margin-top: 6px;
`;

const TimeConnector = styled(View)`
  flex: 1;
  width: 2px;
  background-color: ${COLORS.gray200};
  margin-top: 4px;
`;

// TimeConnector 위에 겹쳐 그리는 구간 거리 라벨. ItineraryResultScreen과 같은 패턴.
// RN의 transform은 퍼센트 값을 못 받아서(translateY(-50%) 같은 건 파싱 자체가 실패한다),
// 폰트 크기 기준 고정 px로 절반만큼 올린다.
const HopDistanceLabel = styled(Text)`
  position: absolute;
  top: 50%;
  margin-top: -6px;
  width: 52px;
  text-align: center;
  font-size: 10px;
  font-family: ${FONT.medium};
  color: ${COLORS.gray400};
`;

const StopCard = styled(View)`
  flex: 1;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  border-radius: 12px;
  padding: 14px 16px;
  background-color: ${COLORS.white};
`;

const CategoryBadge = styled(View)<{ $color: string }>`
  flex-direction: row;
  align-items: center;
  gap: 3px;
  align-self: flex-start;
  background-color: ${({ $color }) => `${$color}1F`};
  border-radius: 100px;
  padding-vertical: 2px;
  padding-horizontal: 8px;
  margin-bottom: 6px;
`;

const CategoryLabel = styled(Text)<{ $color: string }>`
  font-size: 11px;
  font-family: ${FONT.semibold};
  color: ${({ $color }) => $color};
`;

const StopName = styled(Text)`
  font-size: 16px;
  font-family: ${FONT.semibold};
  color: ${COLORS.gray900};
`;

const StopAddress = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray500};
  margin-top: 2px;
`;

const ReasonBox = styled(View)`
  flex-direction: row;
  gap: 6px;
  background-color: ${COLORS.teal50};
  border-radius: 8px;
  padding: 8px 10px;
  margin-top: 10px;
`;

const ReasonText = styled(Text)`
  font-family: ${FONT.regular};
  flex: 1;
  font-size: 12px;
  color: ${COLORS.teal700};
  line-height: 17px;
`;

const ActionRow = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
`;

const ActionButton = styled(TouchableOpacity)`
  padding-vertical: 6px;
  padding-horizontal: 12px;
  border-radius: 8px;
  background-color: ${COLORS.gray100};
`;

const ActionLabel = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 13px;
  color: ${COLORS.gray700};
`;

const DeleteButton = styled(TouchableOpacity)`
  margin-left: auto;
  padding-vertical: 6px;
  padding-horizontal: 12px;
  border-radius: 8px;
  border-width: 1px;
  border-color: ${COLORS.error};
`;

const DeleteLabel = styled(Text)`
  font-size: 13px;
  color: ${COLORS.error};
  font-family: ${FONT.medium};
`;

const AddButton = styled(TouchableOpacity)`
  margin-horizontal: 20px;
  margin-bottom: 16px;
  padding-vertical: 12px;
  border-radius: 10px;
  border-width: 1.5px;
  border-style: dashed;
  border-color: ${COLORS.coral500};
  background-color: ${COLORS.coral50};
  align-items: center;
`;

const AddButtonLabel = styled(Text)`
  font-size: 14px;
  color: ${COLORS.coral700};
  font-family: ${FONT.semibold};
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

const StatsCard = styled(View)`
  flex-direction: row;
  background-color: ${COLORS.white};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  margin: 8px 20px 16px;
  padding: 16px 0;
`;

const StatItem = styled(View)`
  flex: 1;
  align-items: center;
  gap: 4px;
`;

const StatDivider = styled(View)`
  width: 1px;
  background-color: ${COLORS.gray200};
`;

const StatValue = styled(Text)`
  font-size: 16px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
`;

const StatLabel = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 11px;
  color: ${COLORS.gray500};
`;

const ButtonRow = styled(View)`
  flex-direction: row;
  gap: 10px;
  margin-horizontal: 20px;
  margin-bottom: 24px;
`;

const SecondaryButton = styled(TouchableOpacity)<{ $disabled?: boolean }>`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-vertical: 14px;
  border-radius: 12px;
  background-color: ${COLORS.white};
  border-width: 1px;
  border-color: ${({ $disabled }) => ($disabled ? COLORS.gray100 : COLORS.gray200)};
`;

const SecondaryButtonLabel = styled(Text)<{ $disabled?: boolean }>`
  color: ${({ $disabled }) => ($disabled ? COLORS.gray400 : COLORS.gray700)};
  font-size: 16px;
  font-family: ${FONT.medium};
`;

const PrimaryButton = styled(TouchableOpacity)<{ $disabled: boolean }>`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-vertical: 14px;
  border-radius: 12px;
  background-color: ${({ $disabled }) => ($disabled ? COLORS.gray200 : COLORS.coral500)};
`;

const PrimaryButtonLabel = styled(Text)`
  color: ${COLORS.white};
  font-size: 16px;
  font-family: ${FONT.medium};
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
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [editSaveState, setEditSaveState] = useState<'idle' | 'saving' | 'error'>('idle');

  const [showTitleModal, setShowTitleModal] = useState(false);
  const [titleSaveState, setTitleSaveState] = useState<'idle' | 'saving'>('idle');
  const [selectedRouteDay, setSelectedRouteDay] = useState(1);

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
  const activeRouteDay = Math.min(selectedRouteDay, totalDays);

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
    setExpandedDay(null);
    setEditSaveState('idle');
  };

  const handleCancelEdit = () => {
    // 저장을 안 눌렀으니 지금까지 편집 중이던 변경사항은 버리고 원래 저장된 내용으로 되돌린다.
    if (plan) setStops(plan.stops);
    setIsEditing(false);
    setExpandedDay(null);
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
      setExpandedDay(null);
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
      <ScreenContainer>
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
      <ScreenContainer>
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
  // 일차별 총거리(routeByDay가 있으면 그 값, 없으면 직선거리)를 다 더한다.
  const totalTripDistanceKm = dayList.reduce((sum, day) => {
    const route = routeByDay[day];
    if (route) return sum + route.totalDistanceKm;
    const dayStops = stops.filter((stop) => stop.day === day);
    return sum + sumDistanceKm(computeDayHops(dayStops, contentById));
  }, 0);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
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
        </Header>

        {(regionName || dateRange) && (
          <SummaryCard>
            {regionName && (
              <SummaryItem>
                <Ionicons name="location-outline" size={13} color={COLORS.gray900} />
                <SummaryText>{regionName}</SummaryText>
              </SummaryItem>
            )}
            {dateRange && (
              <>
                {regionName && <SummaryDivider />}
                <SummaryItem>
                  <Ionicons name="calendar-outline" size={13} color={COLORS.gray900} />
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
              장소 오른쪽 ▲▼로 순서를, 삭제로 제거를, "+ 장소 추가"로 새 장소를 넣을 수 있어요.
              끝나면 아래 "변경사항 저장"을 눌러주세요.
            </EditingBannerText>
          </EditingBanner>
        )}

        {dayList.map((day) => {
          const dayStops = stops.filter((stop) => stop.day === day);
          const dayDate = plan.travelDate
            ? addDays(fromDateString(plan.travelDate), day - 1)
            : null;
          // 실도로 거리(routeByDay)가 아직 없으면 좌표로 즉석 계산한 직선거리로 채운다 —
          // routeDistanceService.ts 상단 TODO 참고.
          const dayRoute = routeByDay[day];
          const dayLegs =
            dayRoute?.legs ??
            computeDayHops(dayStops, contentById).map((hop) => ({
              ...hop,
              durationMinutes: null as number | null,
            }));
          return (
            <View key={day}>
              <DayHeaderRow>
                <DayBadge>
                  <DayBadgeLabel>{day}일차</DayBadgeLabel>
                </DayBadge>
                <DayMeta>
                  {dayDate ? `${formatDayDate(dayDate)} · ` : ''}
                  {dayStops.length}곳
                </DayMeta>
              </DayHeaderRow>
              {dayStops.map((stop, index) => {
                const content = contentById[stop.contentId];
                const category = content && CATEGORIES.find((c) => c.id === content.category);
                const accentColor = category?.color ?? COLORS.gray500;
                // dayLegs를 index로 바로 집으면 안 된다 — ItineraryResultScreen과 같은 이유로,
                // 좌표 미상 콘텐츠가 낀 구간은 배열에서 빠지며 압축되므로 dayStops 위치 기준과
                // 어긋난다. fromContentId로 이 정류지에서 출발하는 구간을 직접 찾는다.
                const hopToNext = dayLegs.find((leg) => leg.fromContentId === stop.contentId);
                return (
                  <StopRow key={stop.contentId}>
                    <TimeColumn>
                      <TimeText numberOfLines={1}>{stop.startTime}</TimeText>
                      <TimeDot />
                      {index < dayStops.length - 1 && (
                        <>
                          <TimeConnector />
                          {hopToNext && (
                            <HopDistanceLabel>{hopToNext.distanceKm.toFixed(1)}km</HopDistanceLabel>
                          )}
                        </>
                      )}
                    </TimeColumn>
                    <StopCard>
                      {category && (
                        <CategoryBadge $color={accentColor}>
                          <Ionicons name={category.icon} size={11} color={accentColor} />
                          <CategoryLabel $color={accentColor}>{category.label}</CategoryLabel>
                        </CategoryBadge>
                      )}
                      <StopName>{content?.name}</StopName>
                      {content?.address && (
                        <StopAddress numberOfLines={1}>{content.address}</StopAddress>
                      )}
                      <ReasonBox>
                        <Ionicons name="sparkles" size={13} color={COLORS.teal700} />
                        <ReasonText>{stop.reason}</ReasonText>
                      </ReasonBox>
                      {isEditing && (
                        <ActionRow>
                          <ActionButton
                            onPress={() => setStops((prev) => moveStop(prev, stop.contentId, 'up'))}
                          >
                            <ActionLabel>▲</ActionLabel>
                          </ActionButton>
                          <ActionButton
                            onPress={() =>
                              setStops((prev) => moveStop(prev, stop.contentId, 'down'))
                            }
                          >
                            <ActionLabel>▼</ActionLabel>
                          </ActionButton>
                          <DeleteButton
                            onPress={() => setStops((prev) => removeStop(prev, stop.contentId))}
                          >
                            <DeleteLabel>삭제</DeleteLabel>
                          </DeleteButton>
                        </ActionRow>
                      )}
                    </StopCard>
                  </StopRow>
                );
              })}
              {isEditing && (
                <>
                  <AddButton onPress={() => setExpandedDay((prev) => (prev === day ? null : day))}>
                    <AddButtonLabel>+ 장소 추가</AddButtonLabel>
                  </AddButton>
                  {expandedDay === day &&
                    candidates.map((candidate) => (
                      <CandidateRow
                        key={candidate.id}
                        onPress={() => {
                          setStops((prev) => addStop(prev, candidate.id, day));
                          setExpandedDay(null);
                        }}
                      >
                        <CandidateName>{candidate.name}</CandidateName>
                      </CandidateRow>
                    ))}
                </>
              )}
            </View>
          );
        })}

        <ItineraryRouteMap
          stops={stops}
          contentById={contentById}
          routeByDay={routeByDay}
          totalDays={totalDays}
          selectedDay={activeRouteDay}
          onSelectDay={setSelectedRouteDay}
        />
        <ItineraryDayDistanceList
          day={activeRouteDay}
          dayStops={stops.filter((stop) => stop.day === activeRouteDay)}
          contentById={contentById}
          route={routeByDay[activeRouteDay] ?? null}
        />

        <StatsCard>
          <StatItem>
            <StatValue>{totalDays}일</StatValue>
            <StatLabel>기간</StatLabel>
          </StatItem>
          <StatDivider />
          <StatItem>
            <StatValue>{stops.length}곳</StatValue>
            <StatLabel>방문지</StatLabel>
          </StatItem>
          <StatDivider />
          <StatItem>
            <StatValue>{regionName ?? '-'}</StatValue>
            <StatLabel>지역</StatLabel>
          </StatItem>
          <StatDivider />
          <StatItem>
            <StatValue>{totalTripDistanceKm.toFixed(1)}km</StatValue>
            <StatLabel>총 이동거리</StatLabel>
          </StatItem>
        </StatsCard>
      </ScrollView>
      {isEditing ? (
        <ButtonRow>
          <SecondaryButton
            onPress={handleCancelEdit}
            activeOpacity={0.8}
            disabled={editSaveState === 'saving'}
            $disabled={editSaveState === 'saving'}
          >
            <SecondaryButtonLabel $disabled={editSaveState === 'saving'}>취소</SecondaryButtonLabel>
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
      <ItineraryTitleModal
        visible={showTitleModal}
        initialTitle={plan.title}
        isSaving={titleSaveState === 'saving'}
        heading="일정 이름을 수정해주세요"
        subtitle="저장한 여행 목록에도 바로 반영돼요"
        onConfirm={handleConfirmTitle}
        onClose={() => setShowTitleModal(false)}
      />
    </ScreenContainer>
  );
}
