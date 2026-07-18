import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { COLORS } from '../constants/colors';
import { COMPANIONS, STYLE_OPTIONS } from '../constants/companions';
import { REGIONS } from '../constants/regions';
import type { CompanionType, StylePreference } from '../types/companion';

interface ProfileContentProps {
  companion: CompanionType | null;
  stylePrefs: StylePreference[];
  selectedRegions: string[];
  onChangeCompanion: (companion: CompanionType) => void;
  onToggleStylePref: (pref: StylePreference) => void;
  onToggleRegion: (regionId: string) => void;
  onLogout: () => void;
}

const Scroll = styled(ScrollView)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

const Content = styled(View)`
  padding: 16px 20px 32px;
`;

const IdentityCard = styled(View)`
  background-color: ${COLORS.white};
  border-radius: 14px;
  border-width: 1px;
  border-color: ${COLORS.gray200};
  padding: 18px;
  margin-bottom: 16px;
  flex-direction: row;
  align-items: center;
  gap: 14px;
`;

const Avatar = styled(View)`
  width: 56px;
  height: 56px;
  border-radius: 100px;
  background-color: ${COLORS.teal500};
  align-items: center;
  justify-content: center;
`;

const AvatarLabel = styled(Text)`
  font-size: 22px;
  font-weight: 700;
  color: ${COLORS.white};
`;

const IdentityName = styled(Text)`
  font-size: 17px;
  font-weight: 700;
  color: ${COLORS.gray900};
  margin-bottom: 4px;
`;

const IdentitySub = styled(Text)`
  font-size: 13px;
  color: ${COLORS.gray500};
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
  font-weight: 700;
  color: ${COLORS.gray900};
  margin-bottom: 4px;
`;

const CardDesc = styled(Text)`
  font-size: 12px;
  color: ${COLORS.gray500};
  margin-bottom: 14px;
`;

const FieldLabel = styled(Text)`
  font-size: 13px;
  font-weight: 600;
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
  padding-vertical: 8px;
  padding-horizontal: 14px;
  border-radius: 100px;
  border-width: 1px;
  background-color: ${({ $active }) => ($active ? COLORS.amber50 : COLORS.white)};
  border-color: ${({ $active }) => ($active ? COLORS.amber500 : COLORS.gray200)};
`;

const ChipLabel = styled(Text)<{ $active: boolean }>`
  font-size: 13px;
  font-weight: 500;
  color: ${({ $active }) => ($active ? COLORS.amber700 : COLORS.gray700)};
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
  font-weight: 500;
  color: ${COLORS.gray900};
`;

const NotifyDesc = styled(Text)`
  font-size: 12px;
  color: ${COLORS.gray500};
  margin-top: 2px;
`;

const Toggle = styled(TouchableOpacity)<{ $on: boolean }>`
  width: 46px;
  height: 28px;
  border-radius: 100px;
  background-color: ${({ $on }) => ($on ? COLORS.amber500 : COLORS.gray200)};
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
`;

const LogoutLabel = styled(Text)`
  font-size: 14px;
  font-weight: 500;
  color: ${COLORS.gray500};
`;

const NOTIFY_ROWS = [
  { key: 'recommend', title: '맞춤 추천 알림', desc: '취향에 맞는 새 콘텐츠 알림' },
  { key: 'festival', title: '축제·행사 알림', desc: '선호 지역 축제 일정' },
  { key: 'trip', title: '여행 리마인더', desc: '출발 전 일정 알림' },
] as const;

export function ProfileContent({
  companion,
  stylePrefs,
  selectedRegions,
  onChangeCompanion,
  onToggleStylePref,
  onToggleRegion,
  onLogout,
}: ProfileContentProps) {
  const [notifyState, setNotifyState] = useState<Record<string, boolean>>({
    recommend: true,
    festival: true,
    trip: false,
  });

  return (
    <Scroll showsVerticalScrollIndicator={false}>
      <Content>
        <IdentityCard>
          <Avatar>
            <AvatarLabel>P</AvatarLabel>
          </Avatar>
          <View>
            <IdentityName>PickTrip 여행자</IdentityName>
            <IdentitySub>게스트로 둘러보는 중</IdentitySub>
          </View>
        </IdentityCard>

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
                <ChipLabel $active={companion === c.id}>
                  {c.emoji} {c.label}
                </ChipLabel>
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
          {NOTIFY_ROWS.map((row, index) => (
            <NotifyRow key={row.key} $last={index === NOTIFY_ROWS.length - 1}>
              <View>
                <NotifyTitle>{row.title}</NotifyTitle>
                <NotifyDesc>{row.desc}</NotifyDesc>
              </View>
              <Toggle
                $on={notifyState[row.key]}
                onPress={() => setNotifyState((prev) => ({ ...prev, [row.key]: !prev[row.key] }))}
                activeOpacity={0.8}
              >
                <ToggleKnob $on={notifyState[row.key]} />
              </Toggle>
            </NotifyRow>
          ))}
        </Card>

        <LogoutButton onPress={onLogout} activeOpacity={0.8}>
          <LogoutLabel>로그아웃</LogoutLabel>
        </LogoutButton>
      </Content>
    </Scroll>
  );
}
