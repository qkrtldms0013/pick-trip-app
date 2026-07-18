import type { ItineraryStop } from './itinerary';
import type { Priority } from './priority';

export interface SavedItinerary {
  selectedRegions: string[];
  selectedIds: string[];
  priorities: Record<string, Priority>;
  stops: ItineraryStop[];
  savedAt: string;
}
