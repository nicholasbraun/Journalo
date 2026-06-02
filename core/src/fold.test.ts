import { describe, expect, it } from "vitest";

import { activeTopics, cellState, fold } from "./fold.js";
import type {
  DayValueSet,
  EventId,
  Event,
  LoggingDate,
  Scale,
  TopicCreated,
  TopicDeleted,
  TopicEdited,
  TopicId,
} from "./events.js";

// --- brand helpers and event builders (keep the tests readable) ---

const tid = (s: string) => s as TopicId;
const ld = (s: string) => s as LoggingDate;

const create = (
  topic: string,
  ts: number,
  opts: { event_id?: string; name?: string; color?: string; scale?: Scale } = {},
): TopicCreated => ({
  type: "TopicCreated",
  event_id: (opts.event_id ?? `c-${topic}-${ts}`) as EventId,
  ts,
  topic_id: tid(topic),
  name: opts.name ?? topic,
  color: opts.color ?? "#000000",
  scale: opts.scale ?? { levels: 5 },
});

const edit = (
  topic: string,
  ts: number,
  fields: { event_id?: string; name?: string; color?: string; labels?: readonly string[] },
): TopicEdited => ({
  type: "TopicEdited",
  event_id: (fields.event_id ?? `e-${topic}-${ts}`) as EventId,
  ts,
  topic_id: tid(topic),
  ...(fields.name !== undefined ? { name: fields.name } : {}),
  ...(fields.color !== undefined ? { color: fields.color } : {}),
  ...(fields.labels !== undefined ? { labels: fields.labels } : {}),
});

const del = (topic: string, ts: number, event_id?: string): TopicDeleted => ({
  type: "TopicDeleted",
  event_id: (event_id ?? `d-${topic}-${ts}`) as EventId,
  ts,
  topic_id: tid(topic),
});

const setv = (
  topic: string,
  date: string,
  rank: number,
  ts: number,
  event_id?: string,
): DayValueSet => ({
  type: "DayValueSet",
  event_id: (event_id ?? `s-${topic}-${date}-${ts}`) as EventId,
  ts,
  topic_id: tid(topic),
  logging_date: ld(date),
  rank,
});

