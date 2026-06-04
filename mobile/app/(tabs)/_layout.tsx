import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { theme } from '../../src/ui/theme';

// The bottom-tab group rendered by iOS's native UITabBar — Liquid Glass on iOS 26,
// the standard native bar on iOS 16-18 — rather than a JS-drawn brutalist bar. Triggers
// map 1:1 to the route files under (tabs)/ ("index" = Today). Selected tint is brand ink
// for continuity with the rest of the shell; the bar minimizes on scroll-down (iOS 26).
// SF Symbols mirror the retired custom icons' motifs (check / 3x3 grid / sliders).
export default function TabsLayout() {
  return (
    <NativeTabs tintColor={theme.ink} minimizeBehavior="onScrollDown">
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
