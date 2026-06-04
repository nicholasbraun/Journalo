import { cellState, type LoggingDate, type State, type TopicId } from '@journal/core';

// Calendar/iteration helpers for the year grid. These are pure display concerns and
// live in the shell: core ships no day-iteration helpers (it makes no assumption about
// which ranges a UI wants), and a civil calendar is a platform-date concern, not domain.

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

// The grid always lays out 31 day-rows so every month column aligns; months with fewer
// days leave the trailing rows blank (see YearGrid). 31 is the row count, not a per-month
// truth — `daysInMonth` decides which of those rows are real.
export const MAX_DAYS_IN_MONTH = 31;

// Days that carry a printed row label down the left edge (the rest stay blank to keep the
// labels sparse and legible). Mirrors the design handoff's DAY_LABELS.
export const LABELLED_DAYS = new Set([1, 8, 15, 22, 29]);

// Real day count of a civil month. `monthIndex0` is 0-based (Jan = 0); day 0 of the next
// month is the last day of this one.
export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

// Build the "YYYY-MM-DD" key for a civil date so it matches the format `loggingDateFor`
// freezes into events — letting it key `cellState` directly. `monthIndex0`/`day` are the
// calendar position; this does NOT apply the logging-day boundary (that only shifts values
// at log time, never how a stored date is displayed on the grid).
export function loggingDateKey(year: number, monthIndex0: number, day: number): LoggingDate {
  return `${year}-${pad2(monthIndex0 + 1)}-${pad2(day)}` as LoggingDate;
}

// The years the selector can page through: from the earliest logged year across all topics
// up to the current civil year (so the in-progress year is always reachable, even with no
// data yet). Falls back to just the current year when the log is empty.
export function dataYears(state: State): number[] {
  const currentYear = new Date().getFullYear();
  let minYear = currentYear;
  for (const byDate of state.cells.values()) {
    for (const date of byDate.keys()) {
      const year = Number(date.slice(0, 4));
      if (year < minYear) minYear = year;
    }
  }
  const years: number[] = [];
  for (let y = minYear; y <= currentYear; y++) years.push(y);
  return years;
}

// Logged-vs-missing tally for one topic over a year's real days. "Missing" counts only
// genuine calendar days that were never logged — absent is distinct from any rank
// (CLAUDE.md invariant 1), so an absent cell is missing, never a zero.
export function coverage(
  state: State,
  topicId: TopicId,
  year: number,
): { logged: number; missing: number } {
  let logged = 0;
  let missing = 0;
  for (let m = 0; m < 12; m++) {
    const dim = daysInMonth(year, m);
    for (let d = 1; d <= dim; d++) {
      const cell = cellState(state, topicId, loggingDateKey(year, m, d));
      if (cell.kind === 'set') logged++;
      else missing++;
    }
  }
  return { logged, missing };
}
