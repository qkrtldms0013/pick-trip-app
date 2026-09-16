import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { COLORS } from '../../constants/colors';
import { FONT } from '../../constants/typography';
import type { SavedItinerarySummary } from '../../services/itineraryHistoryStorage';
import { formatItinerarySub, getTripBadge } from '../../utils/itineraryHistory';

interface SavedTripCardProps {
  item: SavedItinerarySummary;
  // 그 여행의 첫 방문지 사진. undefined면 아직 로딩 중, null이면 사진이 없는 것으로 본다 —
  // hooks/useItineraryFirstStopPhotos.ts 참고.
  photoUrl: string | null | undefined;
  isOpening: boolean;
  isSharing: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onShare: () => void;
}

// 홈("저장한 여행" 미리보기)과 SavedTripsScreen(전체 목록)이 똑같이 쓰는 카드. 폭은 각
// 사용처(홈은 가로 스크롤용 고정폭, 전체 목록은 화면 꽉 채움)에서 감싸는 컨테이너가
// 정하므로 이 컴포넌트 자체는 폭을 고정하지 않는다.
const Card = styled(View)`
  background-color: ${COLORS.white};
  border-radius: 16px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  overflow: hidden;
`;

const PhotoWrap = styled(View)`
  width: 100%;
  height: 130px;
  background-color: ${COLORS.gray100};
`;

const PhotoImage = styled(Image)`
  width: 100%;
  height: 100%;
`;

const PhotoPlaceholder = styled(View)`
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
`;

const Badge = styled(View)<{ $tone: 'upcoming' | 'past' }>`
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: ${({ $tone }) => ($tone === 'upcoming' ? COLORS.coral500 : 'rgba(17,24,39,0.55)')};
  border-radius: 100px;
  padding-vertical: 4px;
  padding-horizontal: 10px;
`;

const BadgeLabel = styled(Text)`
  font-size: 11px;
  font-family: ${FONT.bold};
  color: ${COLORS.white};
`;

const MoreButton = styled(TouchableOpacity)`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 100px;
  background-color: rgba(255, 255, 255, 0.9);
  align-items: center;
  justify-content: center;
`;

const Body = styled(TouchableOpacity)`
  padding: 14px 16px 12px;
`;

const Title = styled(Text)`
  font-size: 15px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
  margin-bottom: 4px;
`;

const Sub = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray500};
`;

const Actions = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 0 16px 16px;
`;

const PrimaryButton = styled(TouchableOpacity)`
  flex: 1;
  align-items: center;
  padding-vertical: 11px;
  border-radius: 10px;
  background-color: ${COLORS.coral50};
`;

const PrimaryButtonLabel = styled(Text)`
  font-size: 13px;
  font-family: ${FONT.bold};
  color: ${COLORS.coral600};
`;

const ShareButton = styled(TouchableOpacity)`
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background-color: ${COLORS.gray100};
`;

export function SavedTripCard({
  item,
  photoUrl,
  isOpening,
  isSharing,
  onOpen,
  onDelete,
  onShare,
}: SavedTripCardProps) {
  const badge = getTripBadge(item.travelDate, item.duration);

  return (
    <Card>
      <PhotoWrap>
        {photoUrl ? (
          <PhotoImage source={{ uri: photoUrl }} resizeMode="cover" />
        ) : (
          <PhotoPlaceholder>
            <Ionicons name="image-outline" size={28} color={COLORS.gray400} />
          </PhotoPlaceholder>
        )}
        {badge && (
          <Badge $tone={badge.tone}>
            <BadgeLabel>{badge.label}</BadgeLabel>
          </Badge>
        )}
        <MoreButton
          onPress={onDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.gray700} />
        </MoreButton>
      </PhotoWrap>
      <Body onPress={onOpen} disabled={isOpening} activeOpacity={0.7}>
        <Title numberOfLines={1}>{item.title}</Title>
        <Sub numberOfLines={1}>{formatItinerarySub(item)}</Sub>
      </Body>
      <Actions>
        <PrimaryButton onPress={onOpen} disabled={isOpening} activeOpacity={0.8}>
          {isOpening ? (
            <ActivityIndicator size="small" color={COLORS.coral600} />
          ) : (
            <PrimaryButtonLabel>일정 보기</PrimaryButtonLabel>
          )}
        </PrimaryButton>
        <ShareButton
          onPress={onShare}
          disabled={isSharing}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color={COLORS.gray700} />
          ) : (
            <Ionicons name="share-outline" size={16} color={COLORS.gray700} />
          )}
        </ShareButton>
      </Actions>
    </Card>
  );
}