describe("fold", () => {
  it("returns empty state for an empty log", () => {
    const s = fold([]);
    expect(s.topics.size).toBe(0);
    expect(s.cells.size).toBe(0);
  });

  it("materializes a created topic with its scale preserved and not deleted", () => {
    const s = fold([create("mood", 1, { color: "#abc", scale: { levels: 3, labels: ["lo", "mid", "hi"] } })]);
    const t = s.topics.get(tid("mood"));
    expect(t).toBeDefined();
    expect(t?.deleted).toBe(false);
    expect(t?.color).toBe("#abc");
    expect(t?.scale).toEqual({ levels: 3, labels: ["lo", "mid", "hi"] });
  });

  it("applies edits per-field by latest (ts, event_id), leaving scale untouched", () => {
    const s = fold([
      create("mood", 1, { name: "Mood", color: "#111", scale: { levels: 5 } }),
      edit("mood", 5, { color: "#222" }),
      edit("mood", 3, { name: "Mood!" }), // older than the color edit but newest for `name`
    ]);
    const t = s.topics.get(tid("mood"));
    expect(t?.name).toBe("Mood!");
    expect(t?.color).toBe("#222");
    expect(t?.scale).toEqual({ levels: 5 }); // unchanged: there is no scale edit path
  });

  // Invariant 1: a logged rank 0 and a never-logged cell are different facts.
  it("keeps missing distinct from rank 0", () => {
    const s = fold([create("ibs", 1), setv("ibs", "2024-06-15", 0, 2)]);

    const logged = cellState(s, tid("ibs"), ld("2024-06-15"));
    const never = cellState(s, tid("ibs"), ld("2024-06-16"));

    expect(logged).toEqual({ kind: "set", rank: 0 });
    expect(never).toEqual({ kind: "absent" });
    expect(logged).not.toEqual(never);
    // A set cell, even at rank 0, carries kind:"set"; absent carries no rank.
    expect(s.cells.get(tid("ibs"))?.has(ld("2024-06-16"))).toBe(false);
  });

  it("resolves a same-cell edit by latest ts", () => {
    const s = fold([
      create("ibs", 1),
      setv("ibs", "2024-06-15", 1, 10),
      setv("ibs", "2024-06-15", 4, 20),
    ]);
    expect(cellState(s, tid("ibs"), ld("2024-06-15"))).toEqual({ kind: "set", rank: 4 });
  });

  // The tiebreaker: equal ts is resolved by event_id, regardless of array order.
  it("breaks equal-ts ties by event_id deterministically", () => {
    const lowId = setv("ibs", "2024-06-15", 1, 100, "aaa");
    const highId = setv("ibs", "2024-06-15", 4, 100, "zzz");
    const base = create("ibs", 1);

    const a = fold([base, lowId, highId]);
    const b = fold([base, highId, lowId]);
    expect(cellState(a, tid("ibs"), ld("2024-06-15"))).toEqual({ kind: "set", rank: 4 });
    expect(cellState(b, tid("ibs"), ld("2024-06-15"))).toEqual({ kind: "set", rank: 4 });
  });

  // Convergence: folding the same events in any order yields identical state,
  // because the fold is a per-key max over the total order (ts, event_id).
  it("is order-independent (converges)", () => {
    const events: Event[] = [
      create("mood", 1, { color: "#111" }),
      create("ibs", 2),
      edit("mood", 9, { color: "#999" }),
      setv("mood", "2024-06-15", 2, 10),
      setv("mood", "2024-06-15", 3, 20),
      setv("ibs", "2024-06-16", 1, 25),
      del("ibs", 40),
      // an equal-ts pair to force the tiebreaker under reordering
      setv("mood", "2024-06-17", 0, 50, "p"),
      setv("mood", "2024-06-17", 4, 50, "q"),
    ];

    const canonical = (es: Event[]) => {
      const s = fold(es);
      return {
        topics: [...s.topics.entries()].sort((a, b) => a[0].localeCompare(b[0])),
        cells: [...s.cells.entries()]
          .map(([id, m]) => [id, [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))] as const)
          .sort((a, b) => a[0].localeCompare(b[0])),
      };
    };

    const rotate = (es: Event[], k: number) => [...es.slice(k), ...es.slice(0, k)];
    const expected = canonical(events);
    for (const perm of [[...events].reverse(), rotate(events, 3), rotate(events, 7)]) {
      expect(canonical(perm)).toEqual(expected);
    }
  });

  // Invariant 3: the fold keys cells by the event's stored logging_date and never
  // recomputes a date. We store a date unrelated to any wall-clock derivation and
  // assert the cell lands there exactly.
  it("keys cells by the stored logging_date, never recomputing it", () => {
    const s = fold([create("ibs", 1), setv("ibs", "2099-01-01", 3, 1000)]);
    expect(cellState(s, tid("ibs"), ld("2099-01-01"))).toEqual({ kind: "set", rank: 3 });
    expect(s.cells.get(tid("ibs"))?.size).toBe(1);
  });

  // Invariant: soft-delete hides the topic but retains its recorded history.
  it("soft-deletes: marks deleted, retains cells, excludes from activeTopics", () => {
    const s = fold([
      create("mood", 1),
      create("ibs", 2),
      setv("ibs", "2024-06-15", 2, 10),
      del("ibs", 20),
    ]);

    expect(s.topics.get(tid("ibs"))?.deleted).toBe(true);
    expect(cellState(s, tid("ibs"), ld("2024-06-15"))).toEqual({ kind: "set", rank: 2 });

    const active = activeTopics(s).map((t) => t.id);
    expect(active).toContain(tid("mood"));
    expect(active).not.toContain(tid("ibs"));
  });
});
