import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { theme } from '../../src/ui/theme';

// The bottom-tab group rendered by iOS's native UITabBar — Liquid Glass on iOS 26,
// the standard native bar on iOS 16-18 — rather than a JS-drawn bar. Triggers map 1:1 to
// the route files under (tabs)/ ("index" = Today). Selected tint is the app accent for
// continuity with the glass chrome; the bar minimizes on scroll-down (iOS 26). SF Symbols
// stay as the tab icons (deliberately native — not the design prototype's custom icons).
export default function TabsLayout() {
  return (
    <NativeTabs tintColor={theme.accent} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="checkmark.square.fill" md="check_box" />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="year">
        <NativeTabs.Trigger.Icon sf="square.grid.3x3.fill" md="grid_view" />
        <NativeTabs.Trigger.Label>Year</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="slider.horizontal.3" md="tune" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
