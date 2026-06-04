import { activeTopics } from '@journal/core';

import { useJournal } from '../../src/journal/JournalProvider';
import { useSettings } from '../../src/settings/SettingsProvider';
import { SettingsScreen } from '../../src/settings/SettingsScreen';

// The Settings tab: wires the pure SettingsScreen to its two sources — the settings provider
// (reminder + boundary, which it both reads and writes) and the journal (for the read-only
// topic count). The topic count uses activeTopics so soft-deleted topics aren't counted.
export default function SettingsTab() {
  const {
    reminderEnabled,
    reminderTime,
    boundary,
    setReminderEnabled,
    setReminderTime,
    setBoundary,
  } = useSettings();
  const { state } = useJournal();

  return (
    <SettingsScreen
      reminderEnabled={reminderEnabled}
      reminderTime={reminderTime}
      boundary={boundary}
      topicCount={activeTopics(state).length}
      onReminderEnabledChange={setReminderEnabled}
      onReminderTimeChange={setReminderTime}
      onBoundaryChange={setBoundary}
    />
  );
}
