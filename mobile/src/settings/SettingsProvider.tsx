import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { TimeOfDay } from '@journal/core';

import { theme } from '../ui/theme';
import {
  cancelReminder,
  ensureReminderPermission,
  scheduleDailyReminder,
} from '../notifications/reminder';
import { loadSettings, saveSettings, type Settings } from './settingsStore';

// Owns the app's settings and exposes them to every route, mounted once above
// JournalProvider so the journal can read the logging-day boundary from the live setting
// (it decides which date new values land on). The persisted record is the source of truth;
// each setter updates state and writes through to storage, and a single effect keeps the OS
// notification in sync with the reminder setting.

// What screens consume. Values are flattened from the stored Settings; the setters persist.
type SettingsContextValue = {
  readonly reminderEnabled: boolean;
  readonly reminderTime: TimeOfDay;
  readonly boundary: TimeOfDay;
  readonly setReminderEnabled: (enabled: boolean) => void;
  readonly setReminderTime: (time: TimeOfDay) => void;
  readonly setBoundary: (boundary: TimeOfDay) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

// Access settings. Throws if used outside the provider so a mis-wired route fails loudly
// rather than silently reading stale defaults.
export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (value === null) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return value;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  // `null` = still loading from storage; gate the tree until then (same splash-until-loaded
  // pattern as JournalProvider) so screens never render against provisional defaults that
  // then snap to the persisted values.
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadSettings();
      if (!cancelled) setSettings(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply a partial change: update state and persist the merged record. Functional update so
  // it never closes over a stale `settings`, which lets the reconcile effect below call it
  // safely without taking a dependency on the current value.
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      if (prev === null) return prev;
      const next = { ...prev, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  // Keep the OS reminder in sync with the setting. Runs on load and whenever the toggle or
  // time changes (the "cancel + re-schedule on change" rule, ARCHITECTURE.md §5). If the OS
  // permission is refused we flip the toggle back off: the in-app setting must reflect what
  // can actually happen, not a wish the OS won't honor. Depends on the two reminder fields
  // only — a boundary change keeps the same reminderTime reference, so it won't reschedule.
  const reminderEnabled = settings?.reminderEnabled;
  const reminderTime = settings?.reminderTime;
  useEffect(() => {
    if (reminderEnabled === undefined || reminderTime === undefined) return;
    let cancelled = false;
    void (async () => {
      if (reminderEnabled) {
        const granted = await ensureReminderPermission();
        if (cancelled) return;
        if (granted) {
          await scheduleDailyReminder(reminderTime);
        } else {
          update({ reminderEnabled: false });
        }
      } else {
        await cancelReminder();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reminderEnabled, reminderTime, update]);

  const value = useMemo<SettingsContextValue | null>(() => {
    if (settings === null) return null;
    return {
      reminderEnabled: settings.reminderEnabled,
      reminderTime: settings.reminderTime,
      boundary: settings.boundary,
      setReminderEnabled: (enabled) => update({ reminderEnabled: enabled }),
      setReminderTime: (time) => update({ reminderTime: time }),
      setBoundary: (boundary) => update({ boundary }),
    };
  }, [settings, update]);

  if (value === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.paper },
});
