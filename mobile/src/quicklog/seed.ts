import type { Event, EventId, TopicId } from '@journal/core';

// THROWAWAY seed — there is no topic-creation UI yet (its own later session), so we
// plant a few realistic topics programmatically just so the quick-log screen has
// something to render. Same spirit as the storage smoke harness this replaces.
//
// Deliberately ONLY TopicCreated events — no DayValueSet. The screen must open with
// every topic UN-LOGGED so the empty-selector invariant is the first thing visible
// (CLAUDE.md invariant 2: nothing pre-selected). The handoff's `data.js` pre-fills a
// couple of values for a mid-completion screenshot; we intentionally do NOT carry
// that over — logging is the user's tap, not seeded state.
//
// Low fixed `ts` values keep these structure events ordered before any value the
// user logs at runtime. event_ids are stable so a relaunch reads back the same
// topics instead of re-seeding (App seeds only when the log is empty).
export const SEED_TOPICS: readonly Event[] = [
  {
    type: 'TopicCreated',
    event_id: 'seed-ibs' as EventId,
    ts: 1,
    topic_id: 'ibs' as TopicId,
    name: 'IBS',
    color: '#C0552E', // warm red-orange
    scale: { levels: 5, labels: ['none', 'mild', 'moderate', 'bad', 'severe'] },
  },
  {
    type: 'TopicCreated',
    event_id: 'seed-mood' as EventId,
    ts: 2,
    topic_id: 'mood' as TopicId,
    name: 'Mood',
    color: '#5A5BC4', // indigo
    scale: { levels: 5, labels: ['very low', 'low', 'ok', 'good', 'great'] },
  },
  {
    type: 'TopicCreated',
    event_id: 'seed-sleep' as EventId,
    ts: 3,
    topic_id: 'sleep' as TopicId,
    name: 'Slept well',
    color: '#A23E9C', // magenta — a binary yes/no topic
    scale: { levels: 2, labels: ['no', 'yes'] },
  },
];
