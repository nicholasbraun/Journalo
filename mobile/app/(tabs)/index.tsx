import { router } from 'expo-router';

import { useJournal } from '../../src/journal/JournalProvider';
import { QuickLogScreen } from '../../src/quicklog/QuickLogScreen';

// The Today tab: the quick-log screen. It reads the folded state from the journal context
// and reports taps back through it; the "+" button opens the New Topic modal route.
export default function TodayTab() {
  const { state, loggingDate, dateLabel, setValue } = useJournal();
  return (
    <QuickLogScreen
      state={state}
      loggingDate={loggingDate}
      dateLabel={dateLabel}
      onSet={setValue}
      onNewTopic={() => router.push('/new-topic')}
    />
  );
}
