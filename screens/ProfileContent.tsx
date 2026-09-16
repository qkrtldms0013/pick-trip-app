import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { FavoriteButton } from '../components/atoms/FavoriteButton';
import { COLORS } from '../constants/colors';
import { COMPANIONS, STYLE_OPTIONS } from '../constants/companions';
import { TAB_BAR_CLEARANCE } from '../constants/layout';
import { REGIONS } from '../constants/regions';
import { FONT } from '../constants/typography';
import { useContentsByIds } from '../hooks/useContentsByIds';
import { useCurrentUser } from '../hooks/useCurrentUser';
import type { SavedItinerarySummary } from '../services/itineraryHistoryStorage';
import type { CompanionType, StylePreference } from '../types/companion';
// 이 파일에 이미 스타일 컴포넌트 `Content`가 있어서 타입 이름을 바꿔 가져온다.
import type { Content as ContentItem } from '../types/content';
import type { CurrentUser } from '../types/user';
import { formatItinerarySub } from '../utils/itineraryHistory';

// "저장한 여행" 목록이 스크롤 없이 한 번에 보여주는 최대 개수 — 넘으면 TripScrollBox
// 안에서만 스크롤되게 한다(마이페이지 전체 스크롤과는 별개).
const VISIBLE_TRIP_COUNT = 4;

const PROVIDER_LABELS: Record<string, string> = {
  kakao: '카카오',
  google: 'Google',
};

// "카카오 · 2026년 8월 1일 가입"처럼 로그인 수단과 가입일을 한 줄로 합친다.
function formatProviderJoin(user: CurrentUser): string {
  const providerLabel = PROVIDER_LABELS[user.provider.toLowerCase()] ?? user.provider;
  const joined = new Date(user.createdAt);
  const joinLabel = Number.isNaN(joined.getTime())
    ? null
    : `${joined.getFullYear()}년 ${joined.getMonth() + 1}월 ${joined.getDate()}일 가입`;
  return [providerLabel, joinLabel].filter((part): part is string => Boolean(part)).join(' · ');
}

