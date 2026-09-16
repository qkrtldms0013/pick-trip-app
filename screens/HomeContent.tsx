import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { FavoriteButton } from '../components/atoms/FavoriteButton';
import { SavedTripCard } from '../components/molecules/SavedTripCard';
import {
  TripDatePickerModal,
  type TripDateValue,
} from '../components/molecules/TripDatePickerModal';
import { CATEGORIES } from '../constants/categories';
import { COLORS } from '../constants/colors';
import { TAB_BAR_CLEARANCE } from '../constants/layout';
import { REGIONS } from '../constants/regions';
import { FONT } from '../constants/typography';
import { useContents } from '../hooks/useContents';
import { useContentsByIds } from '../hooks/useContentsByIds';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useItineraryFirstStopPhotos } from '../hooks/useItineraryFirstStopPhotos';
import { useItineraryShare } from '../hooks/useItineraryShare';
import type { SavedItinerarySummary } from '../services/itineraryHistoryStorage';
// 이 파일에 이미 스타일 컴포넌트 `Content`가 있어서 타입 이름을 바꿔 가져온다.
import type { Content as ContentItem } from '../types/content';
import { shuffle } from '../utils/shuffle';

interface HomeContentProps {
  isGuest: boolean;
  selectedRegions: string[];
  selectedIds: string[];
  tripDate: TripDateValue | null;
  itineraryHistory: SavedItinerarySummary[];
  openingItineraryId: string | null;
  onOpenItinerary: (itineraryId: string) => void;
  onDeleteItinerary: (itineraryId: string, title: string) => void;
  // "저장한 여행" 섹션의 "전체보기" — 전체 목록 화면(SavedTripsScreen)으로 이동한다.
  onOpenSavedTrips: () => void;
  onBrowse: () => void;
  onOpenBasket: () => void;
  onLogin: () => void;
  onSelectDate: (value: TripDateValue) => void;
  favoriteIds: string[];
  onToggleFavorite: (content: ContentItem) => void;
  onOpenFavorites: () => void;
  onPressDetail: (contentId: string) => void;
  // 추천 콘텐츠 카드의 "담기" 버튼 — 바구니에 담기/빼기.
  onToggle: (content: ContentItem) => void;
  // 이 기기에서 최근에 연 콘텐츠 id 목록(최신순). services/recentlyViewedStorage.ts 참고.
  recentlyViewedIds: string[];
  // "어디부터 둘러볼까요?" 지역 카드를 탭하면 그 지역 하나로 선택을 바꾼다(단일 선택).
  onSelectRegion: (regionId: string) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}

const Scroll = styled(ScrollView)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

const HeaderSection = styled(View)`
  background-color: ${COLORS.coral500};
  padding: 32px 20px 56px;
  border-bottom-left-radius: 28px;
  border-bottom-right-radius: 28px;
`;

const LoginBar = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(255, 255, 255, 0.18);
  border-radius: 100px;
  padding: 6px 6px 6px 16px;
  margin-bottom: 20px;
`;

const LoginBarText = styled(Text)`
  font-size: 13px;
  font-family: ${FONT.medium};
  color: ${COLORS.white};
`;

const LoginBarButton = styled(View)`
  background-color: ${COLORS.white};
  border-radius: 100px;
  padding-vertical: 6px;
  padding-horizontal: 14px;
`;

const LoginBarButtonLabel = styled(Text)`
  font-size: 12px;
  font-family: ${FONT.bold};
  color: ${COLORS.coral600};
`;

const Greeting = styled(Text)`
  font-size: 22px;
  font-family: ${FONT.bold};
  color: ${COLORS.white};
  letter-spacing: -0.3px;
  margin-bottom: 4px;
`;

const GreetingSub = styled(Text)`
  flex: 1;
  font-family: ${FONT.regular};
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
`;

const GreetingSubRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const FavoritesEntryButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  background-color: rgba(255, 255, 255, 0.18);
  border-radius: 100px;
  padding-vertical: 5px;
  padding-horizontal: 10px;
`;

const FavoritesEntryLabel = styled(Text)`
  font-family: ${FONT.semibold};
  font-size: 12px;
  color: ${COLORS.white};
`;

