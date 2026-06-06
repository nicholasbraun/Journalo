import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, AppState, StyleSheet, View } from 'react-native';

import {
  fold,
  loggingDateFor,
  type Event,
  type EventId,
  type LoggingDate,
  type Rank,
  type Scale,
  type State,
  type TopicId,
  type WallClock,
} from '@journal/core';

import { theme } from '../ui/theme';
import { useSettings } from '../settings/SettingsProvider';
import { createSqliteEventStore } from '../storage/sqliteEventStore';

// Owns the app's journal state and exposes it to every route. Under Expo Router there
// is no single App component to hold this (each screen is mounted independently by the
// router), so the store + in-memory event log + fold live here, in a provider mounted
// once at the router root. The fold over the append-only log stays the single source of
// truth (CLAUDE.md invariant 4) — relocating it from a screen's state to a context
// changes where it lives, not how it works: handlers still write through to the store
// and append-then-refold, with no parallel mutable state that could drift from the log.

// Local civil wall-clock right now, as the components loggingDateFor expects. We read the
// device clock here (the shell's job — core stays platform-free and cannot read a
// timezone); month/day are made 1-based to match the core's WallClock contract.
function wallClockNow(): WallClock {
  const d = new Date();
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Format a "YYYY-MM-DD" logging date into the header's "Tue · 02 Jun" label. Parsed as a
// civil date (local Date), purely for display — never fed back into the domain.
function formatDateLabel(date: LoggingDate): string {
  const [y, m, d] = date.split('-').map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${wd} · ${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

// Unique-per-event id without a dependency: a monotonic counter paired with the wall
// clock. Sufficient under the single-device, single-process model — it satisfies both the
// fold's (ts, event_id) tie-breaker and the store's UNIQUE column. The fold compares
// event_id *lexicographically* (fold.ts `isAfter`), so the counter is zero-padded: without
// it "…-9" would sort after "…-10" and a same-millisecond tie would resolve against
// creation order. Six digits covers far more than a single millisecond's writes; an
// overflow only ever breaks the tie-break for two events in the very same ms, never
// uniqueness. (expo-crypto UUIDs would be the move if events were ever generated
// concurrently across devices.)
let eventSeq = 0;
const nextEventId = (): EventId =>
  `${Date.now()}-${String(eventSeq++).padStart(6, '0')}` as EventId;

// Topic ids follow the same single-process, monotonic scheme as event ids: they only need
// to be unique within this device's log. Prefixed so they read distinctly from event ids
// in the stored JSON.
let topicSeq = 0;
const nextTopicId = (): TopicId => `topic-${Date.now()}-${topicSeq++}` as TopicId;

// The journal surface every screen consumes. `state` is the fold; `loggingDate`/`dateLabel`
// are today's logging day and its display label; the two mutators append events.
type Journal = {
  readonly state: State;
  readonly loggingDate: LoggingDate;
  readonly dateLabel: string;
  // Append a DayValueSet for (topic, today, rank). Re-tapping is just a later set.
  readonly setValue: (topicId: TopicId, rank: Rank) => void;
  // Append a TopicCreated; the shell mints the ids and timestamp the UI shouldn't know.
  readonly createTopic: (input: { name: string; color: string; scale: Scale }) => void;
};

const JournalContext = createContext<Journal | null>(null);

// Access the journal. Throws if used outside the provider so a mis-wired route fails loudly
// rather than rendering against an empty fold.
export function useJournal(): Journal {
  const journal = useContext(JournalContext);
  if (journal === null) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return journal;
}

export function JournalProvider({ children }: { children: ReactNode }) {
  // The append-only log held in memory; the fold over it is the single source of truth for
  // what the screens show. `null` = still loading from the store.
  const [events, setEvents] = useState<Event[] | null>(null);
  const [store, setStore] = useState<Awaited<ReturnType<typeof createSqliteEventStore>> | null>(null);

  // The user's logging-day boundary. This is the one place the boundary feeds the domain: it
  // decides which calendar day a value lands on (ARCHITECTURE.md §5, CLAUDE.md invariant 3).
  const { boundary } = useSettings();

  // Today's logging day under the current boundary, held in state rather than a bare memo
  // because wall-clock time advances while the provider stays mounted. A mobile JS process
  // routinely survives in the background across a logging-day boundary, so a value derived
  // only from `boundary` would go stale and make screens show the wrong day. We refresh it
  // when the boundary changes and whenever the app returns to the foreground. (Writes don't
  // rely on this staying perfectly fresh — setValue re-derives the date at tap time below.)
  // This is the *future* half of freeze semantics; the *past* half needs nothing here, since
  // each stored event keeps its own frozen logging_date that the fold reads verbatim.
  const [today, setToday] = useState<LoggingDate>(() => loggingDateFor(wallClockNow(), boundary));
  useEffect(() => {
    const refresh = () => setToday(loggingDateFor(wallClockNow(), boundary));
    refresh();
    const sub = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });
    return () => sub.remove();
  }, [boundary]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await createSqliteEventStore();
      // The app starts empty: a fresh install has no topics until the user creates one. The
      // log is the persisted source of truth, so a relaunch restores exactly what was saved.
      const loaded = await s.read();
      if (!cancelled) {
        setStore(s);
        setEvents([...loaded]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const state = useMemo(() => fold(events ?? []), [events]);

  const journal = useMemo<Journal | null>(() => {
    if (events === null || store === null) return null;

    // Write through to the store AND append to the in-memory log, then let the fold
    // re-derive — no DB round-trip per render, and no parallel mutable state to drift.
    // The optimistic in-memory append happens first so the UI updates immediately; if the
    // store write then rejects (disk full, the event_id UNIQUE guard, a locked db) we roll
    // the event back out of the log. Without that, memory and disk silently diverge and the
    // value vanishes on the next launch with no signal — worse than a visible failure.
    const persist = (event: Event) => {
      setEvents((prev) => [...(prev ?? []), event]);
      store.append([event]).catch((err: unknown) => {
        console.warn('journal: failed to persist event, rolling back', err);
        setEvents((prev) => prev?.filter((e) => e.event_id !== event.event_id) ?? null);
      });
    };

    const setValue = (topicId: TopicId, rank: Rank) => {
      const event: Event = {
        type: 'DayValueSet',
        event_id: nextEventId(),
        ts: Date.now(),
        topic_id: topicId,
        // Re-derive the logging day at the moment of the tap rather than reusing the
        // memoized `today`: an app left foregrounded across the boundary would otherwise
        // stamp the value with the previous day. This is the authoritative write date.
        logging_date: loggingDateFor(wallClockNow(), boundary),
        rank,
      };
      persist(event);
    };

    const createTopic = (input: { name: string; color: string; scale: Scale }) => {
      const event: Event = {
        type: 'TopicCreated',
        event_id: nextEventId(),
        ts: Date.now(),
        topic_id: nextTopicId(),
        name: input.name,
        color: input.color,
        scale: input.scale,
      };
      persist(event);
    };

    return { state, loggingDate: today, dateLabel: formatDateLabel(today), setValue, createTopic };
  }, [events, store, state, today, boundary]);

  // Gate the routes on the initial load, exactly as the old App did before showing a screen.
  // Rendering the navigator only once data is ready is the standard splash-until-loaded
  // pattern and keeps screens from flashing against an empty fold.
  if (journal === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return <JournalContext.Provider value={journal}>{children}</JournalContext.Provider>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.paper },
});
