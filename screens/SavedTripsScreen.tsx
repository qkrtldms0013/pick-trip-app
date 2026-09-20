import { useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components';
import { SavedTripCard } from '../components/molecules/SavedTripCard';
import { COLORS } from '../constants/colors';
import { TAB_BAR_CLEARANCE } from '../constants/layout';
import { FONT } from '../constants/typography';
import { useItineraryFirstStopPhotos } from '../hooks/useItineraryFirstStopPhotos';
import { useItineraryShare } from '../hooks/useItineraryShare';
import type { SavedItinerarySummary } from '../services/itineraryHistoryStorage';
import { getTripBadge } from '../utils/itineraryHistory';

interface SavedTripsScreenProps {
  itineraryHistory: SavedItinerarySummary[];
  openingItineraryId: string | null;
  onOpenItinerary: (itineraryId: string) => void;
  onDeleteItinerary: (itineraryId: string, title: string) => void;
}

type TripTab = 'upcoming' | 'past';

const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

// 이 화면은 네이티브 스택 헤더(RootNavigator의 headerScreenOptions)가 이미 위에 떠 있다.
// 그 아래에 padding-top을 또 주면 헤더와 본문 사이가 붕 떠 보여서, 여기서는 0으로 둔다.
const TabRow = styled(View)`
  flex-direction: row;
  gap: 8px;
  padding: 12px 20px 0;
`;

const TabButton = styled(TouchableOpacity)<{ $active: boolean }>`
  padding-vertical: 8px;
  padding-horizontal: 14px;
  border-radius: 100px;
  background-color: ${({ $active }) => ($active ? COLORS.gray900 : COLORS.white)};
  border-width: 1px;
  border-color: ${({ $active }) => ($active ? COLORS.gray900 : COLORS.gray200)};
`;

const TabButtonLabel = styled(Text)<{ $active: boolean }>`
  font-size: 13px;
  font-family: ${({ $active }) => ($active ? FONT.bold : FONT.medium)};
  color: ${({ $active }) => ($active ? COLORS.white : COLORS.gray700)};
`;

const SummaryRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 4px;
`;

const SummaryText = styled(Text)`
  font-family: ${FONT.medium};
  font-size: 13px;
  color: ${COLORS.gray500};
`;

const SortLabel = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray400};
`;

const CardWrapper = styled(View)`
  margin: 8px 20px 0;
`;

const EmptyBox = styled(View)`
  align-items: center;
  padding: 60px 20px;
`;

const EmptyText = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 15px;
  color: ${COLORS.gray500};
  text-align: center;
`;

export function SavedTripsScreen({
  itineraryHistory,
  openingItineraryId,
  onOpenItinerary,
  onDeleteItinerary,
}: SavedTripsScreenProps) {
  const [activeTab, setActiveTab] = useState<TripTab>('upcoming');

  const itineraryIds = useMemo(
    () => itineraryHistory.map((item) => item.itineraryId),
    [itineraryHistory],
  );
  // 카드의 대표 사진은 홈 미리보기와 같은 훅으로 가져온다 — 카드마다 상세 조회가 추가로
  // 나가는 비용은 hooks/useItineraryFirstStopPhotos.ts 상단 설명 참고.
  const firstStopPhotos = useItineraryFirstStopPhotos(itineraryIds);
  const { sharingItineraryId, shareSavedItinerary } = useItineraryShare();

  // 여행일이 없는 일정(드물지만 travelDate 미지정)은 지난 여행이라고 확정할 근거가 없어
  // "다가오는 여행" 쪽에 넣는다.
  const upcomingTrips = itineraryHistory.filter(
    (item) => getTripBadge(item.travelDate, item.duration)?.tone !== 'past',
  );
  const pastTrips = itineraryHistory.filter(
    (item) => getTripBadge(item.travelDate, item.duration)?.tone === 'past',
  );
  const visibleTrips = activeTab === 'upcoming' ? upcomingTrips : pastTrips;
  const tabLabel = activeTab === 'upcoming' ? '다가오는 여행' : '지난 여행';

  return (
    <ScreenContainer edges={['bottom', 'left', 'right']}>
      <TabRow>
        <TabButton
          $active={activeTab === 'upcoming'}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.8}
        >
          <TabButtonLabel $active={activeTab === 'upcoming'}>
            다가오는 여행 {upcomingTrips.length}
          </TabButtonLabel>
        </TabButton>
        <TabButton
          $active={activeTab === 'past'}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.8}
        >
          <TabButtonLabel $active={activeTab === 'past'}>
            지난 여행 {pastTrips.length}
          </TabButtonLabel>
        </TabButton>
      </TabRow>
      <SummaryRow>
        <SummaryText>
          {tabLabel} {visibleTrips.length}개
        </SummaryText>
        {/* 정렬 기준은 지금 서버가 내려주는 순서(최신 저장순) 하나뿐이라 고정 라벨만 둔다 —
            다른 정렬 옵션이 생기면 그때 눌러서 바꾸는 동작을 추가한다. */}
        <SortLabel>최신순</SortLabel>
      </SummaryRow>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 + TAB_BAR_CLEARANCE }}
      >
        {visibleTrips.length === 0 ? (
          <EmptyBox>
            <EmptyText>{tabLabel}이 없어요</EmptyText>
          </EmptyBox>
        ) : (
          visibleTrips.map((item) => (
            <CardWrapper key={item.itineraryId}>
              <SavedTripCard
                item={item}
                photoUrl={firstStopPhotos[item.itineraryId]}
                isOpening={openingItineraryId === item.itineraryId}
                isSharing={sharingItineraryId === item.itineraryId}
                onOpen={() => onOpenItinerary(item.itineraryId)}
                onDelete={() => onDeleteItinerary(item.itineraryId, item.title)}
                onShare={() => shareSavedItinerary(item)}
              />
            </CardWrapper>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
