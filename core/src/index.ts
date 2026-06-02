// @journal/core — platform-agnostic domain package: the event log, the fold that
// reduces it into UI state, and the logging-day rule. No persistence, no UI, no
// platform dependencies (see ARCHITECTURE.md §4 and CLAUDE.md).

export type {
  Event,
  TopicCreated,
  TopicEdited,
  TopicDeleted,
  DayValueSet,
  DayValueClear,
  TopicId,
  EventId,
  LoggingDate,
  Rank,
  Scale,
  TimeOfDay,
} from "./events.js";

export { loggingDateFor } from "./loggingDate.js";
export type { WallClock } from "./loggingDate.js";

export { fold, cellState, activeTopics } from "./fold.js";
export type { State, TopicState, CellState } from "./fold.js";

// Storage port (the core declares what it needs; the shell supplies the adapter)
// plus a volatile reference implementation used in tests and the throwaway harness.
export type { EventStore } from "./eventStore.js";
export { createInMemoryEventStore } from "./inMemoryEventStore.js";

// Retained only for the mobile shell's wiring smoke (App.tsx). Remove once the
// shell imports real domain code instead.
export const CORE_READY = true;
