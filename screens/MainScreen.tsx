import { useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import styled from 'styled-components';
import { TabBar, type TabKey } from '../components/molecules/TabBar';
import { COLORS } from '../constants/colors';
import type { CompanionType, StylePreference } from '../types/companion';
import { BasketContent } from './BasketContent';
import { ContentExploreScreen } from './ContentExploreScreen';
import { HomeContent } from './HomeContent';
import { ProfileContent } from './ProfileContent';

interface MainScreenProps {
  companionLabel: string;
  companion: CompanionType | null;
  stylePrefs: StylePreference[];
  selectedRegions: string[];
  selectedIds: string[];
  onToggleContent: (contentId: string) => void;
  onChangeCompanion: (companion: CompanionType) => void;
  onToggleStylePref: (pref: StylePreference) => void;
  onToggleRegion: (regionId: string) => void;
  onCreateItinerary: () => void;
  onLogout: () => void;
}

const ScreenContainer = styled(SafeAreaView)`
  flex: 1;
  background-color: ${COLORS.gray50};
`;

const Body = styled(View)`
  flex: 1;
`;

export function MainScreen({
  companionLabel,
  companion,
  stylePrefs,
  selectedRegions,
  selectedIds,
  onToggleContent,
  onChangeCompanion,
  onToggleStylePref,
  onToggleRegion,
  onCreateItinerary,
  onLogout,
}: MainScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  return (
    <ScreenContainer>
      <Body>
        {activeTab === 'home' && (
          <HomeContent
            companionLabel={companionLabel}
            selectedRegions={selectedRegions}
            selectedIds={selectedIds}
            onBrowse={() => setActiveTab('explore')}
            onOpenBasket={() => setActiveTab('basket')}
          />
        )}
        {activeTab === 'explore' && (
          <ContentExploreScreen
            selectedRegions={selectedRegions}
            selectedIds={selectedIds}
            onToggle={onToggleContent}
            onContinue={onCreateItinerary}
          />
        )}
        {activeTab === 'basket' && (
          <BasketContent
            selectedIds={selectedIds}
            onToggle={onToggleContent}
            onCreateItinerary={onCreateItinerary}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileContent
            companion={companion}
            stylePrefs={stylePrefs}
            selectedRegions={selectedRegions}
            onChangeCompanion={onChangeCompanion}
            onToggleStylePref={onToggleStylePref}
            onToggleRegion={onToggleRegion}
            onLogout={onLogout}
          />
        )}
      </Body>
      <TabBar active={activeTab} onChange={setActiveTab} basketCount={selectedIds.length} />
    </ScreenContainer>
  );
}
