import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import styled from 'styled-components';
import { SquareFavoriteButton } from '../components/atoms/SquareFavoriteButton';
import { ContentDetailSkeleton } from '../components/molecules/ContentDetailSkeleton';
import { NearbyContentCard } from '../components/molecules/NearbyContentCard';
import { CATEGORIES } from '../constants/categories';
import { COLORS } from '../constants/colors';
import { KAKAO_MAP_JS_KEY } from '../constants/kakao';
import { REGIONS } from '../constants/regions';
import { FONT } from '../constants/typography';
import { useNearbyContents } from '../hooks/useNearbyContents';
import { fetchContentDetail } from '../services/contentService';
import type { Content } from '../types/content';
import { buildKakaoMapHtml } from '../utils/kakaoMapHtml';

interface ContentDetailScreenProps {
  contentId: string;
  favorite?: boolean;
  onToggleFavorite?: (content: Content) => void;
  // 로드된 콘텐츠 이름이 확정되면 네이티브 헤더 타이틀에 반영할 수 있게 알려준다
  // (RootNavigator의 SharedGate와 같은 패턴).
  onTitleReady?: (title: string) => void;
  inBasket?: boolean;
  onToggleBasket?: (content: Content) => void;
  // 주변 콘텐츠 카드를 눌렀을 때. 없으면 "주변 콘텐츠" 섹션 자체를 안 보여준다.
  onPressNearby?: (contentId: string) => void;
}

const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.white};
`;

// 사진 한 장의 너비를 화면 폭에 맞춰야 스와이프했을 때 한 장씩 딱 맞게 넘어간다(pagingEnabled).
const SCREEN_WIDTH = Dimensions.get('window').width;

const ImageCarouselWrapper = styled(View)`
  width: 100%;
  height: 260px;
  overflow: hidden;
`;

const CarouselImage = styled(Image)`
  width: ${SCREEN_WIDTH}px;
  height: 260px;
`;

// 사진이 몇 장 남았는지 보여주는 우측 하단 뱃지 ("1 / 4").
const ImageCounterBadge = styled(View)`
  position: absolute;
  bottom: 12px;
  right: 12px;
  background-color: rgba(0, 0, 0, 0.45);
  border-radius: 100px;
  padding-vertical: 3px;
  padding-horizontal: 10px;
`;

const ImageCounterText = styled(Text)`
  color: ${COLORS.white};
  font-size: 11px;
  font-family: ${FONT.semibold};
`;

// 좌측 하단 페이지 표시 점들. 지금 보고 있는 사진의 점만 길쭉하게 강조한다.
const DotRow = styled(View)`
  position: absolute;
  bottom: 14px;
  left: 12px;
  flex-direction: row;
  gap: 4px;
`;

const Dot = styled(View)<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? 14 : 5)}px;
  height: 5px;
  border-radius: 100px;
  background-color: ${({ $active }) => ($active ? COLORS.white : 'rgba(255, 255, 255, 0.5)')};
`;

const DetailThumbnail = styled(View)<{ $color: string }>`
  width: 100%;
  height: 260px;
  background-color: ${({ $color }) => `${$color}33`};
  align-items: center;
  justify-content: center;
`;

const Body = styled(View)`
  padding: 20px;
`;

const ContentName = styled(Text)`
  font-size: 20px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
  margin-bottom: 10px;
`;

const SectionTitle = styled(Text)`
  font-size: 15px;
  font-family: ${FONT.bold};
  color: ${COLORS.gray900};
  margin-bottom: 8px;
`;

const SummarySection = styled(View)`
  margin-bottom: 16px;
`;

const Summary = styled(Text)`
  font-family: ${FONT.medium};
  font-size: 15px;
  color: ${COLORS.gray900};
  line-height: 23px;
`;

// 실제로는 안 보이지만(height: 0 + overflow: hidden), 줄바꿈 제한 없이 렌더링해서
// onTextLayout으로 전체 줄 수를 재는 용도. Summary와 같은 스타일이어야 줄바꿈 위치가
// 똑같이 계산된다.
const SummaryMeasure = styled(Text)`
  font-family: ${FONT.medium};
  font-size: 15px;
  line-height: 23px;
  height: 0;
  overflow: hidden;
  opacity: 0;
`;

