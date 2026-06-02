import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { JournalProvider } from '../src/journal/JournalProvider';

// The router root. It owns no screen — it mounts the JournalProvider once around the whole
// route tree (so every screen reads the same fold) and declares the two top-level
// destinations: the tab group and the New Topic modal. This replaces the old App.tsx, which
// was both the state holder and a manual screen toggle; that responsibility now splits —
// state into the provider, routing into the file tree.
export default function RootLayout() {
  return (
    <JournalProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        {/* New Topic is presented as a modal, not pushed: it is a secondary action over
            Today (not a tab), and its screen already carries an ✕-to-close affordance —
            the modal idiom, not a back-chevron. Creating or cancelling calls router.back(). */}
        <Stack.Screen name="new-topic" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="dark" />
    </JournalProvider>
  );
}
