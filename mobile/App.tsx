import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  fold,
  loggingDateFor,
  type Event,
  type EventId,
  type LoggingDate,
  type Rank,
  type TimeOfDay,
  type TopicId,
  type WallClock,
} from '@journal/core';

import { QuickLogScreen } from './src/quicklog/QuickLogScreen';
import { SEED_TOPICS } from './src/quicklog/seed';
import { createSqliteEventStore } from './src/storage/sqliteEventStore';

// The logging-day boundary as a hardcoded default for now. Making it a user setting
// is a later session; this is the FIRST place the boundary drives the UI — it decides
// which calendar day a value lands on (ARCHITECTURE.md §5, CLAUDE.md invariant 3).
const BOUNDARY: TimeOfDay = { hour: 4, minute: 0 };

// Local civil wall-clock right now, as the components loggingDateFor expects. We read
// the device clock here (the shell's job — core stays platform-free and cannot read a
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

// Format a "YYYY-MM-DD" logging date into the header's "Tue · 02 Jun" label. Parsed as
// a civil date (local Date), purely for display — never fed back into the domain.
function formatDateLabel(date: LoggingDate): string {
  const [y, m, d] = date.split('-').map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${wd} · ${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
}

// Unique-per-event id without a dependency: a monotonic counter paired with the wall
// clock. Sufficient under the single-device, single-process model — it satisfies both
// the fold's (ts, event_id) tie-breaker and the store's UNIQUE column. (expo-crypto
// UUIDs would be the move if events were ever generated concurrently across devices.)
let eventSeq = 0;
const nextEventId = (): EventId => `${Date.now()}-${eventSeq++}` as EventId;

export default function App() {
  // The append-only log held in memory; the fold over it is the single source of
  // truth for what the screen shows (CLAUDE.md invariant 4). `null` = still loading.
  const [events, setEvents] = useState<Event[] | null>(null);
  const [store, setStore] = useState<Awaited<ReturnType<typeof createSqliteEventStore>> | null>(null);

  // Today's logging day, computed once on mount. Memoized so the cell lookups in the
  // screen key off a stable value across re-renders.
  const today = useMemo(() => loggingDateFor(wallClockNow(), BOUNDARY), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await createSqliteEventStore();
      // Seed the throwaway topics only when the log is empty, so a relaunch restores
      // what was persisted (including any values logged last run) instead of
      // re-seeding. Mirrors the smoke harness this replaces.
      const existing = await s.read();
      if (existing.length === 0) {
        await s.append(SEED_TOPICS);
      }
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

  // Tap handler: append a DayValueSet for (topic, today, rank). We write through to
  // the store AND append to the in-memory log, then let the fold re-derive — no DB
  // round-trip per tap, and no parallel mutable state that could drift from the log.
  const onSet = (topicId: TopicId, rank: Rank) => {
    if (store === null) return;
    const event: Event = {
      type: 'DayValueSet',
      event_id: nextEventId(),
      ts: Date.now(),
      topic_id: topicId,
      logging_date: today,
      rank,
    };
    void store.append([event]);
    setEvents((prev) => [...(prev ?? []), event]);
  };

  if (events === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      <QuickLogScreen
        state={state}
        loggingDate={today}
        dateLabel={formatDateLabel(today)}
        onSet={onSet}
      />
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F1E9' },
});
