import { describe, expect, it } from "vitest";

import { createInMemoryEventStore } from "./inMemoryEventStore.js";
import { cellState, fold } from "./fold.js";
import type {
  DayValueSet,
  Event,
  EventId,
  LoggingDate,
  TopicCreated,
  TopicId,
} from "./events.js";

// --- brand helpers and event builders (mirror fold.test.ts conventions) ---

const tid = (s: string) => s as TopicId;
const ld = (s: string) => s as LoggingDate;

const create = (topic: string, ts: number): TopicCreated => ({
  type: "TopicCreated",
  event_id: `c-${topic}-${ts}` as EventId,
  ts,
  topic_id: tid(topic),
  name: topic,
  color: "#000000",
  scale: { levels: 5 },
});

const setv = (
  topic: string,
  date: string,
  rank: number,
  ts: number,
): DayValueSet => ({
  type: "DayValueSet",
  event_id: `s-${topic}-${date}-${ts}` as EventId,
  ts,
  topic_id: tid(topic),
  logging_date: ld(date),
  rank,
});

describe("EventStore (in-memory round-trip)", () => {
  it("round-trips the log so a fold of read() matches a fold of the originals", async () => {
    // The contract that justifies persistence: what comes back out, folded, must
    // be exactly the state the same events fold to in memory. This pins that the
    // store neither drops, reorders into a different fold, nor mutates events.
    const events: Event[] = [
      create("mood", 1000),
      setv("mood", "2024-06-01", 3, 2000),
      setv("mood", "2024-06-02", 1, 3000),
      setv("mood", "2024-06-01", 4, 4000), // edit-by-append: later ts wins
    ];

    const store = createInMemoryEventStore();
    await store.append(events);
    const reloaded = await store.read();

    expect(fold(reloaded)).toEqual(fold(events));
  });

  it("accumulates across separate append calls without dropping earlier events", async () => {
    // Append-only (CLAUDE.md invariant 4): a second append adds to the log, never
    // replaces it. read() returns the union in append order.
    const store = createInMemoryEventStore();
    const batch1: Event[] = [create("mood", 1000), setv("mood", "2024-06-01", 2, 2000)];
    const batch2: Event[] = [setv("mood", "2024-06-02", 3, 3000)];

    await store.append(batch1);
    await store.append(batch2);

    expect(await store.read()).toEqual([...batch1, ...batch2]);
  });

  it("preserves missing vs. rank 0 across the round-trip", async () => {
    // Invariant 1 must survive storage: a stored rank-0 stays "set", and a
    // never-logged day stays "absent" — they must not collapse.
    const store = createInMemoryEventStore();
    await store.append([create("mood", 1000), setv("mood", "2024-06-01", 0, 2000)]);

    const state = fold(await store.read());

    expect(cellState(state, tid("mood"), ld("2024-06-01"))).toEqual({
      kind: "set",
      rank: 0,
    });
    expect(cellState(state, tid("mood"), ld("2024-06-02"))).toEqual({
      kind: "absent",
    });
  });

  it("is not corrupted by mutating the array returned from read()", async () => {
    // read() hands back a defensive copy; a caller mutating it must not reach back
    // into the held log (which would be a covert delete/edit of the append-only log).
    const store = createInMemoryEventStore();
    await store.append([create("mood", 1000)]);

    const first = await store.read();
    (first as Event[]).push(setv("mood", "2024-06-01", 2, 2000));
    (first as Event[]).length = 0;

    expect(await store.read()).toEqual([create("mood", 1000)]);
  });

  it("does not retain a reference to the caller's appended array", async () => {
    // Symmetric defense: mutating the batch after append must not alter the log.
    const store = createInMemoryEventStore();
    const batch: Event[] = [create("mood", 1000)];
    await store.append(batch);
    batch.push(setv("mood", "2024-06-01", 2, 2000));

    expect(await store.read()).toEqual([create("mood", 1000)]);
  });
});