const ExpandToggle = styled(TouchableOpacity)`
  flex-direction: row;
  align-items: center;
  gap: 2px;
  margin-top: 4px;
`;

const ExpandToggleLabel = styled(Text)`
  font-family: ${FONT.medium};
  font-size: 13px;
  color: ${COLORS.gray500};
`;

const LocationSection = styled(View)`
  margin-bottom: 16px;
`;

const MapWrapper = styled(View)`
  width: 100%;
  height: 260px;
  border-radius: 12px;
  overflow: hidden;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  margin-bottom: 10px;
`;

// 카카오맵 JS 키를 아직 안 넣었을 때(EXPO_PUBLIC_KAKAO_MAP_JS_KEY 미설정) WebView가
// 빈 화면으로 깨져 보이는 대신, 무엇이 필요한지 알려주는 자리표시자를 보여준다.
const MapPlaceholder = styled(View)`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: ${COLORS.gray50};
  padding: 12px;
`;

const MapPlaceholderText = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 12px;
  color: ${COLORS.gray500};
  text-align: center;
`;

const NearbySection = styled(View)`
  margin-bottom: 16px;
`;

// "카카오맵으로 보기"와 "복사"를 나란히 두는 줄.
const LocationButtonRow = styled(View)`
  flex-direction: row;
  gap: 8px;
`;

const KakaoMapButton = styled(TouchableOpacity)`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-vertical: 12px;
  border-radius: 10px;
  background-color: ${COLORS.coral500};
`;

const KakaoMapButtonLabel = styled(Text)`
  font-family: ${FONT.medium};
  font-size: 13px;
  color: ${COLORS.white};
`;

const CopyButton = styled(TouchableOpacity)`
  padding-horizontal: 16px;
  border-radius: 10px;
  background-color: ${COLORS.coral500};
  align-items: center;
  justify-content: center;
`;

const CopyButtonLabel = styled(Text)`
  font-family: ${FONT.medium};
  font-size: 13px;
  color: ${COLORS.white};
`;

// 제목 바로 아래, 참고 디자인처럼 지역과 실내 여부를 아이콘+글자로 나란히 보여주는 줄.
const MetaRow = styled(View)`
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 12px;
`;

const MetaItem = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

const MetaText = styled(Text)`
  font-family: ${FONT.medium};
  font-size: 13px;
  color: ${COLORS.gray700};
`;

// 운영시간·휴무일·주차 등 상세 조회에서만 내려오는 항목들 — 아이콘 + 라벨 + 값 형태로
// 한 줄씩 나열한다. 값이 없는 항목(reservationRequired가 null인 경우가 특히 흔하다)은
// 통째로 안 보여준다. 배경을 채운 박스 대신, 참고 디자인처럼 각 줄 아래 얇은 구분선만
// 그어서 더 깔끔하게 보이게 한다(마지막 줄은 구분선 없음).
const InfoTable = styled(View)`
  margin-bottom: 16px;
  border-width: 1px;
  border-color: ${COLORS.coral300};
  border-radius: 12px;
  padding: 4px 16px;
`;

const InfoTableRow = styled(View)<{ $showDivider: boolean }>`
  flex-direction: row;
  align-items: flex-start;
  gap: 10px;
  padding-vertical: 10px;
  border-bottom-width: ${({ $showDivider }) => ($showDivider ? 1 : 0)}px;
  border-bottom-color: ${COLORS.coral300};
`;

const InfoTableLabel = styled(Text)`
  width: 60px;
  font-family: ${FONT.medium};
  font-size: 13px;
  color: ${COLORS.gray500};
  /* InfoTableValue와 line-height를 맞춰야 라벨·값·아이콘이 같은 줄에서 높이가 안 어긋난다. */
  line-height: 19px;
`;

const InfoTableValue = styled(Text)`
  flex: 1;
  font-family: ${FONT.medium};
  font-size: 13px;
  color: ${COLORS.gray900};
  line-height: 19px;
`;

const CenterBox = styled(View)`
  height: 260px;
  align-items: center;
  justify-content: center;
`;

const ErrorText = styled(Text)`
  font-family: ${FONT.regular};
  font-size: 13px;
  color: ${COLORS.gray500};
