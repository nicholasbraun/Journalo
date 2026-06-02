import { Tabs } from 'expo-router';

import { TabBar } from '../../src/ui/TabBar';

// The bottom-tab group: Today (index) and Year. The custom TabBar fully replaces the
// default tab bar with the brutalist design; headers are off because each screen draws its
// own header. Today is the initial tab by virtue of being `index` (Router's default route).
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="year" options={{ title: 'Year' }} />
    </Tabs>
  );
}
