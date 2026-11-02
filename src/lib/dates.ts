import {
  addDays,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfDay,
  startOfWeek,
} from "date-fns";

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

export const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

/** Local calendar date -> "yyyy-MM-dd". */
export function toDateKey(value: number | Date): string {
  return format(value, "yyyy-MM-dd");
}

/** "yyyy-MM-dd" -> local midnight Date, or null when invalid. */
export function parseDateKey(key: string): Date | null {
  const date = parse(key, "yyyy-MM-dd", new Date(0));
  return isValid(date) ? date : null;
}

export function isOverdue(dueDate: string | null, now: number): boolean {
  if (!dueDate) return false;
  const due = parseDateKey(dueDate);
  return due !== null && due.getTime() < startOfDay(now).getTime();
}

export function isDueThisWeek(dueDate: string | null, now: number): boolean {
  if (!dueDate) return false;
  const due = parseDateKey(dueDate);
  if (!due) return false;
  const from = startOfWeek(now, WEEK_OPTIONS).getTime();
  const to = endOfWeek(now, WEEK_OPTIONS).getTime();
  return due.getTime() >= from && due.getTime() <= to;
}

/** Inclusive list of local day starts between two instants. */
export function eachDayStart(from: number, to: number): number[] {
  const days: number[] = [];
  for (let day = startOfDay(from); day.getTime() <= to; day = addDays(day, 1)) {
    days.push(day.getTime());
  }
  return days;
}