// 하단 여백은 플로팅 탭바가 가리는 높이를 확보한다.
const Content = styled(View)`
  padding: 0 20px ${TAB_BAR_CLEARANCE}px;
`;

const StatusCard = styled(View)`
  background-color: ${COLORS.white};
  border-radius: 18px;
  padding: 18px;
  margin-top: -32px;
  margin-bottom: 24px;
  shadow-color: #000;
  shadow-opacity: 0.08;
  shadow-radius: 12px;
  shadow-offset: 0px 4px;
  elevation: 3;
`;

const StatusRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
`;

const StatusLabelRow = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const StatusIconBadge = styled(View)`
  width: 30px;
  height: 30px;
  border-radius: 100px;
  background-color: ${COLORS.coral50};
  align-items: center;
  justify-content: center;
`;

const StatusLabel = styled(Text)`
  font-size: 15px;
  font-family: ${FONT.semibold};
  color: ${COLORS.gray900};
`;

const StatusCount = styled(Text)`
  font-size: 14px;
  font-family: ${FONT.semibold};
  color: ${COLORS.coral600};
`;

const RegionBadgeRow = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
`;

const RegionBadge = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 3px;
  background-color: ${COLORS.gray100};
  border-radius: 100px;
  padding-vertical: 4px;
  padding-horizontal: 10px;
`;

const RegionBadgeLabel = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray700};
`;

const DateRow = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  background-color: ${COLORS.gray50};
  border-radius: 12px;
  padding-vertical: 12px;
  padding-horizontal: 14px;
  margin-bottom: 16px;
`;

const DateRowLeft = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const DateRowText = styled(Text)<{ $placeholder: boolean }>`
  font-family: ${FONT.regular};
  font-size: 14px;
  color: ${({ $placeholder }) => ($placeholder ? COLORS.gray500 : COLORS.gray900)};
`;

const PrimaryButton = styled(TouchableOpacity)`
  background-color: ${COLORS.coral500};
  border-radius: 10px;
  padding-vertical: 12px;
  align-items: center;
  flex-direction: row;
  justify-content: center;
  gap: 6px;
`;

const PrimaryButtonLabel = styled(Text)`
  color: ${COLORS.white};
  font-size: 14px;
  font-family: ${FONT.semibold};
`;

const SecondaryButton = styled(TouchableOpacity)`
  margin-top: 8px;
  border-radius: 10px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  padding-vertical: 12px;
  align-items: center;
`;

const SecondaryButtonLabel = styled(Text)`
  color: ${COLORS.gray700};
  font-size: 14px;
  font-family: ${FONT.semibold};
`;

const TripRow = styled(ScrollView)``;

// SavedTripCard 자체는 폭을 안 정하므로, 홈의 가로 스크롤 목록에 맞는 고정폭 +
// 카드 사이 간격만 여기서 감싸서 정한다.
const TripCardWrapper = styled(View)`
  width: 248px;
  margin-right: 12px;
`;

const SectionHead = styled(View)`
  margin-bottom: 12px;
`;

// FOR YOU 섹션처럼 왼쪽 제목 묶음과 오른쪽 "더보기 →"를 한 줄에 나란히 두는 헤더.
const SectionHeadRow = styled(View)`
  flex-direction: row;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const SectionTitleRow = styled(View)`
  flex-direction: row;
  align-items: baseline;
  gap: 6px;
`;

const SectionMeta = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 11.5px;
  color: ${COLORS.gray400};
`;

const SectionSubtitle = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray500};
  margin-top: 3px;
`;

const MoreLink = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  gap: 2px;
`;

const MoreLinkLabel = styled(Text)`
  font-family: ${FONT.semibold};
  font-size: 11.5px;
  color: ${COLORS.gray500};
`;

const SectionEyebrow = styled(Text)`
  font-size: 11px;
  font-family: ${FONT.semibold};
  color: ${COLORS.coral600};
  letter-spacing: 0.5px;
  margin-bottom: 3px;
`;

const SectionTitle = styled(Text)`
  font-size: 17px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
  letter-spacing: -0.2px;
