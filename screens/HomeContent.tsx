import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { CATEGORIES } from '../constants/categories';
import { COLORS } from '../constants/colors';
import { CONTENTS } from '../constants/contents';
import { REGIONS } from '../constants/regions';

interface HomeContentProps {
  companionLabel: string;
  selectedRegions: string[];
  selectedIds: string[];
  onBrowse: () => void;
  onOpenBasket: () => void;
}

const Scroll = styled(ScrollView)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

const Content = styled(View)`
  padding: 20px 20px 32px;
`;

const Greeting = styled(Text)`
  font-size: 22px;
  font-weight: 700;
  color: ${COLORS.gray900};
  letter-spacing: -0.3px;
  margin-bottom: 4px;
`;

const GreetingSub = styled(Text)`
  font-size: 14px;
  color: ${COLORS.gray500};
  margin-bottom: 18px;
`;

const StatusCard = styled(View)`
  background-color: ${COLORS.white};
  border-radius: 16px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  padding: 18px;
  margin-bottom: 28px;
`;

const StatusRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
`;

const StatusLabel = styled(Text)`
  font-size: 15px;
  font-weight: 600;
  color: ${COLORS.gray900};
`;

const StatusCount = styled(Text)`
  font-size: 14px;
  font-weight: 600;
  color: ${COLORS.amber600};
`;

const RegionBadgeRow = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
`;

const RegionBadge = styled(View)`
  background-color: ${COLORS.gray100};
  border-radius: 100px;
  padding-vertical: 4px;
  padding-horizontal: 10px;
`;

const RegionBadgeLabel = styled(Text)`
  font-size: 12px;
  color: ${COLORS.gray700};
`;

const PrimaryButton = styled(TouchableOpacity)`
  background-color: ${COLORS.amber500};
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
  font-weight: 600;
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
  font-weight: 600;
`;

const SectionHead = styled(View)`
  margin-bottom: 12px;
`;

const SectionEyebrow = styled(Text)`
  font-size: 11px;
  font-weight: 600;
  color: ${COLORS.amber600};
  letter-spacing: 0.5px;
  margin-bottom: 3px;
`;

const SectionTitle = styled(Text)`
  font-size: 17px;
  font-weight: 700;
  color: ${COLORS.gray900};
  letter-spacing: -0.2px;
`;

const RecommendRow = styled(ScrollView)``;

const RecommendCard = styled(View)`
  width: 150px;
  background-color: ${COLORS.white};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  overflow: hidden;
  margin-right: 12px;
`;

const RecommendThumb = styled(View)<{ $color: string }>`
  height: 80px;
  background-color: ${({ $color }) => `${$color}33`};
  align-items: center;
  justify-content: center;
`;

const RecommendEmoji = styled(Text)`
  font-size: 26px;
`;

const RecommendBody = styled(View)`
  padding: 10px;
`;

const RecommendName = styled(Text)`
  font-size: 13px;
  font-weight: 600;
  color: ${COLORS.gray900};
`;

export function HomeContent({
  companionLabel,
  selectedRegions,
  selectedIds,
  onBrowse,
  onOpenBasket,
}: HomeContentProps) {
  const count = selectedIds.length;
  const regionNames = REGIONS.filter((r) => selectedRegions.includes(r.id)).map((r) => r.name);
  const recommendations = CONTENTS.filter(
    (c) => selectedRegions.includes(c.regionId) && !selectedIds.includes(c.id),
  ).slice(0, 6);

  return (
    <Scroll showsVerticalScrollIndicator={false}>
      <Content>
        <Greeting>안녕하세요, {companionLabel} 여행자님 👋</Greeting>
        <GreetingSub>
          {count > 0
            ? `여행 바구니에 ${count}곳을 담았어요.`
            : '마음에 드는 곳을 담고 AI 일정을 만들어보세요.'}
        </GreetingSub>

        <StatusCard>
          <StatusRow>
            <StatusLabel>🔖 현재 여행 바구니</StatusLabel>
            <StatusCount>{count}곳</StatusCount>
          </StatusRow>
          <RegionBadgeRow>
            {regionNames.map((name) => (
              <RegionBadge key={name}>
                <RegionBadgeLabel>{name}</RegionBadgeLabel>
              </RegionBadge>
            ))}
          </RegionBadgeRow>
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

        {recommendations.length > 0 && (
          <View>
            <SectionHead>
              <SectionEyebrow>FOR YOU</SectionEyebrow>
              <SectionTitle>추천 콘텐츠</SectionTitle>
            </SectionHead>
            <RecommendRow horizontal showsHorizontalScrollIndicator={false}>
              {recommendations.map((item) => {
                const category = CATEGORIES.find((c) => c.id === item.category);
                return (
                  <RecommendCard key={item.id}>
                    <RecommendThumb $color={item.color}>
                      <RecommendEmoji>{category?.emoji ?? '📍'}</RecommendEmoji>
                    </RecommendThumb>
                    <RecommendBody>
                      <RecommendName numberOfLines={1}>{item.name}</RecommendName>
                    </RecommendBody>
                  </RecommendCard>
                );
              })}
            </RecommendRow>
          </View>
        )}
      </Content>
    </Scroll>
  );
}
