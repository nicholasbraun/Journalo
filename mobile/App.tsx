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

import { createInMemoryEventStore } from './src/storage/inMemoryEventStore';

// THROWAWAY storage smoke. Exercises the load -> append -> reload -> fold cycle
// through the mobile adapter at runtime, with no real UI. Delete this whole block
// (and the on-screen counts) when the quick-log screen becomes the real logging
// surface — it exists only to prove the seam end-to-end on-device this session.
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
      const store = createInMemoryEventStore();
      await store.append(SMOKE_EVENTS);
      const reloaded = await store.read();
      const state = fold(reloaded);
      const cellCount = [...state.cells.values()].reduce((n, byDate) => n + byDate.size, 0);
      if (!cancelled) {
        setSummary(`folded ${state.topics.size} topic(s), ${cellCount} cell(s)`);
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
