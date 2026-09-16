import { Ionicons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { CATEGORIES } from '../../constants/categories';
import { COLORS } from '../../constants/colors';
import { REGIONS } from '../../constants/regions';
import { FONT } from '../../constants/typography';
import type { Content } from '../../types/content';

interface ContentCardProps {
  content: Content;
  selected?: boolean;
  onPress: () => void;
  onPressDetail?: () => void;
  favorite?: boolean;
  onToggleFavorite?: (content: Content) => void;
  // 바구니 담기/빼기. 없으면(예: 찜한 콘텐츠 화면) 바구니 아이콘 자체를 안 보여준다.
  onToggleBasket?: (content: Content) => void;
  // 카드 오른쪽 위에 지역 뱃지(하동/영주/예천)를 보여줄지. 화면마다 필요 여부가 달라서 옵트인으로 둔다.
  showRegion?: boolean;
}

const Card = styled(TouchableOpacity)<{ $selected: boolean }>`
  background-color: ${COLORS.white};
  border-radius: 12px;
  border-width: ${({ $selected }) => ($selected ? '2px' : '1px')};
  border-color: ${({ $selected }) => ($selected ? COLORS.coral500 : COLORS.gray200)};
  overflow: hidden;
  margin-horizontal: 20px;
`;

const PHOTO_HEIGHT = 220;

const Thumbnail = styled(View)<{ $color: string }>`
  height: ${PHOTO_HEIGHT}px;
  background-color: ${({ $color }) => `${$color}33`};
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const ThumbnailImage = styled(Image)`
  height: ${PHOTO_HEIGHT}px;
  width: 100%;
`;

// 사진 위 좌상단에 나란히 얹는 카테고리·지역 뱃지.
const TopLeftRow = styled(View)`
  position: absolute;
  top: 8px;
  left: 8px;
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const PhotoCategoryBadge = styled(View)`
  background-color: rgba(255, 255, 255, 0.92);
  border-radius: 100px;
  padding-vertical: 4px;
  padding-horizontal: 10px;
`;

const PhotoCategoryLabel = styled(Text)`
  font-size: 12px;
  font-family: ${FONT.semibold};
  color: ${COLORS.gray900};
`;

const RegionBadge = styled(View)`
  background-color: ${COLORS.coral500};
  border-radius: 100px;
  padding-vertical: 4px;
  padding-horizontal: 8px;
`;

const RegionLabel = styled(Text)`
  font-size: 11px;
  font-family: ${FONT.medium};
  color: ${COLORS.white};
`;

// 하트만 배경 없이 뒀던 예전 방식은 사진 위에서 잘 안 보인다는 참고 디자인 피드백으로,
// 다른 뱃지들과 통일된 흰 원형 배경을 다시 얹는다(정사각형이 아니라 원형이라 이전에
// 없앤 사각형 배경 피드백과는 다른 모양).
const FavoriteBadge = styled(TouchableOpacity)`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 36px;
  height: 36px;
  border-radius: 100px;
  background-color: ${COLORS.white};
  align-items: center;
  justify-content: center;
`;

// 예전엔 카드 전체를 눌러야 바구니에 담겼고, 이 자리엔 담겼는지 보여주기만 하는 체크
// 표시(비활성)가 있었다. 이제는 카드를 누르면 상세 화면으로 이동하고, 바구니 담기/빼기는
// 이 버튼을 직접 눌러야 하는 별도 동작이다. "상세 설명"과 같은 줄에 나란히 두기로 한
// 의도라, Footer 안의 일반 flex 아이템으로 둔다(사진 기준 절대위치가 아님) — 그래야
// 본문 내용 길이가 카드마다 달라져도 항상 "상세 설명"과 짝을 맞춰 같은 줄에 남는다.
// 담겼으면 코랄 배경 + 체크, 아니면 흰 배경 + 담기 아이콘으로 상태를 구분한다.
const AddToBasketBadge = styled(TouchableOpacity)<{ $active: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 5px;
  padding-vertical: 8px;
  padding-horizontal: 13px;
  border-radius: 100px;
  border-width: 1px;
  border-color: ${({ $active }) => ($active ? COLORS.coral500 : COLORS.gray200)};
  background-color: ${({ $active }) => ($active ? COLORS.coral500 : COLORS.white)};
`;

const AddToBasketLabel = styled(Text)<{ $active: boolean }>`
  font-size: 13px;
  font-family: ${FONT.semibold};
  color: ${({ $active }) => ($active ? COLORS.white : COLORS.gray900)};
`;

const Body = styled(View)`
  padding: 14px 16px 16px;
`;

const ContentName = styled(Text)`
  font-size: 16px;
  font-family: ${FONT.semibold};
  color: ${COLORS.gray900};
  margin-bottom: 4px;
`;

const Address = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray400};
  margin-bottom: 12px;
`;

const InfoRow = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 10px;
`;

const InfoChip = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 3px;
`;

const InfoText = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray500};
`;

// "상세 설명"과 "담기" 버튼을 한 줄로 묶는 행. margin-top은 원래 DetailLink 혼자
// 가지고 있던 값을 그대로 옮겨왔다 — 정보 표 아래 12px 띄우는 간격은 그대로 유지.
const Footer = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
`;

const DetailLink = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  gap: 2px;
`;

const DetailLinkLabel = styled(Text)`
  font-size: 12px;
  font-family: ${FONT.semibold};
  color: ${COLORS.coral700};
`;

export function ContentCard({
  content,
  selected = false,
  onPress,
  onPressDetail,
  favorite = false,
  onToggleFavorite,
  onToggleBasket,
  showRegion = false,
}: ContentCardProps) {
  const category = CATEGORIES.find((c) => c.id === content.category);
  const region = showRegion ? REGIONS.find((r) => r.id === content.regionId) : undefined;
  const accentColor = category?.color ?? COLORS.gray400;

  return (
    <Card $selected={selected} onPress={onPress} activeOpacity={0.8}>
      {content.imageUrl ? (
        <ThumbnailImage source={{ uri: content.imageUrl }} resizeMode="cover" />
      ) : (
        <Thumbnail $color={accentColor}>
          <Ionicons name={category?.icon ?? 'location-outline'} size={48} color={COLORS.gray500} />
        </Thumbnail>
      )}
      <TopLeftRow>
        <PhotoCategoryBadge>
          <PhotoCategoryLabel>{category?.label ?? content.category}</PhotoCategoryLabel>
        </PhotoCategoryBadge>
        {region && (
          <RegionBadge>
            <RegionLabel>{region.name}</RegionLabel>
          </RegionBadge>
        )}
      </TopLeftRow>
      {onToggleFavorite && (
        <FavoriteBadge
          onPress={() => onToggleFavorite(content)}
          activeOpacity={0.7}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Ionicons
            name={favorite ? 'heart' : 'heart-outline'}
            size={20}
            color={favorite ? COLORS.coral500 : COLORS.gray400}
          />
        </FavoriteBadge>
      )}
      <Body>
        <ContentName>{content.name}</ContentName>
        <Address numberOfLines={1}>{content.address}</Address>
        <InfoRow>
          {content.indoor && (
            <InfoChip>
              <Ionicons name="home-outline" size={13} color={COLORS.gray500} />
              <InfoText>실내</InfoText>
            </InfoChip>
          )}
        </InfoRow>
        {(onPressDetail || onToggleBasket) && (
          <Footer>
            {onPressDetail ? (
              <DetailLink onPress={onPressDetail} activeOpacity={0.7}>
                <DetailLinkLabel>상세 설명</DetailLinkLabel>
                <Ionicons name="chevron-forward" size={12} color={COLORS.coral700} />
              </DetailLink>
            ) : (
              // onToggleBasket만 있고 onPressDetail은 없는 화면이 생기더라도, space-between이
              // "담기" 버튼을 왼쪽으로 붙여버리지 않도록 빈 자리를 잡아둔다.
              <View />
            )}
            {onToggleBasket && (
              <AddToBasketBadge
                $active={selected}
                onPress={() => onToggleBasket(content)}
                activeOpacity={0.8}
              >
                <Ionicons
                  // 하단 탭바 "바구니"와 같은 북마크 아이콘으로 통일 — 이 버튼도 결국 그 바구니에
                  // 담는 동작이라 아이콘이 다르면 헷갈린다는 피드백.
                  name={selected ? 'bookmark' : 'bookmark-outline'}
                  size={16}
                  color={selected ? COLORS.white : COLORS.gray900}
                />
                <AddToBasketLabel $active={selected}>{selected ? '담음' : '담기'}</AddToBasketLabel>
              </AddToBasketBadge>
            )}
          </Footer>
        )}
      </Body>
    </Card>
  );
}
