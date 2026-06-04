import type { TimeOfDay } from '@journal/core';

// Shell-side formatting and arithmetic for a time-of-day. Pure display/util code: it never
// feeds the domain (the boundary value itself is the TimeOfDay; these only render or step it).

// Minutes since midnight — the convenient unit for stepping a time with wraparound.
export const toMinutes = (time: TimeOfDay): number => time.hour * 60 + time.minute;

// Inverse of toMinutes, normalized into a single day so stepping past midnight (either
// direction) wraps rather than overflowing.
export const fromMinutes = (minutes: number): TimeOfDay => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return { hour: Math.floor(m / 60), minute: m % 60 };
};

const pad2 = (n: number): string => String(n).padStart(2, '0');

// 24-hour "HH:MM" — the compact form for the day-boundary cue on the quick-log header.
export const formatHm24 = (time: TimeOfDay): string => `${pad2(time.hour)}:${pad2(time.minute)}`;

// 12-hour "HH:MM AM/PM" — the human form shown in the settings pickers.
export const formatHm12 = (time: TimeOfDay): string => {
  const meridiem = time.hour < 12 ? 'AM' : 'PM';
  const h12 = time.hour % 12 === 0 ? 12 : time.hour % 12;
  return `${pad2(h12)}:${pad2(time.minute)} ${meridiem}`;
};

// Bridges to/from the native time picker, which speaks Date. Only the time-of-day
// is meaningful here; the calendar date is a fixed, ignored reference (the picker
// in `mode="time"` shows only hours/minutes).
export const toDate = (time: TimeOfDay): Date => new Date(2000, 0, 1, time.hour, time.minute);
export const fromDate = (date: Date): TimeOfDay => ({ hour: date.getHours(), minute: date.getMinutes() });
