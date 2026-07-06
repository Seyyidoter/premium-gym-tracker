export type CalendarDay = {
  dateKey: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function todayDateKey(): string {
  return toDateKey(new Date());
}

export function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateKey: string, offset: number): string {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + offset);
  return toDateKey(date);
}

export function formatReadableDate(dateKey: string): string {
  return fromDateKey(dateKey).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}

export function formatMonthTitle(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function getMonthRange(date: Date): { end: string; start: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    start: toDateKey(start),
    end: toDateKey(end),
  };
}

export function getMonthGrid(date: Date): CalendarDay[] {
  const today = todayDateKey();
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const gridStart = new Date(monthStart.getTime());
  const gridEnd = new Date(monthEnd.getTime());

  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));

  const dayCount =
    Math.round((gridEnd.getTime() - gridStart.getTime()) / DAY_IN_MS) + 1;

  return Array.from({ length: dayCount }, (_, index) => {
    const dateItem = new Date(gridStart.getTime());
    dateItem.setDate(gridStart.getDate() + index);
    const dateKey = toDateKey(dateItem);

    return {
      dateKey,
      dayOfMonth: dateItem.getDate(),
      isCurrentMonth: dateItem.getMonth() === date.getMonth(),
      isToday: dateKey === today,
    };
  });
}

export function moveMonth(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}
