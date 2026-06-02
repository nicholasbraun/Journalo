import type { Event, EventStore } from '@journal/core';

// The mobile shell's adapter for the core EventStore port. For this session it is
// a volatile in-memory implementation — it proves the mobile -> core boundary
// (mobile implements a port core declares) and lets the app exercise the
// append -> read -> fold cycle with no persistence library committed yet.
//
// It is deliberately independent of core's reference implementation: this file is
// where the real, durable engine (SQLite or similar, verified against current Expo
// docs and placed in the platform-backed-up location per ARCHITECTURE.md §6/§8)
// lands in its own session, behind this same unchanged port. Nothing volatile here
// should be relied on across app restarts.
export function createInMemoryEventStore(): EventStore {
  // Append-only (CLAUDE.md invariant 4): grows via push only; never edited.
  const log: Event[] = [];

  return {
    async append(events: readonly Event[]): Promise<void> {
      // Copy in so a later mutation of the caller's array can't reach the log.
      log.push(...events);
    },

    async read(): Promise<readonly Event[]> {
      // Fresh array: a caller mutating the result must not touch the stored log.
      return [...log];
    },
  };
}
