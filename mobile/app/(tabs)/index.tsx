import { router } from 'expo-router';

import { useJournal } from '../../src/journal/JournalProvider';
import { useSettings } from '../../src/settings/SettingsProvider';
import { QuickLogScreen } from '../../src/quicklog/QuickLogScreen';
import { formatHm24 } from '../../src/ui/time';

// The Today tab: the quick-log screen, unchanged in look and behavior. It reads the folded
// state from the journal context and reports taps back through it; the "+ New topic" button
// now opens the New Topic modal route instead of flipping the old screen toggle. The boundary
// cue in the header comes from the live setting so it stays truthful after a change.
export default function TodayTab() {
  const { state, loggingDate, dateLabel, setValue } = useJournal();
  const { boundary } = useSettings();
  return (
    <QuickLogScreen
      state={state}
      loggingDate={loggingDate}
      dateLabel={dateLabel}
      boundaryLabel={formatHm24(boundary)}
      onSet={setValue}
      onNewTopic={() => router.push('/new-topic')}
    />
  );
}
