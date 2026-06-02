import type { Event } from "./events.js";

// The storage port the core declares and a platform shell supplies an adapter for
// (ARCHITECTURE.md §4). Deliberately NARROW: the data model is an append-only
// event log folded into state (CLAUDE.md invariant 4), so the only operations that
// exist are "add events to the end of the log" and "read the whole log to fold on
// startup". There is intentionally NO update, delete, or query — those imply
// mutating the log, which the model forbids; an edit or an undo is itself a new
// appended event (DayValueSet / DayValueClear), not a mutation of a past one.
//
// Async because every realistic adapter (SQLite, AsyncStorage, a file) is async;
// keeping the port async lets the real engine drop in behind it with no signature
// change. `Promise` is a JS built-in, so this stays platform-free and the
// core/mobile boundary guards remain green.
export interface EventStore {
  // Append a batch to the end of the log. A single event is a one-element array.
  // A batch is one logical unit (e.g. the quick-log screen setting several topics
  // at once); adapters should persist it atomically so a partial batch can't be
  // observed. Implementations must not retain the passed array (callers may reuse
  // or mutate it) and must never reorder or drop events.
  append(events: readonly Event[]): Promise<void>;
  // Read the entire log to fold on startup. Order is not required for correctness
  // — the fold is order-independent over (ts, event_id) — but adapters return
  // events in append order. The returned array is the caller's to own: mutating it
  // must not affect the stored log.
  read(): Promise<readonly Event[]>;
}
