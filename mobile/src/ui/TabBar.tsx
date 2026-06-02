import { type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';

import { fonts, theme } from './theme';

// The bottom tab bar, transcribed from the design handoff's `TabBar` (app.jsx): a heavy
// top rule, ink-filled active tab with paper text, muted inactive tabs, and rule dividers
// between tabs. Passed to Expo Router's <Tabs> via its `tabBar` prop so it fully replaces
// the default JS tab bar while keeping Router's navigation behavior.

// The props Expo Router hands a custom tab bar. Derived from <Tabs> itself rather than
// deep-importing the vendored react-navigation types, so it stays correct if Router moves
// them — and guarantees `<Tabs tabBar={(p) => <TabBar {...p} />}>` type-checks.
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

// The home-indicator clearance from the design. A fixed inset (not a safe-area value) keeps
// this session dependency-light and matches the rest of the shell, which hardcodes insets;
// swapping to react-native-safe-area-context insets is a later, isolated change.
const HOME_INDICATOR_INSET = 24;

// Per-route label + icon. Keyed by the route file name under app/(tabs)/ ("index" = Today).
// Routes absent from this map are not rendered — the placeholder for future tabs to opt in.
const TABS: Record<string, { label: string; icon: 'today' | 'year' }> = {
  index: { label: 'Today', icon: 'today' },
  year: { label: 'Year', icon: 'year' },
};

// The handoff icons are pure geometry, so they render as bordered Views — no SVG dependency
// (same fidelity-for-zero-dependency trade as the fonts in theme.ts). `color` follows the
// tab's active/inactive ink so the glyph inverts on the filled active tab.
function TabIcon({ icon, color }: { icon: 'today' | 'year'; color: string }) {
  if (icon === 'today') {
    // A bordered square with a check — the "logged today" motif.
    return (
      <View style={[styles.iconBox, { borderColor: color }]}>
        <Text style={[styles.checkGlyph, { color }]}>✓</Text>
      </View>
    );
  }
  // A bordered square ruled into a 3×3 grid — the year-grid motif in miniature.
  return (
    <View style={[styles.iconBox, { borderColor: color }]}>
      <View style={[styles.gridLineV, { left: '33.3%', backgroundColor: color }]} />
      <View style={[styles.gridLineV, { left: '66.6%', backgroundColor: color }]} />
      <View style={[styles.gridLineH, { top: '33.3%', backgroundColor: color }]} />
      <View style={[styles.gridLineH, { top: '66.6%', backgroundColor: color }]} />
    </View>
  );
}

export function TabBar({ state, navigation }: TabBarProps) {
  return (
    <View style={styles.bar}>
      {state.routes.map((route, i) => {
        const meta = TABS[route.name];
        if (meta === undefined) return null;
        const active = state.index === i;
        const ink = active ? theme.paper : theme.muted;

        const onPress = () => {
          // The react-navigation tab-press contract: emit a cancellable event, and only
          // navigate when it isn't already focused and nothing prevented the default.
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!active && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={meta.label}
            style={[styles.tab, active && styles.tabActive, i > 0 && styles.tabDivider]}
          >
            <TabIcon icon={meta.icon} color={ink} />
            <Text style={[styles.label, { color: ink }]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: theme.paper,
    borderTopWidth: 1.5,
    borderTopColor: theme.ink,
    paddingBottom: HOME_INDICATOR_INSET,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabActive: { backgroundColor: theme.ink },
  tabDivider: { borderLeftWidth: 1.5, borderLeftColor: theme.rule },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  iconBox: {
    width: 22,
    height: 22,
    borderWidth: 1.7,
    borderRadius: theme.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGlyph: { fontSize: 13, fontWeight: '900', lineHeight: 15 },
  // Absolutely-positioned hairlines partition the icon box into thirds.
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1.5 },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1.5 },
});
