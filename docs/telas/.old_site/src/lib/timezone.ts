import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { addDays, startOfDay, parseISO, format as dateFnsFormat, type Locale } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Fortaleza, Brazil timezone (UTC-3)
export const APP_TIMEZONE = 'America/Fortaleza';

/**
 * Convert a UTC date to the app's timezone (Fortaleza, Brazil - UTC-3)
 */
export function toAppTimezone(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObj, APP_TIMEZONE);
}

/**
 * Convert a date from app timezone to UTC (for saving to database)
 */
export function fromAppTimezone(date: Date): Date {
  return fromZonedTime(date, APP_TIMEZONE);
}

/**
 * Get the start of day in app timezone
 * This is useful for grouping orders by day
 */
export function startOfDayInAppTimezone(date: Date | string): Date {
  const zonedDate = toAppTimezone(date);
  return startOfDay(zonedDate);
}

/**
 * Get the current date/time in app timezone
 */
export function nowInAppTimezone(): Date {
  return toZonedTime(new Date(), APP_TIMEZONE);
}

/**
 * Format a date in app timezone with the specified format
 */
export function formatInAppTimezone(
  date: Date | string,
  formatStr: string,
  options?: { locale?: Locale }
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObj, APP_TIMEZONE, formatStr, {
    locale: options?.locale ?? ptBR,
  });
}

/**
 * Get the date key (yyyy-MM-dd) for grouping, based on app timezone
 */
export function getDateKeyInAppTimezone(date: Date | string): string {
  return formatInAppTimezone(date, 'yyyy-MM-dd');
}

/**
 * Date key for due-date fields stored as timestamps (often midnight UTC).
 * We treat due dates as date-only and prefer the ISO date part when available,
 * to avoid timezone day-shift issues.
 */
export function getDueDateKey(date: Date | string): string {
  if (typeof date === "string") {
    const s = date.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  }
  return getDateKeyInAppTimezone(date);
}

/**
 * Check if a date is today in app timezone
 */
export function isTodayInAppTimezone(date: Date | string): boolean {
  const dateKey = getDateKeyInAppTimezone(date);
  const todayKey = getDateKeyInAppTimezone(new Date());
  return dateKey === todayKey;
}

/**
 * Get today's date string (yyyy-MM-dd) in app timezone
 */
export function getTodayInAppTimezone(): string {
  return getDateKeyInAppTimezone(new Date());
}

/**
 * Milliseconds until the next day starts (00:00) in app timezone.
 * Useful for scheduling "day rollover" updates without polling.
 */
export function msUntilNextDayInAppTimezone(now: Date = new Date()): number {
  const nextStartInAppTz = addDays(startOfDayInAppTimezone(now), 1);
  const nextStartUtc = fromAppTimezone(nextStartInAppTz);
  return nextStartUtc.getTime() - now.getTime();
}
