import type { DurationType } from '../types/trip';

// Date를 로컬 기준 yyyy-mm-dd로 만든다.
// toISOString()은 UTC로 바꾸므로, 로컬 자정으로 만든 날짜(날짜 선택기가 만드는 값)가
// UTC+ 지역에서는 하루 앞으로 밀린다. KST에서 8월 9일을 고르면 2026-08-08이 된다.
export function toDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// yyyy-mm-dd를 로컬 자정 Date로 되돌린다.
// new Date('2026-08-09')는 UTC 자정으로 해석되어 UTC- 지역에서 전날이 된다.
export function fromDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// 저장된 박 수로부터 날짜 선택기가 쓰는 기간 종류를 되돌린다.
export function toDurationType(nights: number): DurationType {
  if (nights <= 0) return 'day';
  if (nights === 1) return '1night';
  if (nights === 2) return '2night';
  return 'custom';
}

// 앱 내부에서는 기간을 항상 "박 수"(0=당일치기)로 다룬다. 백엔드는 "일수"(1=당일치기,
// 2=1박2일, 3=2박3일 …)를 쓰기로 팀원과 확인했으므로, API를 주고받는 지점에서만 이 두
// 함수로 변환한다 — 화면/로컬 저장 쪽 코드는 이 차이를 몰라도 되게 유지하기 위함이다.
export function nightsToApiDuration(nights: number | null): number | null {
  return nights === null ? null : nights + 1;
}

export function apiDurationToNights(duration: number | null): number | null {
  return duration === null ? null : duration - 1;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatShort(date: Date): string {
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

// "8.26 (수)" 형태 — 일정 화면의 일차별 날짜 표시에 쓴다.
export function formatDayDate(date: Date): string {
  return `${formatShort(date)} (${WEEKDAYS[date.getDay()]})`;
}

// "8.26 - 8.27" 형태 — 일정 요약 카드의 여행 기간 표시에 쓴다.
export function formatDateRange(travelDate: string | null, duration: number | null): string | null {
  if (!travelDate) return null;
  const start = fromDateString(travelDate);
  if (!duration || duration <= 0) return formatShort(start);
  return `${formatShort(start)} - ${formatShort(addDays(start, duration))}`;
}

// 분을 사람이 읽는 문구("1시간 30분")로 바꾼다. PrioritySelectScreen의 희망 체류시간
// 스테퍼와 formatStayDuration이 같이 쓴다.
export function formatMinutesDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

// "HH:MM"을 자정 기준 분으로 바꾼다. 형식이 아니거나 빈 문자열이면 null.
// 주의: 빈 문자열은 split(':').map(Number)가 [0](Number('')===0)이 되어 h만 채워지고
// m은 undefined가 되는데, Number.isNaN(undefined)는 false라 NaN 검사를 통과해버린다 —
// 반드시 Number.isFinite로 검사해야 한다.
export function parseTimeToMinutes(time: string): number | null {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

// 분을 "HH:MM"으로 바꾼다. 하루(1440분) 범위를 벗어나면 감싼다.
export function minutesToTimeOfDay(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// 시작~종료 시각("HH:MM")으로 체류시간을 사람이 읽는 문구("1시간 30분")로 바꾼다.
// ItineraryResultScreen·SavedItineraryScreen이 같은 스톱 카드 레이아웃을 써서 공용으로 뺐다.
export function formatStayDuration(startTime: string, endTime: string): string | null {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start == null || end == null) return null;
  const diff = end - start;
  if (diff <= 0) return null;
  return formatMinutesDuration(diff);
}