`;

// 백엔드 원본(TourAPI)이 줄바꿈을 <br> 태그로 넣어서 준다(예: "11:30~18:00<br>- 마지막 주문 17:00").
// RN Text는 HTML을 해석 안 해서 그대로 두면 "<br>" 글자가 그대로 보이므로 줄바꿈으로 바꿔준다.
function withLineBreaks(text: string): string {
  return text.replace(/<br\s*\/?>/gi, '\n');
}

// 소개 문구가 이 줄 수를 넘으면 접어두고 "더 보기"로 펼칠 수 있게 한다.
const SUMMARY_COLLAPSED_LINES = 3;

// 화면 맨 아래 고정된 바 — 찜 버튼(정사각형)과 "여행 바구니에 담기" 버튼(나머지 폭)을 나란히 둔다.
const BottomBar = styled(View)`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-top-width: 1px;
  border-top-color: ${COLORS.gray200};
  background-color: ${COLORS.white};
`;

const BasketButton = styled(TouchableOpacity)<{ $active: boolean }>`
  flex: 1;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-vertical: 14px;
  border-radius: 12px;
  background-color: ${({ $active }) => ($active ? COLORS.white : COLORS.coral500)};
  border-width: 1px;
  border-color: ${COLORS.coral500};
`;

const BasketButtonLabel = styled(Text)<{ $active: boolean }>`
  font-family: ${FONT.medium};
  font-size: 16px;
  color: ${({ $active }) => ($active ? COLORS.coral500 : COLORS.white)};
