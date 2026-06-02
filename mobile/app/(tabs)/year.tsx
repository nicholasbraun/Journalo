import { StyleSheet, Text, View } from 'react-native';

import { fonts, theme } from '../../src/ui/theme';

// The Year tab — a placeholder this session. The real year-grid heatmap (the payoff view,
// ARCHITECTURE.md §3) is a later session; this only establishes the tab as a routed
// destination. It mirrors the quick-log header's visual language (mono kicker + heavy title)
// so the two tabs read as one app, with an empty-state body standing in for the grid.
export default function YearTab() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>YEAR GRID</Text>
        <Text style={styles.title}>Year</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.placeholderTitle}>Year view coming soon</Text>
        <Text style={styles.placeholderBody}>
          A color heatmap of every topic across the year will live here.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.paper },
  // 56px top clears the notch without a safe-area dependency, matching the quick-log header.
  header: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.rule,
  },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    color: theme.muted,
    marginBottom: 7,
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    color: theme.ink,
  },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  placeholderTitle: {
    fontFamily: fonts.sans,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: theme.ink,
    marginBottom: 8,
  },
  placeholderBody: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    color: theme.muted,
    textAlign: 'center',
  },
});
