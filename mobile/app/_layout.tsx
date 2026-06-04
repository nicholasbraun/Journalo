import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { JournalProvider } from '../src/journal/JournalProvider';
import { SettingsProvider } from '../src/settings/SettingsProvider';

// The router root. It owns no screen — it mounts the app's providers once around the whole
// route tree (so every screen reads the same fold and settings) and declares the two
// top-level destinations: the tab group and the New Topic modal. This replaces the old
// App.tsx, which was both the state holder and a manual screen toggle; that responsibility
// now splits — state into the providers, routing into the file tree.
//
// SettingsProvider wraps JournalProvider because the journal reads the logging-day boundary
// from settings (it decides which date new values land on) — so settings must be available
// above it.
export default function RootLayout() {
  return (
    <SettingsProvider>
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
    </SettingsProvider>
  );
}