`;

// 콘텐츠 카드에서 "상세 설명"을 누르면 여는 화면. 원래는 모달(팝업 시트)이었는데,
// 뒤로가기·헤더 없이 화면 위에 겹쳐 뜨는 방식이 다른 화면들과 이질감이 있어서 일반
// 스택 화면으로 바꿨다 — 네이티브 헤더의 뒤로가기 버튼(RootNavigator의 headerScreenOptions)이
// 닫기 버튼을 대신한다.
export function ContentDetailScreen({
  contentId,
  favorite = false,
  onToggleFavorite,
  onTitleReady,
  inBasket = false,
  onToggleBasket,
  onPressNearby,
}: ContentDetailScreenProps) {
  const {
    data: content,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['content-detail', contentId],
    queryFn: () => fetchContentDetail(contentId),
  });
  const { data: nearbyItems } = useNearbyContents(contentId, 3);

  const category = content && CATEGORIES.find((c) => c.id === content.category);
  const regionName = content && REGIONS.find((r) => r.id === content.regionId)?.name;

  // 마지막 줄엔 구분선을 안 그어야 해서, 값 있는 행만 미리 걸러 목록으로 만들어둔다
  // (JSX 안에서 필터링하면 몇 번째가 마지막인지 알기 번거롭다).
  const infoRows = content
    ? [
        {
          icon: category?.icon ?? ('pricetag-outline' as const),
          label: '카테고리',
          value: category?.label ?? null,
        },
        { icon: 'location-outline' as const, label: '주소', value: content.address },
        { icon: 'time-outline' as const, label: '운영시간', value: content.useTime },
        { icon: 'calendar-outline' as const, label: '휴무일', value: content.restDate },
        { icon: 'car-outline' as const, label: '주차', value: content.parking },
        { icon: 'hourglass-outline' as const, label: '예상 체류', value: content.stayDuration },
        { icon: 'bookmark-outline' as const, label: '예약', value: content.reservationRequired },
      ].filter((row) => row.value)
    : [];

  // biome-ignore lint/correctness/useExhaustiveDependencies: content.name이 처음 확정될 때 한 번만 반영하면 된다
  useEffect(() => {
    if (content) onTitleReady?.(content.name);
  }, [content?.name]);

  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  // 3줄을 넘는 소개만 "더 보기" 토글을 보여준다 — 짧은 소개엔 눌러도 아무 변화 없는
  // 버튼이 뜨면 안 되니, 실제로 넘치는지 SummaryMeasure의 onTextLayout으로 먼저 재본다.
  const [summaryOverflows, setSummaryOverflows] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const carouselRef = useRef<ScrollView>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  // "복사됨" 표시를 되돌리는 타이머가 다 울리기 전에 화면을 나가면(뒤로가기), 이미 사라진
  // 화면의 상태를 뒤늦게 바꾸려는 시도가 남는다. ref에 잡아뒀다가 언마운트 시 정리한다.
  const addressCopiedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (addressCopiedTimerRef.current) clearTimeout(addressCopiedTimerRef.current);
    };
  }, []);

  const handleCopyAddress = async () => {
    if (!content) return;
    await Clipboard.setStringAsync(content.address);
    setAddressCopied(true);
    if (addressCopiedTimerRef.current) clearTimeout(addressCopiedTimerRef.current);
    addressCopiedTimerRef.current = setTimeout(() => setAddressCopied(false), 1500);
  };

  // 카카오맵 앱이 깔려있으면 앱으로, 없으면 웹으로 열리는 범용 링크라 별도 딥링크 스킴
  // 권한 설정 없이 Linking.openURL 하나로 된다.
  const openInKakaoMap = () => {
    if (!content) return;
    const url = `https://map.kakao.com/link/map/${encodeURIComponent(content.name)},${content.latitude},${content.longitude}`;
    Linking.openURL(url);
  };

  const handleCarouselScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveImageIndex(index);
  };

  return (
    // 네이티브 헤더가 이미 상태표시줄 영역을 차지하고 있어서, SafeAreaView의 상단 여백까지
    // 더해지면 헤더와 사진 사이에 빈 틈이 생긴다. top을 빼서 사진이 헤더 바로 아래에 붙게 한다.
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {isLoading && <ContentDetailSkeleton />}
        {isError && (
          <CenterBox>
            <ErrorText>정보를 불러오지 못했습니다.</ErrorText>
          </CenterBox>
        )}
        {content && (
          <>
            {content.images.length > 0 ? (
              <ImageCarouselWrapper>
                <ScrollView
                  ref={carouselRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={handleCarouselScrollEnd}
                >
                  {content.images.map((uri, index) => (
                    // TourAPI 원본 데이터에 같은 사진 URL이 두 번 들어있는 경우가 있어서 uri를
                    // key로 쓰면 중복될 수 있다 — 이 배열은 콘텐츠 상세를 새로 열 때마다(화면
                    // 자체가 새로 마운트되므로) 통째로 새로 오는 정적 목록이라 인덱스를 key로
                    // 써도 안전하다.
                    // biome-ignore lint/suspicious/noArrayIndexKey: 위 설명 참고
                    <CarouselImage key={index} source={{ uri }} resizeMode="cover" />
                  ))}
                </ScrollView>
                {content.images.length > 1 && (
                  <>
                    <DotRow>
                      {content.images.map((_, index) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: 위 CarouselImage와 같은 이유
                        <Dot key={index} $active={index === activeImageIndex} />
                      ))}
                    </DotRow>
                    <ImageCounterBadge>
                      <ImageCounterText>
                        {activeImageIndex + 1} / {content.images.length}
                      </ImageCounterText>
                    </ImageCounterBadge>
                  </>
                )}
              </ImageCarouselWrapper>
            ) : (
              <DetailThumbnail $color={category?.color ?? COLORS.gray400}>
                <Ionicons
                  name={category?.icon ?? 'location-outline'}
                  size={48}
                  color={COLORS.gray500}
                />
              </DetailThumbnail>
            )}
            <Body>
              <ContentName>{content.name}</ContentName>
              {(regionName || content.indoor) && (
                <MetaRow>
                  {regionName && (
                    <MetaItem>
                      <Ionicons name="location-outline" size={13} color={COLORS.gray700} />
                      <MetaText>{regionName}</MetaText>
                    </MetaItem>
                  )}
                  {content.indoor && (
                    <MetaItem>
                      <Ionicons name="home-outline" size={13} color={COLORS.gray700} />
                      <MetaText>실내 콘텐츠</MetaText>
                    </MetaItem>
                  )}
                </MetaRow>
              )}
              <InfoTable>
                {infoRows.map((row, index) => (
                  <InfoTableRow key={row.label} $showDivider={index < infoRows.length - 1}>
                    {/* 라벨·값은 line-height 19px인데 아이콘은 14px라, flex-start로 맞추면
                        아이콘이 첫 줄보다 위로 붕 떠 보인다(값이 여러 줄이라 center로는 못
                        맞춤 — 그러면 라벨이 전체 블록 가운데로 떠버린다). 그 차이(2.5px)만큼
                        내려서 첫 줄과 높이를 맞춘다. */}
                    <Ionicons
                      name={row.icon}
                      size={14}
                      color={COLORS.gray500}
                      style={{ marginTop: 2 }}
                    />
                    <InfoTableLabel>{row.label}</InfoTableLabel>
                    <InfoTableValue>{withLineBreaks(row.value as string)}</InfoTableValue>
                  </InfoTableRow>
                ))}
              </InfoTable>
              {content.summary !== '' && (
                <SummarySection>
                  <SectionTitle>소개</SectionTitle>
                  <Summary numberOfLines={isSummaryExpanded ? undefined : SUMMARY_COLLAPSED_LINES}>
                    {content.summary}
                  </Summary>
                  {/* 화면엔 안 보이고 줄 수만 재서, 실제로 넘칠 때만 토글을 보여준다 */}
                  <SummaryMeasure
                    onTextLayout={(e) =>
                      setSummaryOverflows(e.nativeEvent.lines.length > SUMMARY_COLLAPSED_LINES)
                    }
                  >
                    {content.summary}
                  </SummaryMeasure>
                  {summaryOverflows && (
                    <ExpandToggle
                      onPress={() => setIsSummaryExpanded((prev) => !prev)}
                      activeOpacity={0.7}
                    >
                      <ExpandToggleLabel>
                        {isSummaryExpanded ? '접기' : '더 보기'}
                      </ExpandToggleLabel>
                      <Ionicons
                        name={isSummaryExpanded ? 'chevron-up' : 'chevron-down'}
                        size={12}
                        color={COLORS.gray500}
                      />
                    </ExpandToggle>
                  )}
                </SummarySection>
              )}
              <LocationSection>
                <SectionTitle>위치</SectionTitle>
                <MapWrapper>
                  {KAKAO_MAP_JS_KEY ? (
                    <WebView
                      originWhitelist={['*']}
                      scrollEnabled={false}
                      // baseUrl은 일부러 안 준다 — buildKakaoMapHtml 상단 주석 참고.
                      source={{
                        html: buildKakaoMapHtml({
                          appKey: KAKAO_MAP_JS_KEY,
                          latitude: content.latitude,
                          longitude: content.longitude,
                          label: content.name,
                        }),
                      }}
                    />
                  ) : (
                    <MapPlaceholder>
                      <MapPlaceholderText>
                        카카오맵 키가 아직 설정되지 않았어요.{'\n'}
                        EXPO_PUBLIC_KAKAO_MAP_JS_KEY를 .env에 추가해주세요.
                      </MapPlaceholderText>
                    </MapPlaceholder>
                  )}
                </MapWrapper>
                <LocationButtonRow>
                  <KakaoMapButton onPress={openInKakaoMap} activeOpacity={0.7}>
                    <Ionicons name="map-outline" size={14} color={COLORS.white} />
                    <KakaoMapButtonLabel>카카오맵으로 보기</KakaoMapButtonLabel>
                  </KakaoMapButton>
                  <CopyButton onPress={handleCopyAddress} activeOpacity={0.7}>
                    <CopyButtonLabel>{addressCopied ? '복사됨' : '주소 복사'}</CopyButtonLabel>
                  </CopyButton>
                </LocationButtonRow>
              </LocationSection>
              {onPressNearby && nearbyItems != null && nearbyItems.length > 0 && (
                <NearbySection>
                  <SectionTitle>주변 콘텐츠</SectionTitle>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}
                  >
                    {nearbyItems.map((item) => (
                      <NearbyContentCard
                        key={item.contentId}
                        item={item}
                        onPress={() => onPressNearby(item.contentId)}
                      />
                    ))}
                  </ScrollView>
                </NearbySection>
              )}
            </Body>
          </>
        )}
      </ScrollView>
      {content && onToggleBasket && (
        <BottomBar>
          {onToggleFavorite && (
            <SquareFavoriteButton active={favorite} onPress={() => onToggleFavorite(content)} />
          )}
          <BasketButton
            $active={inBasket}
            onPress={() => onToggleBasket(content)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={inBasket ? 'checkmark' : 'add'}
              size={18}
              color={inBasket ? COLORS.coral500 : COLORS.white}
            />
            <BasketButtonLabel $active={inBasket}>
              {inBasket ? '여행 바구니에 담았어요' : '여행 바구니에 담기'}
            </BasketButtonLabel>
          </BasketButton>
        </BottomBar>
      )}
    </ScreenContainer>
  );
}