`;

// --- 지역 둘러보기 ("어디부터 둘러볼까요?") ---

const RegionRow = styled(ScrollView)``;

const REGION_CARD_WIDTH = 200;

const RegionCard = styled(TouchableOpacity)<{ $selected: boolean }>`
  width: ${REGION_CARD_WIDTH}px;
  background-color: ${COLORS.white};
  border-radius: 18px;
  border-width: ${({ $selected }) => ($selected ? '2px' : '1px')};
  border-color: ${({ $selected }) => ($selected ? COLORS.coral500 : COLORS.gray200)};
  overflow: hidden;
  margin-right: 12px;
`;

const RegionPhoto = styled(View)<{ $color: string }>`
  height: 124px;
  background-color: ${({ $color }) => `${$color}55`};
  align-items: center;
  justify-content: center;
`;

const RegionPhotoImage = styled(Image)`
  height: 124px;
  width: 100%;
`;

const RegionBody = styled(View)`
  padding: 13px 14px 15px;
`;

const RegionAccentBar = styled(View)`
  width: 12px;
  height: 3px;
  border-radius: 100px;
  background-color: ${COLORS.coral500};
  margin-bottom: 6px;
`;

const RegionRomanLabel = styled(Text)`
  font-family: ${FONT.semibold};
  font-size: 10.5px;
  letter-spacing: 1px;
  color: ${COLORS.gray500};
  margin-bottom: 3px;
`;

const RegionName = styled(Text)`
  font-family: ${FONT.bold};
  font-size: 16px;
  color: ${COLORS.gray900};
  margin-bottom: 4px;
`;

const RegionTagline = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 11px;
  line-height: 16px;
  color: ${COLORS.gray500};
  margin-bottom: 8px;
`;

const RegionCardLink = styled(Text)<{ $selected: boolean }>`
  font-family: ${FONT.semibold};
  font-size: 11.5px;
  color: ${({ $selected }) => ($selected ? COLORS.coral600 : COLORS.gray400)};
`;

// --- 추천 콘텐츠 (FOR YOU) ---

const RecommendRow = styled(ScrollView)``;

const RECOMMEND_CARD_WIDTH = 258;
const RECOMMEND_PHOTO_HEIGHT = 168;

const RecommendCard = styled(TouchableOpacity)`
  width: ${RECOMMEND_CARD_WIDTH}px;
  background-color: ${COLORS.white};
  border-radius: 18px;
  overflow: hidden;
  margin-right: 14px;
  shadow-color: #000;
  shadow-opacity: 0.06;
  shadow-radius: 10px;
  shadow-offset: 0px 2px;
  elevation: 2;
`;

const RecommendPhotoWrap = styled(View)`
  position: relative;
`;

const RecommendThumb = styled(View)<{ $color: string }>`
  height: ${RECOMMEND_PHOTO_HEIGHT}px;
  background-color: ${({ $color }) => `${$color}33`};
  align-items: center;
  justify-content: center;
`;

const RecommendImage = styled(Image)`
  height: ${RECOMMEND_PHOTO_HEIGHT}px;
  width: 100%;
`;

const RecommendCategoryBadge = styled(View)`
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: ${COLORS.coral500};
  border-radius: 7px;
  padding-vertical: 4px;
  padding-horizontal: 9px;
`;

const RecommendCategoryLabel = styled(Text)`
  font-family: ${FONT.semibold};
  font-size: 10.5px;
  color: ${COLORS.white};
`;

const RecommendFavoriteBadge = styled(View)`
  position: absolute;
  top: 8px;
  right: 8px;
`;

const RecommendBody = styled(View)`
  padding: 12px;
`;

const RecommendName = styled(Text)`
  font-size: 15px;
  font-family: ${FONT.semibold};
  color: ${COLORS.gray900};
  margin-bottom: 3px;
`;

const RecommendAddress = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 11.5px;
  color: ${COLORS.gray400};
  margin-bottom: 10px;
`;

const RecommendAddButton = styled(TouchableOpacity)<{ $active: boolean }>`
  height: 40px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  flex-direction: row;
  gap: 4px;
  background-color: ${({ $active }) => ($active ? COLORS.coral500 : COLORS.coral50)};
