import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { ContentCard } from '../components/molecules/ContentCard';
import { COLORS } from '../constants/colors';
import { CONTENTS } from '../constants/contents';

interface BasketContentProps {
  selectedIds: string[];
  onToggle: (contentId: string) => void;
  onCreateItinerary: () => void;
}

const Container = styled(View)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

const Header = styled(View)`
  padding-top: 24px;
  padding-horizontal: 20px;
  padding-bottom: 12px;
`;

const Title = styled(Text)`
  font-size: 24px;
  font-weight: 500;
  color: ${COLORS.gray900};
`;

const Subtitle = styled(Text)`
  font-size: 15px;
  color: ${COLORS.gray500};
  margin-top: 6px;
`;

const CardList = styled(View)`
  gap: 12px;
`;

const EmptyText = styled(Text)`
  font-size: 15px;
  color: ${COLORS.gray500};
  text-align: center;
  margin-top: 60px;
`;

const BottomBar = styled(View)`
  padding-top: 12px;
  padding-horizontal: 20px;
  padding-bottom: 16px;
  background-color: ${COLORS.white};
`;

const BasketCount = styled(Text)`
  font-size: 13px;
  color: ${COLORS.gray500};
  text-align: center;
  margin-bottom: 8px;
`;

const CTAButton = styled(TouchableOpacity)<{ $disabled: boolean }>`
  background-color: ${({ $disabled }) => ($disabled ? COLORS.gray200 : COLORS.amber500)};
  border-radius: 12px;
  padding-vertical: 14px;
  align-items: center;
`;

const CTALabel = styled(Text)`
  color: ${COLORS.white};
  font-size: 16px;
  font-weight: 500;
`;

export function BasketContent({ selectedIds, onToggle, onCreateItinerary }: BasketContentProps) {
  const items = CONTENTS.filter((c) => selectedIds.includes(c.id));
  const ready = selectedIds.length >= 2;

  return (
    <Container>
      <Header>
        <Title>여행 바구니</Title>
        <Subtitle>담은 콘텐츠를 확인하고 일정을 만들어보세요</Subtitle>
      </Header>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <CardList>
          {items.length === 0 ? (
            <EmptyText>아직 담은 콘텐츠가 없어요</EmptyText>
          ) : (
            items.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                selected
                onPress={() => onToggle(content.id)}
              />
            ))
          )}
        </CardList>
      </ScrollView>
      {items.length > 0 && (
        <BottomBar>
          <BasketCount>
            {selectedIds.length}개 담음
            {!ready && ' · 1개 더 담으면 일정 생성 가능'}
          </BasketCount>
          <CTAButton
            $disabled={!ready}
            disabled={!ready}
            onPress={onCreateItinerary}
            activeOpacity={ready ? 0.8 : 1}
          >
            <CTALabel>일정 만들기</CTALabel>
          </CTAButton>
        </BottomBar>
      )}
    </Container>
  );
}
