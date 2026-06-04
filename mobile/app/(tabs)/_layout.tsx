import { Tabs } from 'expo-router';

import { TabBar } from '../../src/ui/TabBar';

// The bottom-tab group: Today (index), Year, and Settings. The custom TabBar fully replaces
// the default tab bar with the brutalist design; headers are off because each screen draws
// its own header. Today is the initial tab by virtue of being `index` (Router's default
// route). Topics will slot between Year and Settings in a later session.
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="year" options={{ title: 'Year' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
