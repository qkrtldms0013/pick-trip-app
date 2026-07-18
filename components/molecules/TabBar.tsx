import { Text, TouchableOpacity, View } from 'react-native';
import styled from 'styled-components';
import { COLORS } from '../../constants/colors';

export type TabKey = 'home' | 'explore' | 'basket' | 'profile';

interface Tab {
  key: TabKey;
  label: string;
  emoji: string;
}

const TABS: Tab[] = [
  { key: 'home', label: '홈', emoji: '🏠' },
  { key: 'explore', label: '탐색', emoji: '🔍' },
  { key: 'basket', label: '바구니', emoji: '🔖' },
  { key: 'profile', label: '내 정보', emoji: '👤' },
];

interface TabBarProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
  basketCount: number;
}

const Bar = styled(View)`
  flex-direction: row;
  padding-top: 8px;
  padding-bottom: 24px;
  background-color: ${COLORS.white};
  border-top-width: 1px;
  border-top-color: ${COLORS.gray200};
`;

const TabButton = styled(TouchableOpacity)`
  flex: 1;
  align-items: center;
  gap: 3px;
`;

const IconWrapper = styled(View)`
  position: relative;
`;

const IconEmoji = styled(Text)<{ $active: boolean }>`
  font-size: 20px;
  opacity: ${({ $active }) => ($active ? 1 : 0.5)};
`;

const CountBadge = styled(View)`
  position: absolute;
  top: -4px;
  right: -10px;
  background-color: ${COLORS.amber500};
  border-radius: 100px;
  min-width: 15px;
  padding-horizontal: 4px;
  align-items: center;
`;

const CountBadgeLabel = styled(Text)`
  font-size: 10px;
  font-weight: 700;
  color: ${COLORS.white};
`;

const TabLabel = styled(Text)<{ $active: boolean }>`
  font-size: 11px;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active }) => ($active ? COLORS.amber600 : COLORS.gray400)};
`;

export function TabBar({ active, onChange, basketCount }: TabBarProps) {
  return (
    <Bar>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <TabButton key={tab.key} onPress={() => onChange(tab.key)} activeOpacity={0.7}>
            <IconWrapper>
              <IconEmoji $active={isActive}>{tab.emoji}</IconEmoji>
              {tab.key === 'basket' && basketCount > 0 && (
                <CountBadge>
                  <CountBadgeLabel>{basketCount}</CountBadgeLabel>
                </CountBadge>
              )}
            </IconWrapper>
            <TabLabel $active={isActive}>{tab.label}</TabLabel>
          </TabButton>
        );
      })}
    </Bar>
  );
}
