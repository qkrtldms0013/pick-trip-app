export type Priority = 'must' | 'good' | 'optional';

export const PRIORITY_LABELS: Record<Priority, string> = {
  must: '꼭 가기',
  good: '가면 좋음',
  optional: '시간 남으면',
};

export const PRIORITY_ORDER: Priority[] = ['must', 'good', 'optional'];
