import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { Event, EventStore } from '@journal/core';

// The mobile shell's durable adapter for the core EventStore port — the real
// engine that replaces the volatile in-memory placeholder, dropped in behind the
// SAME unchanged port (append + read; ARCHITECTURE.md §4, §8).
//
// Engine: expo-sqlite, the maintained first-party SQLite binding for Expo SDK 56,
// New-Architecture compatible. Verified against the SDK 56 docs
// (https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/), not memory.
//
// Backup placement (ARCHITECTURE.md §6): the database is opened with NO `directory`
// argument, so it lands in expo-sqlite's `defaultDatabaseDirectory` — the
// application *documents* directory (the docs note only Apple TV diverges, using
// caches instead). That directory is included in iCloud backup / device transfer on
// iOS (NSDocumentDirectory; excluded only if you set isExcludedFromBackup, which we
// do not) and in Android Auto Backup (covers getFilesDir()/getDatabasePath()). So a
// new phone restores the journal via platform backup with zero extra work. Passing
// an explicit cache/shared directory here would silently break that — keep it
// defaulted.
//
// Scale is deliberately NOT engineered for: a personal daily journal produces
// thousands of events over years, not millions. read() loads the whole log to fold
// on startup, which is fine at that size. No pagination, indexing, streaming, or
// cursor API — they would be unused complexity and would tempt widening the port.

// One row per event. The schema is insert-and-read-in-order only — there is no
// update or delete path, mirroring the append-only model (CLAUDE.md invariant 4):
// an edit or an undo is itself a later appended event, never a mutation of a past
// row.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS events (
    seq      INTEGER PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    data     TEXT NOT NULL
  );
`;
// seq      — rowid alias; a monotonic counter that fixes read order (see read()).
// event_id — the event's own id; UNIQUE is an integrity guard so a double-append
//            (e.g. a retried write) fails loudly rather than duplicating the log.
// data     — the full Event, JSON-serialized. The adapter stays agnostic to the
//            event shape: the domain owns the schema, storage just persists bytes.

type EventRow = { data: string };

// Open the durable store and ensure its schema, returning the unchanged EventStore
// port. Async because opening the database and creating the table are async, and
// because every realistic engine is async (the port is async for exactly this
// reason). `databaseName` is injectable for tests/harnesses; production uses the
// default.
export async function createSqliteEventStore(
  databaseName = 'journal.db',
): Promise<EventStore> {
  // No `directory` arg → backup-safe default location (see file header, §6).
  const db: SQLiteDatabase = await openDatabaseAsync(databaseName);
  await db.execAsync(SCHEMA);

  return {
    async append(events: readonly Event[]): Promise<void> {
      // The whole batch commits atomically: a transaction means a partial batch
      // can never be observed by a later read (port contract). expo-sqlite reads
      // the event out into the row here, so it does not retain the caller's array.
      await db.withTransactionAsync(async () => {
        for (const event of events) {
          await db.runAsync(
            'INSERT INTO events (event_id, data) VALUES (?, ?)',
            event.event_id,
            JSON.stringify(event),
          );
        }
      });
    },

    async read(): Promise<readonly Event[]> {
      // ORDER BY seq reproduces append order deterministically. Because the log is
      // append-only with no deletes, seq is strictly increasing and never reused,
      // so the order is stable across restarts and across independent connections.
      // We order on an explicit column so the contract is visible in the SQL rather
      // than relying on incidental scan order. (The fold is itself order-independent
      // over (ts, event_id); this honors read()'s documented "append order" anyway.)
      const rows = await db.getAllAsync<EventRow>(
        'SELECT data FROM events ORDER BY seq',
      );
      // Fresh objects from JSON.parse: a caller mutating the result can't reach the
      // stored log (port contract).
      return rows.map((row) => JSON.parse(row.data) as Event);
    },
  };
}
