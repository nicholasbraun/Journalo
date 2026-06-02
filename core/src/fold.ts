import type {
  Event,
  EventId,
  LoggingDate,
  Rank,
  Scale,
  TopicCreated,
  TopicId,
} from "./events.js";

// The state of a single topic. `scale.levels` is fixed at creation; `name`,
// `color`, and `scale.labels` are display fields that later edits can change.
// `deleted` is a soft-hide: a deleted topic stays here (with its history) so the
// data is never lost; views filter it out via `activeTopics`.
export type TopicState = {
  readonly id: TopicId;
  readonly name: string;
  readonly color: string;
  readonly scale: Scale;
  readonly deleted: boolean;
};

// The value of one (topic, day) cell. A tagged union — NOT `Rank | null` — so a
// logged rank 0 (`{kind:"set", rank:0}`) can never be confused with a never-logged
// day (`{kind:"absent"}`, which has no rank to read). This is the type-level form
// of CLAUDE.md invariant 1: missing is not zero. Callers must narrow on `kind`
// before touching a rank, so absence cannot silently decay into 0.
//
// "absent" is a strictly-initial state: every cell begins absent and, once any
// DayValueSet lands, is set permanently. Its rank can still change (a later
// DayValueSet wins), but it never returns to absent — there is no clear event.
// Absent and rank 0 remain structurally distinct regardless (invariant 1); this
// only narrows when absent is reachable, never whether it is distinct from 0.
export type CellState =
  | { readonly kind: "set"; readonly rank: Rank }
  | { readonly kind: "absent" };

// Materialized UI state: the fold's output. `cells` holds ONLY set cells; an
// absent cell is the absence of an entry, so missing and rank 0 have structurally
// different representations even in storage.
export type State = {
  readonly topics: ReadonlyMap<TopicId, TopicState>;
  readonly cells: ReadonlyMap<TopicId, ReadonlyMap<LoggingDate, Rank>>;
};

// Strict "is event A after event B?" over the total order (ts, then event_id).
// `ts` orders by time; `event_id` breaks exact-ts ties so the order is total and
// the fold converges to the same state regardless of input order. event_id must
// be unique per event (the shell guarantees this).
const isAfter = (
  aTs: number,
  aId: EventId,
  bTs: number,
  bId: EventId,
): boolean => (aTs !== bTs ? aTs > bTs : aId > bId);

// Per-field latest-wins accumulator: remembers the winning value and the
// (ts, event_id) that set it, so a newer event for the same field replaces it.
type FieldWinner<T> = { value: T; ts: number; id: EventId };

const takeLater = <T>(
  cur: FieldWinner<T> | undefined,
  value: T,
  ts: number,
  id: EventId,
): FieldWinner<T> =>
  cur === undefined || isAfter(ts, id, cur.ts, cur.id)
    ? { value, ts, id }
    : cur;

// Working accumulator for one topic while reducing the log. Display fields resolve
// independently (a single edit may touch only one of them), so each keeps its own
// winner; `scale.levels` comes solely from creation and never changes.
type TopicAcc = {
  created: FieldWinner<TopicCreated> | undefined;
  name: FieldWinner<string> | undefined;
  color: FieldWinner<string> | undefined;
  labels: FieldWinner<readonly string[]> | undefined;
  deleted: boolean;
};

// Working accumulator for one cell: the latest-wins DayValueSet for that
// (topic, day). There is only one observation event, so a cell that has any
// accumulator is necessarily set — the (ts, event_id)-max picks the winning rank.
type CellAcc = { rank: Rank; ts: number; id: EventId };

