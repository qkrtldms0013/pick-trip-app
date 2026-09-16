import { REGIONS } from '../constants/regions';
import type { SavedItinerarySummary } from '../services/itineraryHistoryStorage';
import { addDays, fromDateString } from './tripDate';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;
}

// 홈/마이페이지의 "저장한 여행" 카드에서 공통으로 쓰는 부제 텍스트("영주 · 8월 9일(일) · 1박 2일").
export function formatItinerarySub(summary: SavedItinerarySummary): string {
  const regionName = REGIONS.find((r) => r.id === summary.region)?.name;
  const parts = [regionName].filter((v): v is string => Boolean(v));
  if (summary.travelDate) {
    const date = fromDateString(summary.travelDate);
    const nights = summary.duration ?? 0;
    const durationLabel = nights > 0 ? `${nights}박 ${nights + 1}일` : '당일치기';
    parts.push(`${formatDate(date)} · ${durationLabel}`);
  }
  return parts.join(' · ');
}

export interface TripBadge {
  label: string;
  // upcoming: 여행일이 오늘이거나 미래라 코랄(강조) 톤. past: 이미 지난 여행이라 회색 톤.
  tone: 'upcoming' | 'past';
}

// 홈 "저장한 여행" 카드 위에 얹는 D-day 뱃지. 여행일을 아직 안 정한 일정(travelDate가 없는
// 게스트용 임시 일정 등)은 뱃지 자체를 안 보여준다.
//
// "지난 여행"은 여행이 다 끝난 뒤여야 맞으므로, 시작일뿐 아니라 duration으로 구한 종료일까지
// 봐서 판단한다(formatDateRange와 같은 end = addDays(start, duration) 계산) — 안 그러면 1박
// 이상인 여행은 둘째 날부터 아직 진행 중인데도 "지난 여행"으로 잘못 분류된다.
export function getTripBadge(travelDate: string | null, duration: number | null): TripBadge | null {
  if (!travelDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = fromDateString(travelDate);
  start.setHours(0, 0, 0, 0);
  const end = duration && duration > 0 ? addDays(start, duration) : start;
  end.setHours(0, 0, 0, 0);

  const diffToStart = Math.round((start.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffToStart > 0) return { label: `D-${diffToStart}`, tone: 'upcoming' };
  if (diffToStart === 0) return { label: 'D-DAY', tone: 'upcoming' };
  // 시작일은 지났지만 종료일이 아직 안 지났으면 여행 중이다.
  if (end.getTime() >= today.getTime()) return { label: '여행 중', tone: 'upcoming' };
  return { label: '지난 여행', tone: 'past' };
}
