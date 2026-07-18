export interface ItineraryStop {
  contentId: string;
  day: number;
  startTime: string;
  endTime: string;
  reason: string;
}

export interface Itinerary {
  totalDays: number;
  stops: ItineraryStop[];
}
