import type { Content } from '../types/content';
import type { ItineraryStop } from '../types/itinerary';

interface BuildShareTextInput {
  stops: ItineraryStop[];
  contentById: Record<string, Content>;
}

export function buildShareText({ stops, contentById }: BuildShareTextInput): string {
  const days = [1, 2];
  return days
    .map((day) => {
      const lines = stops
        .filter((stop) => stop.day === day)
        .map(
          (stop) => `${stop.startTime}-${stop.endTime} ${contentById[stop.contentId]?.name ?? ''}`,
        );
      return [`${day}일차`, ...lines].join('\n');
    })
    .join('\n\n');
}
