import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedItinerary } from '../types/savedItinerary';

const STORAGE_KEY = 'pick-trip:saved-itinerary';

export async function saveItinerary(data: SavedItinerary): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function loadItinerary(): Promise<SavedItinerary | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as SavedItinerary) : null;
}
