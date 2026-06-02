import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  fold,
  type Event,
  type EventId,
  type LoggingDate,
  type TopicId,
} from '@journal/core';

import { createSqliteEventStore } from './src/storage/sqliteEventStore';

// THROWAWAY storage smoke. Proves the DURABLE round-trip on-device: events appended
// through the SQLite adapter survive being read back through a fresh store instance
// (an independent connection to the on-disk database = a simulated app restart) and
// fold to the correct state. Delete this whole block (and the on-screen counts) when
// the quick-log screen becomes the real logging surface — it exists only to prove
// the seam end-to-end this session.
//
// Because the data persists, the seed is written only once: the first launch SEEDS,
// every real relaunch RESTORES the same events from disk — visible proof the
// round-trip survived process death.
const SMOKE_EVENTS: Event[] = [
  {
    type: 'TopicCreated',
    event_id: 'smoke-create-mood' as EventId,
    ts: 1000,
    topic_id: 'mood' as TopicId,
    name: 'Mood',
    color: '#4488cc',
    scale: { levels: 5 },
  },
  {
    type: 'DayValueSet',
    event_id: 'smoke-set-mood-1' as EventId,
    ts: 2000,
    topic_id: 'mood' as TopicId,
    logging_date: '2024-06-01' as LoggingDate,
    rank: 3,
  },
];

export default function App() {
  const [summary, setSummary] = useState('running storage smoke…');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Open the store and seed only if the log is empty — so a relaunch reads
      // what the previous launch persisted instead of re-appending.
      const store = await createSqliteEventStore();
      const existing = await store.read();
      const seededThisRun = existing.length === 0;
      if (seededThisRun) {
        await store.append(SMOKE_EVENTS);
      }

      // Read back through a FRESH store instance — an independent connection to the
      // same on-disk database, standing in for an app restart — then fold.
      const fresh = await createSqliteEventStore();
      const reloaded = await fresh.read();
      const state = fold(reloaded);
      const cellCount = [...state.cells.values()].reduce((n, byDate) => n + byDate.size, 0);
      if (!cancelled) {
        const origin = seededThisRun ? 'seeded this run' : 'restored from disk';
        setSummary(
          `${origin}: folded ${state.topics.size} topic(s), ${cellCount} cell(s) ` +
            `from ${reloaded.length} persisted event(s)`,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text>Journal — scaffolding placeholder</Text>
      <Text>storage smoke: {summary}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