interface ProfileContentProps {
  isGuest: boolean;
  companion: CompanionType | null;
  stylePrefs: StylePreference[];
  selectedRegions: string[];
  itineraryHistory: SavedItinerarySummary[];
  openingItineraryId: string | null;
  onOpenItinerary: (itineraryId: string) => void;
  onDeleteItinerary: (itineraryId: string, title: string) => void;
  // "저장한 여행" 섹션의 "전체보기" — 전체 목록 화면(SavedTripsScreen)으로 이동한다.
  onOpenSavedTrips: () => void;
  onChangeCompanion: (companion: CompanionType) => void;
  onToggleStylePref: (pref: StylePreference) => void;
  onToggleRegion: (regionId: string) => void;
  favoriteIds: string[];
  onToggleFavorite: (content: ContentItem) => void;
  onOpenFavorites: () => void;
  onPressContent: (contentId: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  onWithdraw: () => void;
  tripReminderEnabled: boolean;
  onToggleTripReminder: (enabled: boolean) => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

const Scroll = styled(ScrollView)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

// 하단 여백은 플로팅 탭바가 가리는 높이를 확보한다.
const Content = styled(View)`
  padding: 16px 20px ${TAB_BAR_CLEARANCE}px;
`;

const IdentityCard = styled(LinearGradient)`
  border-radius: 18px;
  padding: 18px;
  margin-bottom: 16px;
  flex-direction: row;
  align-items: center;
  gap: 14px;
`;

const IdentityInfo = styled(View)`
  flex: 1;
`;

const LoginButton = styled(TouchableOpacity)`
  background-color: ${COLORS.white};
  border-radius: 100px;
  padding-vertical: 8px;
  padding-horizontal: 16px;
`;

const LoginButtonLabel = styled(Text)`
  font-size: 13px;
  font-family: ${FONT.semibold};
  color: ${COLORS.coral600};
`;

const Avatar = styled(View)`
  width: 56px;
  height: 56px;
  border-radius: 100px;
  background-color: rgba(255, 255, 255, 0.25);
  align-items: center;
  justify-content: center;
`;

const AvatarLabel = styled(Text)`
  font-size: 22px;
  font-family: ${FONT.bold};
  color: ${COLORS.white};
`;

const IdentityName = styled(Text)`
  font-size: 17px;
  font-family: ${FONT.bold};
  color: ${COLORS.white};
  margin-bottom: 4px;
`;

const IdentitySub = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
`;

const IdentityMeta = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 2px;
`;

const TripRow = styled(TouchableOpacity)<{ $last: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 14px;
  padding-vertical: 12px;
  border-bottom-width: ${({ $last }) => ($last ? '0px' : '1px')};
  border-bottom-color: ${COLORS.gray100};
`;

const TripIconBadge = styled(View)`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background-color: ${COLORS.coral50};
  align-items: center;
  justify-content: center;
`;

const TripBody = styled(View)`
  flex: 1;
`;

const TripTitleRow = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
`;

const TripTitle = styled(Text)`
  font-size: 15px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
  flex-shrink: 1;
`;

const TripSub = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray500};
`;

const DeleteTripButton = styled(TouchableOpacity)`
  padding: 2px;
`;

// 저장한 여행이 많으면 이 목록 하나가 마이페이지 전체를 아래로 밀어버려서, 눈에 보이는
// 개수를 VISIBLE_TRIP_COUNT로 제한하고 그 안에서만 세로로 스크롤하게 한다.
const TripScrollBox = styled(ScrollView)`
  max-height: 280px;
`;

const SectionTitleRow = styled(View)`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
`;

const SectionTitleGroup = styled(View)`
  flex-direction: row;
  align-items: baseline;
  gap: 6px;
`;

const SectionTitleText = styled(Text)`
  font-size: 15px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
`;

const SectionTitleCount = styled(Text)`
  font-size: 15px;
  font-family: ${FONT.bold};
  color: ${COLORS.coral500};
`;

const SeeAllButton = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  gap: 2px;
`;

const SeeAllLabel = styled(Text)`
  font-size: 13px;
  font-family: ${FONT.medium};
  color: ${COLORS.gray500};
`;

const FavoriteRow = styled(ScrollView)``;

const FavoriteCard = styled(TouchableOpacity)`
  width: 110px;
  margin-right: 12px;
`;

const FavoriteThumbWrap = styled(View)`
  width: 110px;
  height: 110px;
  border-radius: 12px;
  background-color: ${COLORS.gray100};
  overflow: hidden;
  margin-bottom: 8px;
`;

const FavoriteThumbImage = styled(Image)`
  width: 100%;
  height: 100%;
`;

const FavoriteThumbPlaceholder = styled(View)`
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
`;

const FavoriteBadge = styled(View)`
  position: absolute;
  top: 6px;
  right: 6px;
`;

const FavoriteName = styled(Text)`
  font-size: 13px;
  font-family: ${FONT.semibold};
  color: ${COLORS.gray900};
  margin-bottom: 2px;
`;

const FavoriteRegion = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray500};
`;

const FavoriteLoadingRow = styled(View)`
  height: 110px;
  align-items: center;
  justify-content: center;
`;

const Card = styled(View)`
  background-color: ${COLORS.white};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  padding: 18px;
  margin-bottom: 16px;
`;

const CardTitle = styled(Text)`
  font-size: 15px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
  margin-bottom: 4px;
`;

const CardDesc = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray500};
  margin-bottom: 14px;
`;

const FieldLabel = styled(Text)`
  font-size: 13px;
  font-family: ${FONT.semibold};
  color: ${COLORS.gray500};
  margin-bottom: 8px;
`;

const ChipRow = styled(View)`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const Chip = styled(TouchableOpacity)<{ $active: boolean }>`
  flex-direction: row;
  align-items: center;
  gap: 5px;
  padding-vertical: 8px;
  padding-horizontal: 14px;
  border-radius: 100px;
  border-width: 1px;
  background-color: ${({ $active }) => ($active ? COLORS.coral50 : COLORS.white)};
  border-color: ${({ $active }) => ($active ? COLORS.coral500 : COLORS.gray200)};
`;

const ChipLabel = styled(Text)<{ $active: boolean }>`
  font-size: 13px;
  font-family: ${FONT.medium};
  color: ${({ $active }) => ($active ? COLORS.coral700 : COLORS.gray700)};
`;

const NotifyRow = styled(View)<{ $last: boolean }>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-vertical: 13px;
  border-bottom-width: ${({ $last }) => ($last ? '0px' : '1px')};
  border-bottom-color: ${COLORS.gray100};
`;

const NotifyTitle = styled(Text)`
  font-size: 14px;
  font-family: ${FONT.medium};
  color: ${COLORS.gray900};
`;

const NotifyDesc = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray500};
  margin-top: 2px;
