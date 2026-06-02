import type { LoggingDate, TimeOfDay } from "./events.js";

// Local wall-clock time at the moment of logging, as civil-calendar components.
// month and day are 1-based (June is month 6) to match how a human reads a date.
// We take components rather than an epoch instant deliberately: the logging-day
// boundary is a *local* time-of-day, so the date depends on local civil time, not
// on an absolute instant — and a pure, platform-free core cannot read the device
// timezone. The shell extracts these from its local clock; core stays deterministic.
export type WallClock = {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
};

const DEFAULT_BOUNDARY: TimeOfDay = { hour: 4, minute: 0 };

const pad2 = (n: number): string => String(n).padStart(2, "0");

// Decide which logging date a wall-clock time falls on, given the logging-day
// boundary (default 04:00). This result is frozen into DayValueSet/Clear at log
// time and never recomputed (CLAUDE.md invariant 3): re-deriving it in the fold
// would let a later boundary change silently rewrite the dates of past values.
//
// Mechanism: shift the time back by the boundary offset, then read the calendar
// date of the shifted instant. A time before the boundary shifts into the
// previous day; the boundary instant itself shifts to 00:00 of the new day. We do
// the arithmetic via Date.UTC + getUTC* so month/year/leap-day rollovers are
// correct and the computation is timezone-independent (UTC accessors never
// consult the host timezone), keeping the function pure and deterministic.
export function loggingDateFor(
  wall: WallClock,
  boundary: TimeOfDay = DEFAULT_BOUNDARY,
): LoggingDate {
  const boundaryMs = (boundary.hour * 60 + boundary.minute) * 60_000;
  const shifted = new Date(
    Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute) -
      boundaryMs,
  );
  const iso = `${shifted.getUTCFullYear()}-${pad2(
    shifted.getUTCMonth() + 1,
  )}-${pad2(shifted.getUTCDate())}`;
  return iso as LoggingDate;
}
