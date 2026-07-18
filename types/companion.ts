export type CompanionType = 'with_kids' | 'with_parents' | 'whole_family';

export type StylePreference =
  | 'less_walking'
  | 'nature_focused'
  | 'experience_focused'
  | 'food_focused'
  | 'indoor_alternative';

export interface Companion {
  id: CompanionType;
  label: string;
  emoji: string;
  description: string;
}

export interface StyleOption {
  id: StylePreference;
  label: string;
}
