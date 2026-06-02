import { describe, expect, it } from "vitest";

import { loggingDateFor } from "./loggingDate.js";
import type { LoggingDate, TimeOfDay } from "./events.js";

// Compare a branded LoggingDate against a plain "YYYY-MM-DD" literal without
// fighting the brand in every assertion.
const eq = (actual: LoggingDate, expected: string) =>
  expect(actual as string).toBe(expected);

describe("loggingDateFor", () => {
  // The defining property of the logging-day boundary: a timestamp just before
  // the boundary belongs to the previous logging day; just after, to the new one.
  it("splits the day at the boundary (03:59 vs 04:01 under 04:00)", () => {
    const boundary: TimeOfDay = { hour: 4, minute: 0 };
    eq(
      loggingDateFor({ year: 2024, month: 6, day: 15, hour: 3, minute: 59 }, boundary),
      "2024-06-14",
    );
    eq(
      loggingDateFor({ year: 2024, month: 6, day: 15, hour: 4, minute: 1 }, boundary),
      "2024-06-15",
    );
  });

  // The boundary instant itself is the start of the new logging day.
  it("treats the exact boundary as the new day", () => {
    eq(
      loggingDateFor(
        { year: 2024, month: 6, day: 15, hour: 4, minute: 0 },
        { hour: 4, minute: 0 },
      ),
      "2024-06-15",
    );
  });

  it("defaults the boundary to 04:00 when omitted", () => {
    eq(
      loggingDateFor({ year: 2024, month: 6, day: 15, hour: 3, minute: 59 }),
      "2024-06-14",
    );
    eq(
      loggingDateFor({ year: 2024, month: 6, day: 15, hour: 4, minute: 1 }),
      "2024-06-15",
    );
  });

  // Falling back across a month boundary must respect real calendar lengths,
  // including leap days — hence the Date.UTC-based arithmetic.
  it("rolls back across month and year boundaries (incl. leap day)", () => {
    eq(
      loggingDateFor({ year: 2024, month: 3, day: 1, hour: 3, minute: 59 }),
      "2024-02-29",
    );
    eq(
      loggingDateFor({ year: 2024, month: 1, day: 1, hour: 2, minute: 0 }),
      "2023-12-31",
    );
  });

  // A midnight boundary makes the logging date identical to the calendar date for
  // every wall-clock time of day.
  it("with a 00:00 boundary, logging date equals calendar date all day", () => {
    const midnight: TimeOfDay = { hour: 0, minute: 0 };
    eq(loggingDateFor({ year: 2024, month: 6, day: 15, hour: 0, minute: 0 }, midnight), "2024-06-15");
    eq(loggingDateFor({ year: 2024, month: 6, day: 15, hour: 23, minute: 59 }, midnight), "2024-06-15");
  });

  it("honors a non-default boundary (06:00)", () => {
    const sixAm: TimeOfDay = { hour: 6, minute: 0 };
    eq(loggingDateFor({ year: 2024, month: 6, day: 15, hour: 5, minute: 59 }, sixAm), "2024-06-14");
    eq(loggingDateFor({ year: 2024, month: 6, day: 15, hour: 6, minute: 0 }, sixAm), "2024-06-15");
  });
});
