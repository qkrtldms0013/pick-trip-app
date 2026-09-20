import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components';
import { ContentCard } from '../components/molecules/ContentCard';
import { ContentCardSkeleton } from '../components/molecules/ContentCardSkeleton';
import { COLORS } from '../constants/colors';
import { TAB_BAR_CLEARANCE } from '../constants/layout';
import { FONT } from '../constants/typography';
import { useContentsByIds } from '../hooks/useContentsByIds';
import type { Content } from '../types/content';

interface FavoritesScreenProps {
  favoriteIds: string[];
  onToggleFavorite: (content: Content) => void;
  onPressDetail: (contentId: string) => void;
}

const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.gray50};
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
`;

const CardList = styled(View)`
  gap: 12px;
`;

// 담긴 콘텐츠 개수만큼(최대 6장) 스켈레톤을 보여준다.
const SKELETON_COUNT = 6;

const EmptyText = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 15px;
  color: ${COLORS.gray500};
  text-align: center;
  margin-top: 60px;
`;

const RetryButton = styled(TouchableOpacity)`
  align-self: center;
  border-width: 1px;
  border-color: ${COLORS.coral500};
  border-radius: 8px;
  padding-vertical: 8px;
  padding-horizontal: 16px;
  margin-top: 12px;
`;

const RetryLabel = styled(Text)`
  color: ${COLORS.coral500};
  font-size: 14px;
  font-family: ${FONT.medium};
`;

export function FavoritesScreen({
  favoriteIds,
  onToggleFavorite,
  onPressDetail,
}: FavoritesScreenProps) {
  const { contents: items, isLoading, isError, refetch } = useContentsByIds(favoriteIds);

  return (
    <ScreenContainer edges={['bottom', 'left', 'right']}>
      <Header>
        <Subtitle>하트를 눌러 찜해둔 콘텐츠예요</Subtitle>
      </Header>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 + TAB_BAR_CLEARANCE }}
      >
        <CardList>
          {isLoading ? (
            Array.from({ length: Math.min(favoriteIds.length, SKELETON_COUNT) || 1 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: 로딩 중 고정 개수의 자리표시자라 인덱스 키로 충분
              <ContentCardSkeleton key={i} />
            ))
          ) : isError ? (
            <>
              <EmptyText>콘텐츠를 불러오지 못했습니다. 다시 시도해주세요.</EmptyText>
              <RetryButton onPress={() => refetch()} activeOpacity={0.8}>
                <RetryLabel>다시 시도</RetryLabel>
              </RetryButton>
            </>
          ) : items.length === 0 ? (
            <EmptyText>아직 찜한 콘텐츠가 없어요</EmptyText>
          ) : (
            items.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onPress={() => onPressDetail(content.id)}
                onPressDetail={() => onPressDetail(content.id)}
                favorite={favoriteIds.includes(content.id)}
                onToggleFavorite={onToggleFavorite}
              />
            ))
          )}
        </CardList>
      </ScrollView>
    </ScreenContainer>
  );
}
