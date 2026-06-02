import { router } from 'expo-router';

import { useJournal } from '../src/journal/JournalProvider';
import { NewTopicScreen } from '../src/newtopic/NewTopicScreen';

// The New Topic modal route. Presented as a modal by the root Stack (see app/_layout.tsx).
// Creating a topic appends through the journal context — the new topic appears in Today's
// list via the same fold — then dismisses back; cancelling (the ✕) just dismisses. router.back()
// is used over a literal path so the modal returns to whatever tab presented it.
export default function NewTopicModal() {
  const { createTopic } = useJournal();
  return (
    <NewTopicScreen
      onCreate={(input) => {
        createTopic(input);
        router.back();
      }}
      onCancel={() => router.back()}
    />
  );
}