`;

const Toggle = styled(TouchableOpacity)<{ $on: boolean }>`
  width: 46px;
  height: 28px;
  border-radius: 100px;
  background-color: ${({ $on }) => ($on ? COLORS.coral500 : COLORS.gray200)};
  padding: 3px;
`;

const ToggleKnob = styled(View)<{ $on: boolean }>`
  width: 22px;
  height: 22px;
  border-radius: 100px;
  background-color: ${COLORS.white};
  margin-left: ${({ $on }) => ($on ? 18 : 0)}px;
`;

const LogoutButton = styled(TouchableOpacity)`
  padding-vertical: 13px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  align-items: center;
  background-color: ${COLORS.white};
  margin-bottom: 10px;
`;

const LogoutLabel = styled(Text)`
  font-size: 14px;
  font-family: ${FONT.medium};
  color: ${COLORS.gray500};
`;

const WithdrawButton = styled(TouchableOpacity)`
  padding-vertical: 13px;
  border-radius: 12px;
  border-width: 1px;
  border-color: ${COLORS.coral300};
  align-items: center;
  background-color: ${COLORS.white};
`;

const WithdrawLabel = styled(Text)`
  font-size: 14px;
  font-family: ${FONT.medium};
  color: ${COLORS.coral600};
`;

const LegalRow = styled(View)`
  flex-direction: row;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
`;

const LegalLink = styled(TouchableOpacity)``;

const LegalLinkLabel = styled(Text)`
  font-size: 12px;
  font-family: ${FONT.regular};
  color: ${COLORS.gray400};
  text-decoration-line: underline;
`;

const LegalDivider = styled(Text)`
  font-size: 12px;
  color: ${COLORS.gray300};
