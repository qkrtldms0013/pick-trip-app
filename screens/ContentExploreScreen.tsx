import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { CategoryFilter } from '../components/molecules/CategoryFilter';
import { ContentCard } from '../components/molecules/ContentCard';
import { COLORS } from '../constants/colors';
import { CONTENTS } from '../constants/contents';
import type { ContentCategory } from '../types/content';

interface ContentExploreScreenProps {
  selectedRegions: string[];
  selectedIds: string[];
  onToggle: (contentId: string) => void;
  onContinue: (selectedIds: string[]) => void;
}

const ScreenContainer = styled(SafeAreaView)`
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

const SearchBox = styled(TextInput)`
  background-color: ${COLORS.white};
  border-width: 1px;
  border-color: ${COLORS.gray200};
  border-radius: 12px;
  padding-vertical: 12px;
  padding-horizontal: 16px;
  font-size: 15px;
  color: ${COLORS.gray900};
  margin-top: 14px;
`;

const FilterRow = styled(View)`
  padding-vertical: 12px;
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
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding-top: 12px;
  padding-horizontal: 20px;
  padding-bottom: 28px;
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

export function ContentExploreScreen({
  selectedRegions,
  selectedIds,
  onToggle,
  onContinue,
}: ContentExploreScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return CONTENTS.filter((c) => {
      const inRegion = selectedRegions.includes(c.regionId);
      const inCategory = selectedCategory === 'all' || c.category === selectedCategory;
      const inSearch = searchQuery.trim() === '' || c.name.includes(searchQuery.trim());
      return inRegion && inCategory && inSearch;
    });
  }, [selectedRegions, selectedCategory, searchQuery]);

  return (
    <ScreenContainer>
      <Header>
        <Title>어떤 곳이 끌리나요?</Title>
        <Subtitle>마음에 드는 콘텐츠를 찾아보세요</Subtitle>
        <SearchBox
          placeholder="장소 이름으로 검색"
          placeholderTextColor={COLORS.gray500}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </Header>
      <FilterRow>
        <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
      </FilterRow>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: selectedIds.length > 0 ? 120 : 40 }}
      >
        <CardList>
          {filtered.length === 0 ? (
            <EmptyText>조건에 맞는 콘텐츠가 없어요</EmptyText>
          ) : (
            filtered.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                selected={selectedIds.includes(content.id)}
                onPress={() => onToggle(content.id)}
              />
            ))
          )}
        </CardList>
      </ScrollView>
      {selectedIds.length > 0 && (
        <BottomBar>
          <BasketCount>{selectedIds.length}개 담음</BasketCount>
          <CTAButton
            $disabled={selectedIds.length < 2}
            onPress={() => {
              if (selectedIds.length >= 2) onContinue(selectedIds);
            }}
            activeOpacity={selectedIds.length >= 2 ? 0.8 : 1}
          >
            <CTALabel>
              {selectedIds.length < 2 ? '1개 더 담으면 일정 생성 가능' : '일정 만들기'}
            </CTALabel>
          </CTAButton>
        </BottomBar>
      )}
    </ScreenContainer>
  );
}
