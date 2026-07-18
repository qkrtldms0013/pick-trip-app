import { useEffect, useState } from 'react';
import { COMPANIONS } from './constants/companions';
import { AuthScreen } from './screens/AuthScreen';
import { CompanionSelectScreen } from './screens/CompanionSelectScreen';
import { ItineraryResultScreen } from './screens/ItineraryResultScreen';
import { MainScreen } from './screens/MainScreen';
import { PreparingScreen } from './screens/PreparingScreen';
import { PrioritySelectScreen } from './screens/PrioritySelectScreen';
import { RegionSelectScreen } from './screens/RegionSelectScreen';
import { ResumeItineraryScreen } from './screens/ResumeItineraryScreen';
import { TripDateScreen } from './screens/TripDateScreen';
import { loadItinerary } from './services/itineraryStorage';
import type { CompanionType, StylePreference } from './types/companion';
import type { ItineraryStop } from './types/itinerary';
import type { Priority } from './types/priority';
import type { SavedItinerary } from './types/savedItinerary';

type Screen =
  | 'auth'
  | 'loading'
  | 'resume'
  | 'region'
  | 'date'
  | 'companion'
  | 'preparing'
  | 'main'
  | 'priority'
  | 'itinerary';

export default function App() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [savedItinerary, setSavedItinerary] = useState<SavedItinerary | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<Record<string, Priority>>({});
  const [initialStops, setInitialStops] = useState<ItineraryStop[] | undefined>(undefined);
  const [tripDate, setTripDate] = useState<{
    startDate: Date;
    durationType: string;
    nights: number;
  } | null>(null);
  const [companion, setCompanion] = useState<CompanionType | null>(null);
  const [stylePrefs, setStylePrefs] = useState<StylePreference[]>([]);

  useEffect(() => {
    if (screen !== 'loading') return;
    loadItinerary().then((saved) => {
      if (saved) {
        setSavedItinerary(saved);
        setScreen('resume');
      } else {
        setScreen('region');
      }
    });
  }, [screen]);

  const handleToggleContent = (contentId: string) => {
    setSelectedIds((prev) =>
      prev.includes(contentId) ? prev.filter((id) => id !== contentId) : [...prev, contentId],
    );
  };

  const handleToggleRegion = (regionId: string) => {
    setSelectedRegions((prev) =>
      prev.includes(regionId) ? prev.filter((id) => id !== regionId) : [...prev, regionId],
    );
  };

  const handleToggleStylePref = (pref: StylePreference) => {
    setStylePrefs((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref],
    );
  };

  const handleLogout = () => {
    setSelectedRegions([]);
    setSelectedIds([]);
    setPriorities({});
    setInitialStops(undefined);
    setTripDate(null);
    setCompanion(null);
    setStylePrefs([]);
    setScreen('auth');
  };

  if (screen === 'auth') {
    return (
      <AuthScreen onAuthed={() => setScreen('loading')} onGuest={() => setScreen('loading')} />
    );
  }

  if (screen === 'loading') {
    return null;
  }

  if (screen === 'resume' && savedItinerary) {
    return (
      <ResumeItineraryScreen
        savedAt={savedItinerary.savedAt}
        onResume={() => {
          setSelectedRegions(savedItinerary.selectedRegions);
          setSelectedIds(savedItinerary.selectedIds);
          setPriorities(savedItinerary.priorities);
          setInitialStops(savedItinerary.stops);
          setScreen('itinerary');
        }}
        onStartNew={() => setScreen('region')}
      />
    );
  }

  if (screen === 'region') {
    return (
      <RegionSelectScreen
        onContinue={(regions) => {
          setSelectedRegions(regions);
          setScreen('date');
        }}
      />
    );
  }

  if (screen === 'date') {
    return (
      <TripDateScreen
        onContinue={(date) => {
          setTripDate(date);
          setScreen('companion');
        }}
      />
    );
  }

  if (screen === 'companion') {
    return (
      <CompanionSelectScreen
        onContinue={(selectedCompanion, selectedStylePrefs) => {
          setCompanion(selectedCompanion);
          setStylePrefs(selectedStylePrefs);
          setScreen('preparing');
        }}
      />
    );
  }

  const companionLabel = COMPANIONS.find((c) => c.id === companion)?.label ?? '가족';

  if (screen === 'preparing') {
    return <PreparingScreen companionLabel={companionLabel} onDone={() => setScreen('main')} />;
  }

  if (screen === 'main') {
    return (
      <MainScreen
        companionLabel={companionLabel}
        companion={companion}
        stylePrefs={stylePrefs}
        selectedRegions={selectedRegions}
        selectedIds={selectedIds}
        onToggleContent={handleToggleContent}
        onChangeCompanion={setCompanion}
        onToggleStylePref={handleToggleStylePref}
        onToggleRegion={handleToggleRegion}
        onCreateItinerary={() => setScreen('priority')}
        onLogout={handleLogout}
      />
    );
  }

  if (screen === 'priority') {
    return (
      <PrioritySelectScreen
        selectedIds={selectedIds}
        onContinue={(newPriorities) => {
          setPriorities(newPriorities);
          setScreen('itinerary');
        }}
      />
    );
  }

  return (
    <ItineraryResultScreen
      selectedRegions={selectedRegions}
      selectedIds={selectedIds}
      priorities={priorities}
      initialStops={initialStops}
    />
  );
}