`;

export function ProfileContent({
  isGuest,
  companion,
  stylePrefs,
  selectedRegions,
  itineraryHistory,
  openingItineraryId,
  onOpenItinerary,
  onDeleteItinerary,
  onOpenSavedTrips,
  onChangeCompanion,
  onToggleStylePref,
  onToggleRegion,
  favoriteIds,
  onToggleFavorite,
  onOpenFavorites,
  onPressContent,
  onLogin,
  onLogout,
  onWithdraw,
  tripReminderEnabled,
  onToggleTripReminder,
  onOpenTerms,
  onOpenPrivacy,
}: ProfileContentProps) {
  const { user } = useCurrentUser(!isGuest);
  const displayName = isGuest ? '게스트님' : (user?.nickname ?? '불러오는 중...');
  const { contents: favoriteContents, isLoading: isFavoritesLoading } =
    useContentsByIds(favoriteIds);

  return (
    <Scroll showsVerticalScrollIndicator={false}>
      <Content>
        <IdentityCard
          colors={[COLORS.coral500, COLORS.coral700]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Avatar>
            <AvatarLabel>{displayName.charAt(0)}</AvatarLabel>
          </Avatar>
          <IdentityInfo>
            <IdentityName>{displayName}</IdentityName>
            {isGuest ? (
              <IdentitySub>게스트로 둘러보는 중</IdentitySub>
            ) : (
              user && <IdentityMeta>{formatProviderJoin(user)}</IdentityMeta>
            )}
          </IdentityInfo>
          {isGuest && (
            <LoginButton onPress={onLogin} activeOpacity={0.8}>
              <LoginButtonLabel>로그인</LoginButtonLabel>
            </LoginButton>
          )}
        </IdentityCard>

        {!isGuest && favoriteIds.length > 0 && (
          <Card>
            <SectionTitleRow>
              <SectionTitleGroup>
                <SectionTitleText>찜한 장소</SectionTitleText>
                <SectionTitleCount>{favoriteIds.length}</SectionTitleCount>
              </SectionTitleGroup>
              <SeeAllButton onPress={onOpenFavorites} activeOpacity={0.7}>
                <SeeAllLabel>전체보기</SeeAllLabel>
                <Ionicons name="chevron-forward" size={14} color={COLORS.gray400} />
              </SeeAllButton>
            </SectionTitleRow>
            {isFavoritesLoading ? (
              <FavoriteLoadingRow>
                <ActivityIndicator color={COLORS.coral500} />
              </FavoriteLoadingRow>
            ) : (
              <FavoriteRow horizontal showsHorizontalScrollIndicator={false}>
                {favoriteContents.map((content) => {
                  const region = REGIONS.find((r) => r.id === content.regionId);
                  return (
                    <FavoriteCard
                      key={content.id}
                      onPress={() => onPressContent(content.id)}
                      activeOpacity={0.8}
                    >
                      <FavoriteThumbWrap>
                        {content.imageUrl ? (
                          <FavoriteThumbImage
                            source={{ uri: content.imageUrl }}
                            resizeMode="cover"
                          />
                        ) : (
                          <FavoriteThumbPlaceholder>
                            <Ionicons name="image-outline" size={22} color={COLORS.gray400} />
                          </FavoriteThumbPlaceholder>
                        )}
                        <FavoriteBadge>
                          <FavoriteButton
                            active
                            onPress={() => onToggleFavorite(content)}
                            size={12}
                            diameter={22}
                          />
                        </FavoriteBadge>
                      </FavoriteThumbWrap>
                      <FavoriteName numberOfLines={1}>{content.name}</FavoriteName>
                      {region && <FavoriteRegion numberOfLines={1}>{region.name}</FavoriteRegion>}
                    </FavoriteCard>
                  );
                })}
              </FavoriteRow>
            )}
          </Card>
        )}

        {itineraryHistory.length > 0 &&
          (() => {
            const tripRows = itineraryHistory.map((item, index) => {
              const isOpening = openingItineraryId === item.itineraryId;
              return (
                <TripRow
                  key={item.itineraryId}
                  onPress={() => onOpenItinerary(item.itineraryId)}
                  disabled={openingItineraryId != null}
                  $last={index === itineraryHistory.length - 1}
                >
                  <TripIconBadge>
                    <Ionicons name="map-outline" size={20} color={COLORS.coral600} />
                  </TripIconBadge>
                  <TripBody>
                    <TripTitleRow>
                      <TripTitle numberOfLines={1}>{item.title}</TripTitle>
                    </TripTitleRow>
                    <TripSub numberOfLines={1}>{formatItinerarySub(item)}</TripSub>
                  </TripBody>
                  {isOpening ? (
                    <ActivityIndicator color={COLORS.coral500} />
                  ) : (
                    <>
                      <DeleteTripButton
                        onPress={() => onDeleteItinerary(item.itineraryId, item.title)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color={COLORS.gray400} />
                      </DeleteTripButton>
                      <Ionicons name="chevron-forward" size={14} color={COLORS.gray400} />
                    </>
                  )}
                </TripRow>
              );
            });

            return (
              <Card>
                <SectionTitleRow>
                  <SectionTitleGroup>
                    <SectionTitleText>저장한 여행</SectionTitleText>
                    <SectionTitleCount>{itineraryHistory.length}</SectionTitleCount>
                  </SectionTitleGroup>
                  <SeeAllButton onPress={onOpenSavedTrips} activeOpacity={0.7}>
                    <SeeAllLabel>전체보기</SeeAllLabel>
                    <Ionicons name="chevron-forward" size={14} color={COLORS.gray400} />
                  </SeeAllButton>
                </SectionTitleRow>
                {itineraryHistory.length > VISIBLE_TRIP_COUNT ? (
                  <TripScrollBox nestedScrollEnabled showsVerticalScrollIndicator>
                    {tripRows}
                  </TripScrollBox>
                ) : (
                  tripRows
                )}
              </Card>
            );
          })()}

        <Card>
          <CardTitle>여행 취향</CardTitle>
          <CardDesc>온보딩에서 고른 취향이에요. AI 추천에 반영됩니다.</CardDesc>

          <FieldLabel>누구와 함께 가나요?</FieldLabel>
          <ChipRow>
            {COMPANIONS.map((c) => (
              <Chip
                key={c.id}
                $active={companion === c.id}
                onPress={() => onChangeCompanion(c.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={c.icon}
                  size={14}
                  color={companion === c.id ? COLORS.coral700 : COLORS.gray700}
                />
                <ChipLabel $active={companion === c.id}>{c.label}</ChipLabel>
              </Chip>
            ))}
          </ChipRow>

          <FieldLabel>여행 스타일</FieldLabel>
          <ChipRow>
            {STYLE_OPTIONS.map((option) => (
              <Chip
                key={option.id}
                $active={stylePrefs.includes(option.id)}
                onPress={() => onToggleStylePref(option.id)}
                activeOpacity={0.8}
              >
                <ChipLabel $active={stylePrefs.includes(option.id)}>{option.label}</ChipLabel>
              </Chip>
            ))}
          </ChipRow>

          <FieldLabel>선호 지역</FieldLabel>
          <ChipRow style={{ marginBottom: 0 }}>
            {REGIONS.map((region) => (
              <Chip
                key={region.id}
                $active={selectedRegions.includes(region.id)}
                onPress={() => onToggleRegion(region.id)}
                activeOpacity={0.8}
              >
                <ChipLabel $active={selectedRegions.includes(region.id)}>{region.name}</ChipLabel>
              </Chip>
            ))}
          </ChipRow>
        </Card>

        <Card>
          <CardTitle>알림 설정</CardTitle>
          <NotifyRow $last>
            <View>
              <NotifyTitle>여행 리마인더</NotifyTitle>
              <NotifyDesc>출발 전 일정 알림</NotifyDesc>
            </View>
            <Toggle
              $on={tripReminderEnabled}
              onPress={() => onToggleTripReminder(!tripReminderEnabled)}
              activeOpacity={0.8}
            >
              <ToggleKnob $on={tripReminderEnabled} />
            </Toggle>
          </NotifyRow>
        </Card>

        {!isGuest && (
          <>
            <LogoutButton onPress={onLogout} activeOpacity={0.8}>
              <LogoutLabel>로그아웃</LogoutLabel>
            </LogoutButton>
            <WithdrawButton onPress={onWithdraw} activeOpacity={0.8}>
              <WithdrawLabel>회원 탈퇴</WithdrawLabel>
            </WithdrawButton>
          </>
        )}

        <LegalRow>
          <LegalLink onPress={onOpenTerms} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <LegalLinkLabel>이용약관</LegalLinkLabel>
          </LegalLink>
          <LegalDivider>|</LegalDivider>
          <LegalLink onPress={onOpenPrivacy} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <LegalLinkLabel>개인정보처리방침</LegalLinkLabel>
          </LegalLink>
        </LegalRow>
      </Content>
    </Scroll>
  );
}