// Reduce an append-only event log into materialized state. The fold is the single
// source of truth (CLAUDE.md invariant 4): there is no parallel mutable state.
//
// Order-independence: every key (topic field, cell) keeps the maximum event under
// the total order (ts, event_id). Max over a total order is commutative and
// associative, so any permutation of the log yields the same result — what makes
// a future log-merge/sync safe.
export function fold(events: readonly Event[]): State {
  const topics = new Map<TopicId, TopicAcc>();
  // Cells are nested (topic -> date -> cell) which mirrors the year-grid access
  // pattern (all of one topic's days) and avoids composite-key encoding.
  const cells = new Map<TopicId, Map<LoggingDate, CellAcc>>();

  const topicAcc = (id: TopicId): TopicAcc => {
    let acc = topics.get(id);
    if (acc === undefined) {
      acc = { created: undefined, name: undefined, color: undefined, labels: undefined, deleted: false };
      topics.set(id, acc);
    }
    return acc;
  };

  for (const e of events) {
    switch (e.type) {
      case "TopicCreated": {
        const acc = topicAcc(e.topic_id);
        acc.created = takeLater(acc.created, e, e.ts, e.event_id);
        // Creation seeds the display fields; later edits compete against these.
        acc.name = takeLater(acc.name, e.name, e.ts, e.event_id);
        acc.color = takeLater(acc.color, e.color, e.ts, e.event_id);
        if (e.scale.labels !== undefined) {
          acc.labels = takeLater(acc.labels, e.scale.labels, e.ts, e.event_id);
        }
        break;
      }
      case "TopicEdited": {
        const acc = topicAcc(e.topic_id);
        if (e.name !== undefined) acc.name = takeLater(acc.name, e.name, e.ts, e.event_id);
        if (e.color !== undefined) acc.color = takeLater(acc.color, e.color, e.ts, e.event_id);
        if (e.labels !== undefined) acc.labels = takeLater(acc.labels, e.labels, e.ts, e.event_id);
        break;
      }
      case "TopicDeleted": {
        // Deletion is monotonic and has no un-delete event, so a single flag is
        // order-independent — no need to track which delete "won".
        topicAcc(e.topic_id).deleted = true;
        break;
      }
      case "DayValueSet": {
        let byDate = cells.get(e.topic_id);
        if (byDate === undefined) {
          byDate = new Map<LoggingDate, CellAcc>();
          cells.set(e.topic_id, byDate);
        }
        // Key by the event's STORED logging_date — never recomputed from `ts`
        // (CLAUDE.md invariant 3). A later boundary-setting change must not move
        // already-recorded cells.
        const cur = byDate.get(e.logging_date);
        if (cur === undefined || isAfter(e.ts, e.event_id, cur.ts, cur.id)) {
          byDate.set(e.logging_date, { rank: e.rank, ts: e.ts, id: e.event_id });
        }
        break;
      }
    }
  }

  // Finalize topics: only those actually created become real topics; stray edits
  // or deletes for an uncreated id stay inert (retained data, just not surfaced).
  const outTopics = new Map<TopicId, TopicState>();
  for (const [id, acc] of topics) {
    if (acc.created === undefined) continue;
    const created = acc.created.value;
    outTopics.set(id, {
      id,
      name: acc.name?.value ?? created.name,
      color: acc.color?.value ?? created.color,
      scale:
        acc.labels !== undefined
          ? { levels: created.scale.levels, labels: acc.labels.value }
          : { levels: created.scale.levels },
      deleted: acc.deleted,
    });
  }

  // Finalize cells: each accumulated cell is a logged value, so it becomes a rank
  // entry (absent cells were never recorded and so have no accumulator at all).
  // Cells are kept regardless of whether the topic exists, so no observation is
  // ever dropped.
  const outCells = new Map<TopicId, ReadonlyMap<LoggingDate, Rank>>();
  for (const [id, byDate] of cells) {
    const ranks = new Map<LoggingDate, Rank>();
    for (const [date, cell] of byDate) {
      ranks.set(date, cell.rank);
    }
    if (ranks.size > 0) outCells.set(id, ranks);
  }

  return { topics: outTopics, cells: outCells };
}

// Look up one cell, returning the explicit absent variant when nothing is logged
// (no entry). Callers switch on `kind`, so they cannot read a rank off an absent
// day — preserving missing ≠ rank 0 at the API boundary.
export function cellState(
  state: State,
  topicId: TopicId,
  loggingDate: LoggingDate,
): CellState {
  const rank = state.cells.get(topicId)?.get(loggingDate);
  return rank === undefined ? { kind: "absent" } : { kind: "set", rank };
}

// Topics to show in active views: everything not soft-deleted. Deleted topics
// remain in `state.topics` (with their history) for undo/export.
export function activeTopics(state: State): TopicState[] {
  return [...state.topics.values()].filter((t) => !t.deleted);
}