`;

const RecommendAddButtonLabel = styled(Text)<{ $active: boolean }>`
  font-family: ${FONT.semibold};
  font-size: 13px;
  color: ${({ $active }) => ($active ? COLORS.white : COLORS.coral600)};
`;

// --- 최근에 본 ---

const RecentList = styled(View)`
  background-color: ${COLORS.white};
  border-radius: 16px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  overflow: hidden;
`;

const RecentRow = styled(TouchableOpacity)<{ $first: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 13px 14px;
  border-top-width: ${({ $first }) => ($first ? '0px' : '1px')};
  border-top-color: ${COLORS.gray100};
`;

const RecentThumbImage = styled(Image)`
  width: 44px;
  height: 44px;
  border-radius: 12px;
`;

const RecentThumbPlaceholder = styled(View)<{ $color: string }>`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: ${({ $color }) => `${$color}33`};
  align-items: center;
  justify-content: center;
`;

const RecentBody = styled(View)`
  flex: 1;
`;

const RecentName = styled(Text)`
  font-family: ${FONT.semibold};
  font-size: 13.5px;
  color: ${COLORS.gray900};
  margin-bottom: 2px;
`;

const RecentAddress = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 11px;
  color: ${COLORS.gray400};
`;

// 홈에서 미리보기로 보여줄 "최근에 본" 최대 개수.
const RECENTLY_VIEWED_PREVIEW_COUNT = 3;

export function HomeContent({
  isGuest,
  selectedRegions,
  selectedIds,
  tripDate,
  itineraryHistory,
  openingItineraryId,
  onOpenItinerary,
  onDeleteItinerary,
  onOpenSavedTrips,
  onBrowse,
  onOpenBasket,
  onLogin,
  onSelectDate,
  favoriteIds,
  onToggleFavorite,
  onOpenFavorites,
  onPressDetail,
  onToggle,
  recentlyViewedIds,
  onSelectRegion,
}: HomeContentProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const count = selectedIds.length;
  const regionNames = REGIONS.filter((r) => selectedRegions.includes(r.id)).map((r) => r.name);

  // "어디부터 둘러볼까요?" 지역 카드에서 지금 둘러보는 중인 지역 — onSelectRegion으로 바뀌는
  // 전역 선호 지역(selectedRegions)의 첫 번째 값을 그대로 쓴다. 선호 지역이 하나도 없으면
  // 첫 지역을 기본값으로 보여준다.
  const focusRegionId = selectedRegions[0] ?? REGIONS[0].id;
  const focusRegion = REGIONS.find((r) => r.id === focusRegionId);

  // FOR YOU 추천은 "어디부터 둘러볼까요?" 카드의 단일 focusRegionId가 아니라, 선호 지역
  // 전체(selectedRegions)를 기준으로 조회한다 — 지역을 2개 이상 골랐을 때 첫 지역 콘텐츠만
  // 나오거나, 하나도 안 골랐을 때 기본값(REGIONS[0])이 섞여 들어오는 걸 막는다. 선택이
  // 없으면 useContents가 빈 배열을 그대로 받아 조회를 쉬고(enabled: false), 아래
  // recommendations.length > 0 가드로 섹션 자체가 숨는다.
  const { contents } = useContents(selectedRegions);

  // 지역 선택이 바뀔 때마다(같은 지역을 다시 골라도) 추천 콘텐츠를 새로 섞는다.
  // contents는 useContents 안에서 매 렌더마다 새 배열로 만들어지므로, 그 자체를 의존성으로
  // 쓰면 렌더될 때마다 섞여서 스크롤 중에도 순서가 계속 바뀐다 — id 목록을 문자열로 묶어 비교한다.
  const contentIdsKey = contents.map((c) => c.id).join(',');
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const selectedRegionsKey = selectedRegions.join(',');
  const prevSelectedRegionsKey = useRef<string | null>(null);
  useEffect(() => {
    if (prevSelectedRegionsKey.current !== selectedRegionsKey) {
      prevSelectedRegionsKey.current = selectedRegionsKey;
      setShuffleSeed((seed) => seed + 1);
    }
  }, [selectedRegionsKey]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: contentIdsKey/shuffleSeed가 바뀔 때만 다시 섞으면 되고, contents 참조 자체는 매 렌더 새로 생겨 의존성에서 뺀다
  const shuffledContents = useMemo(() => shuffle(contents), [contentIdsKey, shuffleSeed]);
  const recommendations = shuffledContents.filter((c) => !selectedIds.includes(c.id)).slice(0, 6);

  // 최근에 본 콘텐츠는 id만 저장돼 있어서(services/recentlyViewedStorage.ts), 최신 정보를
  // 다시 받아온다 — 상세 화면을 막 나온 직후라 대부분 캐시에 남아있어 추가 요청이 거의 없다.
  const previewRecentlyViewedIds = recentlyViewedIds.slice(0, RECENTLY_VIEWED_PREVIEW_COUNT);
  const { contents: recentlyViewedContents } = useContentsByIds(previewRecentlyViewedIds);
  // useContentsByIds는 넘긴 id 순서를 그대로 유지하므로, 정렬을 다시 할 필요는 없다.

  const { user } = useCurrentUser(!isGuest);
  // "게스트님"은 진짜 게스트일 때만 써야 한다 — 로그인은 했는데 닉네임을 아직 못
  // 받아온 것뿐이면(로딩 중이거나 네트워크 실패) 로그인 바가 안 뜨는 것과 모순돼 보인다.
  // ProfileContent.tsx와 같은 패턴: 그 경우엔 "불러오는 중..."으로 구분한다.
  const greeting = isGuest
    ? '게스트님'
    : user?.nickname
      ? `${user.nickname} 여행자님`
      : '불러오는 중...';

  // "저장한 여행" 카드의 대표 사진 — 카드 개수만큼 상세 조회가 추가로 나가는 비용이 있어
  // 사진 하나만 받아온다(hooks/useItineraryFirstStopPhotos.ts 상단 설명 참고).
  const itineraryIds = useMemo(
    () => itineraryHistory.map((item) => item.itineraryId),
    [itineraryHistory],
  );
  const firstStopPhotos = useItineraryFirstStopPhotos(itineraryIds);
  const { sharingItineraryId, shareSavedItinerary } = useItineraryShare();

  return (
    <Scroll showsVerticalScrollIndicator={false}>
      <HeaderSection>
        {isGuest && (
          <LoginBar onPress={onLogin} activeOpacity={0.8}>
            <LoginBarText>로그인하고 맞춤 추천 받기</LoginBarText>
            <LoginBarButton>
              <LoginBarButtonLabel>로그인</LoginBarButtonLabel>
            </LoginBarButton>
          </LoginBar>
        )}
        <Greeting>
          안녕하세요, {greeting}{' '}
          <Ionicons name="hand-right-outline" size={18} color={COLORS.white} />
        </Greeting>
        <GreetingSubRow>
          <GreetingSub>
            {count > 0
              ? `여행 바구니에 ${count}곳을 담았어요.`
              : '마음에 드는 곳을 담고 AI 일정을 만들어보세요.'}
          </GreetingSub>
          <FavoritesEntryButton onPress={onOpenFavorites} activeOpacity={0.8}>
            <Ionicons name="heart" size={13} color={COLORS.white} />
            <FavoritesEntryLabel>{favoriteIds.length}</FavoritesEntryLabel>
          </FavoritesEntryButton>
        </GreetingSubRow>
      </HeaderSection>

      <Content>
        <StatusCard>
          <StatusRow>
            <StatusLabelRow>
              <StatusIconBadge>
                <Ionicons name="briefcase-outline" size={15} color={COLORS.coral600} />
              </StatusIconBadge>
              <StatusLabel>현재 여행 바구니</StatusLabel>
            </StatusLabelRow>
            <StatusCount>{count}곳</StatusCount>
          </StatusRow>
          {regionNames.length > 0 && (
            <RegionBadgeRow>
              {regionNames.map((name) => (
                <RegionBadge key={name}>
                  <Ionicons name="location-outline" size={12} color={COLORS.gray700} />
                  <RegionBadgeLabel>{name}</RegionBadgeLabel>
                </RegionBadge>
              ))}
            </RegionBadgeRow>
          )}
          <DateRow onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
            <DateRowLeft>
              <Ionicons name="calendar-outline" size={15} color={COLORS.gray700} />
              <DateRowText $placeholder={!tripDate}>
                {tripDate ? formatDate(tripDate.startDate) : '날짜를 선택해주세요'}
              </DateRowText>
            </DateRowLeft>
            <Ionicons name="chevron-down-outline" size={13} color={COLORS.gray400} />
          </DateRow>
          {count > 0 ? (
            <>
              <PrimaryButton onPress={onOpenBasket} activeOpacity={0.8}>
                <PrimaryButtonLabel>바구니 확인하고 일정 만들기</PrimaryButtonLabel>
              </PrimaryButton>
              <SecondaryButton onPress={onBrowse} activeOpacity={0.8}>
                <SecondaryButtonLabel>콘텐츠 더 둘러보기</SecondaryButtonLabel>
              </SecondaryButton>
            </>
          ) : (
            <PrimaryButton onPress={onBrowse} activeOpacity={0.8}>
              <PrimaryButtonLabel>콘텐츠 둘러보기</PrimaryButtonLabel>
            </PrimaryButton>
          )}
        </StatusCard>

        <View style={{ marginBottom: 24 }}>
          <SectionHead>
            <SectionTitle>어디부터 둘러볼까요?</SectionTitle>
            <SectionSubtitle>
              지역을 선택하면 그 지역의 여행 콘텐츠를 둘러볼 수 있어요
            </SectionSubtitle>
          </SectionHead>
          <RegionRow horizontal showsHorizontalScrollIndicator={false}>
            {REGIONS.map((region) => {
              const selected = region.id === focusRegionId;
              return (
                <RegionCard
                  key={region.id}
                  $selected={selected}
                  onPress={() => {
                    // 카드를 탭하면 그 지역으로 선택을 바꾸고(단일 선택) 곧바로 둘러보기로 이동한다.
                    onSelectRegion(region.id);
                    onBrowse();
                  }}
                  activeOpacity={0.85}
                >
                  <RegionPhoto $color={region.color}>
                    <RegionPhotoImage source={{ uri: region.imageUrl }} resizeMode="cover" />
                  </RegionPhoto>
                  <RegionBody>
                    <RegionAccentBar />
                    <RegionRomanLabel>{region.id.toUpperCase()}</RegionRomanLabel>
                    <RegionName>{region.name}</RegionName>
                    <RegionTagline numberOfLines={2}>{region.tagline}</RegionTagline>
                    <RegionCardLink $selected={selected}>둘러보기 →</RegionCardLink>
                  </RegionBody>
                </RegionCard>
              );
            })}
          </RegionRow>
        </View>

        {recommendations.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <SectionHeadRow>
              <View>
                <SectionEyebrow>FOR YOU</SectionEyebrow>
                <SectionTitleRow>
                  <SectionTitle>추천 콘텐츠</SectionTitle>
                  <SectionMeta>
                    {regionNames.length > 0 ? regionNames.join(', ') : focusRegion?.name} ·{' '}
                    {recommendations.length}곳
                  </SectionMeta>
                </SectionTitleRow>
              </View>
              <MoreLink onPress={onBrowse} activeOpacity={0.7}>
                <MoreLinkLabel>더보기</MoreLinkLabel>
                <Ionicons name="chevron-forward" size={12} color={COLORS.gray500} />
              </MoreLink>
            </SectionHeadRow>
            <RecommendRow horizontal showsHorizontalScrollIndicator={false}>
              {recommendations.map((item) => {
                const category = CATEGORIES.find((c) => c.id === item.category);
                const inBasket = selectedIds.includes(item.id);
                return (
                  <RecommendCard
                    key={item.id}
                    onPress={() => onPressDetail(item.id)}
                    activeOpacity={0.9}
                  >
                    <RecommendPhotoWrap>
                      {item.imageUrl ? (
                        <RecommendImage source={{ uri: item.imageUrl }} resizeMode="cover" />
                      ) : (
                        <RecommendThumb $color={category?.color ?? COLORS.gray400}>
                          <Ionicons
                            name={category?.icon ?? 'location-outline'}
                            size={30}
                            color={COLORS.gray500}
                          />
                        </RecommendThumb>
                      )}
                      {category && (
                        <RecommendCategoryBadge>
                          <RecommendCategoryLabel>{category.label}</RecommendCategoryLabel>
                        </RecommendCategoryBadge>
                      )}
                      <RecommendFavoriteBadge>
                        <FavoriteButton
                          active={favoriteIds.includes(item.id)}
                          onPress={() => onToggleFavorite(item)}
                          size={15}
                          diameter={34}
                        />
                      </RecommendFavoriteBadge>
                    </RecommendPhotoWrap>
                    <RecommendBody>
                      <RecommendName numberOfLines={1}>{item.name}</RecommendName>
                      <RecommendAddress numberOfLines={1}>{item.address}</RecommendAddress>
                      <RecommendAddButton
                        $active={inBasket}
                        onPress={() => onToggle(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={inBasket ? 'checkmark' : 'add'}
                          size={15}
                          color={inBasket ? COLORS.white : COLORS.coral600}
                        />
                        <RecommendAddButtonLabel $active={inBasket}>
                          {inBasket ? '담음' : '담기'}
                        </RecommendAddButtonLabel>
                      </RecommendAddButton>
                    </RecommendBody>
                  </RecommendCard>
                );
              })}
            </RecommendRow>
          </View>
        )}

        {recentlyViewedContents.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <SectionHead>
              <SectionTitle>최근에 본</SectionTitle>
            </SectionHead>
            <RecentList>
              {recentlyViewedContents.map((item, index) => {
                const category = CATEGORIES.find((c) => c.id === item.category);
                return (
                  <RecentRow
                    key={item.id}
                    $first={index === 0}
                    onPress={() => onPressDetail(item.id)}
                    activeOpacity={0.7}
                  >
                    {item.imageUrl ? (
                      <RecentThumbImage source={{ uri: item.imageUrl }} resizeMode="cover" />
                    ) : (
                      <RecentThumbPlaceholder $color={category?.color ?? COLORS.gray400}>
                        <Ionicons
                          name={category?.icon ?? 'location-outline'}
                          size={18}
                          color={COLORS.gray500}
                        />
                      </RecentThumbPlaceholder>
                    )}
                    <RecentBody>
                      <RecentName numberOfLines={1}>{item.name}</RecentName>
                      <RecentAddress numberOfLines={1}>{item.address}</RecentAddress>
                    </RecentBody>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.gray300} />
                  </RecentRow>
                );
              })}
            </RecentList>
          </View>
        )}

        {itineraryHistory.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <SectionHeadRow>
              <View>
                <SectionEyebrow>MY TRIP</SectionEyebrow>
                <SectionTitle>저장한 여행</SectionTitle>
              </View>
              <MoreLink onPress={onOpenSavedTrips} activeOpacity={0.7}>
                <MoreLinkLabel>전체보기</MoreLinkLabel>
                <Ionicons name="chevron-forward" size={12} color={COLORS.gray500} />
              </MoreLink>
            </SectionHeadRow>
            <TripRow horizontal showsHorizontalScrollIndicator={false}>
              {itineraryHistory.map((item) => (
                <TripCardWrapper key={item.itineraryId}>
                  <SavedTripCard
                    item={item}
                    photoUrl={firstStopPhotos[item.itineraryId]}
                    isOpening={openingItineraryId === item.itineraryId}
                    isSharing={sharingItineraryId === item.itineraryId}
                    onOpen={() => onOpenItinerary(item.itineraryId)}
                    onDelete={() => onDeleteItinerary(item.itineraryId, item.title)}
                    onShare={() => shareSavedItinerary(item)}
                  />
                </TripCardWrapper>
              ))}
            </TripRow>
          </View>
        )}
      </Content>

      <TripDatePickerModal
        visible={showDatePicker}
        initialValue={tripDate}
        onConfirm={(value) => {
          onSelectDate(value);
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />
    </Scroll>
  );
}
