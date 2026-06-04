import Storage from 'expo-sqlite/kv-store';

import { DEFAULT_BOUNDARY, type TimeOfDay } from '@journal/core';

// Durable storage for the app's settings. Unlike the event log (an append-only
// history in sqliteEventStore), settings are a single mutable record of *current*
// preferences — there is no history to keep, so a key-value blob is the right shape,
// not an event table.
//
// Engine: expo-sqlite/kv-store, the AsyncStorage-compatible key-value API that ships
// with the expo-sqlite dependency we already use (no new package). Verified against
// the SDK 56 docs (https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/), not memory.
// It is backed by the same SQLite layer, so it inherits the backup-safe placement
// the event store relies on (ARCHITECTURE.md §6).

// The persisted settings. `reminderEnabled`/`reminderTime` are display/behavior
// settings (ARCHITECTURE.md §5) — no data consequence. `boundary` is the one *domain*
// setting: it decides which logging date future values land on. Its freeze semantics
// (a change affects only future logging; past values keep their stored logging_date)
// are guaranteed elsewhere — the fold reads each event's stored logging_date and never
// recomputes it (CLAUDE.md invariant 3) — so persisting only the *current* boundary
// here is correct: there is no per-day boundary history to retain.
export type Settings = {
  readonly reminderEnabled: boolean;
  readonly reminderTime: TimeOfDay;
  readonly boundary: TimeOfDay;
};

// A fresh install reminds at 9:00 PM with the reminder on, and uses the canonical
// logging-day boundary from core (04:00) so the default isn't re-hardcoded here.
export const DEFAULT_SETTINGS: Settings = {
  reminderEnabled: true,
  reminderTime: { hour: 21, minute: 0 },
  boundary: DEFAULT_BOUNDARY,
};

const STORAGE_KEY = 'journal.settings';

// Load persisted settings, falling back to DEFAULT_SETTINGS for a fresh install or any
// unreadable/corrupt value. We swallow parse errors deliberately: settings are
// non-critical preferences, so a bad blob should reset to defaults rather than crash
// the app on launch (the event log, the real data, is stored separately and untouched).
export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await Storage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    // Merge over defaults so a blob written by an older build (missing a newer field)
    // still yields a complete, valid Settings.
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await Storage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
