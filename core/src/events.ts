// Event types for the journal domain: the append-only log that the fold reduces
// into UI state. See ARCHITECTURE.md §4. State is never mutated in place — every
// change (create, edit, log, delete) is a new event appended to the log.

// Branded string aliases. These are plain strings at runtime; the brand exists
// only so the type system refuses to mix, say, a TopicId where a LoggingDate is
// expected, or a raw user string where a validated LoggingDate is required.
export type TopicId = string & { readonly __brand: "TopicId" };
export type EventId = string & { readonly __brand: "EventId" };

// A logging date in "YYYY-MM-DD" form. Produced only by `loggingDateFor` so the
// format is guaranteed; never parse arbitrary strings into this type.
export type LoggingDate = string & { readonly __brand: "LoggingDate" };

// An ordered rank within a topic's scale: an integer in 0..scale.levels-1.
// Plain `number` because the valid range depends on the topic's scale, a
// cross-value relationship the type system can't express. The fold and callers
// treat rank as opaque and ordered; meaning ("darker = more") is display-layer.
export type Rank = number;

// A topic's ordered scale. `levels` is the count of ranks (e.g. 5 => ranks 0..4;
// 2 => a binary yes/no topic). Granularity is fixed at topic creation
// (CLAUDE.md invariant 5) — there is deliberately no event that changes it.
export type Scale = {
  readonly levels: number;
  // Optional display-only labels, one per level in rank order when present.
  // Absent labels => the UI shows generic defaults. (labels.length === levels
  // is a documented invariant, not type-enforceable here.)
  readonly labels?: readonly string[];
};

// A time-of-day, used for the logging-day boundary (default 04:00). hour 0..23,
// minute 0..59.
export type TimeOfDay = { readonly hour: number; readonly minute: number };

// Fields every event carries. `ts` is a UTC epoch-millisecond instant used to
// order events (latest wins). `event_id` is an opaque, unique-per-event id set by
// the shell at append time; the domain reads it only to break `ts` ties, giving a
// total order so the fold converges regardless of input order (see fold.ts).
type EventBase = {
  readonly event_id: EventId;
  readonly ts: number;
};

// --- Structure events: define and shape topics. ---

export type TopicCreated = EventBase & {
  readonly type: "TopicCreated";
  readonly topic_id: TopicId;
  readonly name: string;
  readonly color: string;
  readonly scale: Scale;
};

// A retroactive, display-only edit. Each field is optional so an edit can change
// just one thing; an omitted field leaves that field unchanged. Deliberately has
// NO `scale` field: changing granularity would invalidate every rank already
// recorded against the old scale (CLAUDE.md invariant 5), so it is unrepresentable.
export type TopicEdited = EventBase & {
  readonly type: "TopicEdited";
  readonly topic_id: TopicId;
  readonly name?: string;
  readonly color?: string;
  readonly labels?: readonly string[];
};

// Soft-delete: hides the topic from active views but its recorded history is
// retained in the fold (see fold.ts). There is intentionally no un-delete event.
export type TopicDeleted = EventBase & {
  readonly type: "TopicDeleted";
  readonly topic_id: TopicId;
};

// --- Observation events: record a day's value. ---

// Keyed by (topic_id, logging_date). `logging_date` is computed once at log time
// by `loggingDateFor` and frozen into the event (CLAUDE.md invariant 3); the fold
// reads it verbatim and never re-derives it from `ts`.
//
// This is the only observation event: there is deliberately no "clear" event.
// A correction is just a later DayValueSet for the same key, so a cell can move
// between ranks but never returns to absent. A topic's scale is meant to provide
// a rank for every state the user could be in, so a mis-tap is fixed by setting
// a different rank, not by un-logging. Note this does NOT collapse absent into
// rank 0 (CLAUDE.md invariant 1): absent remains a distinct, strictly-initial
// state — see CellState in fold.ts.
export type DayValueSet = EventBase & {
  readonly type: "DayValueSet";
  readonly topic_id: TopicId;
  readonly logging_date: LoggingDate;
  readonly rank: Rank;
};

export type Event =
  | TopicCreated
  | TopicEdited
  | TopicDeleted
  | DayValueSet;
