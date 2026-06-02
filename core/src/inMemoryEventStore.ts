import type { Event } from "./events.js";
import type { EventStore } from "./eventStore.js";

// A volatile, in-process EventStore. It is the reference implementation of the
// port — it pins what every adapter (including the real persistence engine) must
// do — and the substrate for the round-trip tests, which need an executable store
// that runs in plain TypeScript with no device or platform. It is NOT durable:
// the log lives only for the lifetime of the process.
export function createInMemoryEventStore(): EventStore {
  // Append-only (CLAUDE.md invariant 4): this array only ever grows via push;
  // nothing here updates, reorders, or removes an event.
  const log: Event[] = [];

  return {
    async append(events: readonly Event[]): Promise<void> {
      // Copy element-wise so a later mutation of the caller's array can't reach
      // into the stored log. Events themselves are deeply readonly, so a shallow
      // copy of the array is enough.
      log.push(...events);
    },

    async read(): Promise<readonly Event[]> {
      // Hand back a fresh array so a caller mutating the result can't covertly
      // edit or delete from the append-only log.
      return [...log];
    },
  };
}
