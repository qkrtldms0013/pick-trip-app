import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components';
import { SkeletonBox } from '../components/atoms/SkeletonBox';
import { ItineraryStopSkeleton } from '../components/molecules/ItineraryStopSkeleton';
import { COLORS } from '../constants/colors';
import { FONT } from '../constants/typography';
import { fetchSharedItinerary, type SharedItinerary } from '../services/shareService';

interface SharedItineraryScreenProps {
  token: string;
  onTitleReady?: (title: string) => void;
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

// 이 화면은 네이티브 스택 헤더(RootNavigator의 headerScreenOptions)가 이미 위에 떠 있다.
// 그 아래에 padding-top을 또 주면 헤더와 본문 사이가 붕 떠 보여서, 여기서는 0으로 둔다.
const Header = styled(View)`
  padding-horizontal: 20px;
  padding-bottom: 12px;
`;

const Subtitle = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 15px;
  color: ${COLORS.gray500};
  margin-top: 6px;
`;

const DayLabel = styled(Text)`
  font-size: 17px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
  margin: 20px 20px 12px;
`;

const StopCard = styled(View)`
  border-width: 1px;
  border-color: ${COLORS.gray200};
  border-radius: 12px;
  padding: 14px 16px;
  background-color: ${COLORS.white};
  margin-horizontal: 20px;
  margin-bottom: 12px;
`;

const StopName = styled(Text)`
  font-size: 16px;
  font-family: ${FONT.semibold};
  color: ${COLORS.gray900};
`;

const ReasonText = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.teal700};
  margin-top: 6px;
  line-height: 17px;
`;

export function SharedItineraryScreen({ token, onTitleReady }: SharedItineraryScreenProps) {
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [itinerary, setItinerary] = useState<SharedItinerary | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: onTitleReady는 매 렌더 새로 생성되는 콜백이라 의존성에 넣지 않는다
  useEffect(() => {
    fetchSharedItinerary(token)
      .then((result) => {
        setItinerary(result);
        setStatus('done');
        onTitleReady?.(result.title);
      })
      .catch(() => setStatus('error'));
  }, [token]);

  if (status === 'loading') {
    return (
      <ScreenContainer edges={['bottom', 'left', 'right']}>
        <Header>
          <SkeletonBox width="70%" height={15} radius={4} />
        </Header>
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <ItineraryStopSkeleton />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (status === 'error' || !itinerary) {
    return (
      <ScreenContainer edges={['bottom', 'left', 'right']}>
        <CenterBox>
          <Subtitle>공유된 일정을 찾을 수 없어요.</Subtitle>
        </CenterBox>
      </ScreenContainer>
    );
  }

  const dayIndexes = Array.from(new Set(itinerary.stops.map((s) => s.day))).sort((a, b) => a - b);

  return (
    <ScreenContainer edges={['bottom', 'left', 'right']}>
      <Header>
        <Subtitle>다른 사람이 공유한 여행 일정이에요</Subtitle>
      </Header>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {dayIndexes.map((dayIndex) => (
          <View key={dayIndex}>
            <DayLabel>{dayIndex}일차</DayLabel>
            {itinerary.stops
              .filter((stop) => stop.day === dayIndex)
              .map((stop) => (
                <StopCard key={`${stop.day}-${stop.contentId}`}>
                  <StopName>{stop.title ?? stop.contentId}</StopName>
                  <ReasonText>{stop.reason}</ReasonText>
                </StopCard>
              ))}
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}
