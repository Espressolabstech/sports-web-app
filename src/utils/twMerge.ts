import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Convert "HH:MM" 24-hour string to "h:mm AM/PM". Hour may exceed 23 (e.g.
 * "25:30") to represent a time past midnight on the following day, for
 * venues/sessions that run overnight — this renders the real wall-clock time
 * (e.g. "25:30" -> "1:30 AM"). Use `timeDayOffset` if you need to know it
 * fell on the next day.
 */
export function formatTime(t: string): string {
    const [h, m] = t.split(':').map(Number);
    const realHour = h % 24;
    const period = realHour >= 12 ? 'PM' : 'AM';
    const hour = realHour % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

/** How many calendar days past the reference date an extended "HH:MM" (hour may exceed 23) falls on. 0 = same day. */
export function timeDayOffset(t: string): number {
    const [h] = t.split(':').map(Number);
    return Math.floor(h / 24);
}

/**
 * Combines a "YYYY-MM-DD" date with an extended "HH:MM" time (hour may
 * exceed 23) into a real Date, rolling the date forward for every 24 hours
 * in the time value.
 */
export function combineDateAndTime(dateStr: string, hhmm: string): Date {
    const [h, m] = hhmm.split(':').map(Number);
    const dayOffset = Math.floor(h / 24);
    const realHour = h % 24;
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(realHour, m, 0, 0);
    return date;
}
