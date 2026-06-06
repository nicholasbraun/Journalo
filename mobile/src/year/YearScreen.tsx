import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { activeTopics, cellState, type State, type TopicId, type TopicState } from '@journal/core';

import { buildRamp } from '../ui/colorRamp';
import { Chevron } from '../ui/icons';
import { GlassSurface } from '../ui/GlassSurface';
import { SvgMesh } from '../ui/SvgMesh';
import { fonts, theme } from '../ui/theme';
import { coverage, dataYears, loggingDateKey, MONTHS } from './calendar';
import { YearGrid } from './YearGrid';

// The year heatmap screen — the payoff view (ARCHITECTURE.md §3). It owns only UI state
// (which topic(s) are selected, which year is shown, which cell is being inspected); the
// folded `state` it renders is the single source of truth passed down from the journal
// context. Selecting one topic shows a solid heatmap; selecting a second enters compare,
// rendered as split cells in the SAME grid (YearGrid) so no cell ever moves between modes.

const SCREEN_PAD = 16;
const GRID_CARD_PAD = 14;
// Fixed grid geometry. The label column and gap are constants so `cellSize` is a pure
// function of available width — identical in single and compare, which pins every cell in
// place across mode switches.
const LABEL_COL_WIDTH = 16;
const GRID_GAP = 3;

type Props = {
  readonly state: State;
};

// A topic selector chip. Active = filled with the topic color (white label); inactive =
// translucent glass pill with a small color dot.
function TopicChip({ topic, active, onPress }: { topic: TopicState; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active ? { backgroundColor: topic.color, shadowColor: topic.color, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } } : styles.chipIdle,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.chipDot, { backgroundColor: active ? 'rgba(255,255,255,0.95)' : topic.color }]} />
      <Text style={[styles.chipLabel, { color: active ? '#fff' : theme.ink }]}>{topic.name}</Text>
    </Pressable>
  );
}

// One topic's legend row: color dot + name on the left, its pale→dark ramp (with end labels)
// right-aligned. Used in BOTH modes and at a fixed height, so the legend block is always two
// equal rows — the grid below never shifts when toggling single↔compare.
function LegendTopicRow({ topic }: { topic: TopicState }) {
  const ramp = buildRamp(topic.color, topic.scale.levels);
  const lo = topic.scale.labels?.[0] ?? '1';
  const hi = topic.scale.labels?.[topic.scale.levels - 1] ?? String(topic.scale.levels);
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: topic.color }]} />
      <Text style={styles.legendName} numberOfLines={1}>
        {topic.name}
      </Text>
      <View style={styles.legendFlex} />
      <Text style={styles.rampEnd}>{lo}</Text>
      <View style={styles.rampStrip}>
        {Array.from({ length: topic.scale.levels }, (_, i) => (
          <View key={i} style={{ width: 16, height: 11, backgroundColor: ramp.fill(i) }} />
        ))}
      </View>
      <Text style={styles.rampEnd}>{hi}</Text>
    </View>
  );
}

export function YearScreen({ state }: Props) {
  const topics = activeTopics(state);
  const years = dataYears(state);

  const { width } = useWindowDimensions();
  // cellSize solves `LABEL_COL + 12*(cellSize + GAP) = usable width`, floored so the grid
  // never overflows. Same input in every mode → same cell box everywhere. The grid lives
  // inside a padded glass card, so subtract that padding too.
  const cellSize = useMemo(() => {
    const usable = width - 2 * SCREEN_PAD - 2 * GRID_CARD_PAD - LABEL_COL_WIDTH;
    return Math.max(8, Math.floor(usable / 12) - GRID_GAP);
  }, [width]);

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [selectedIds, setSelectedIds] = useState<TopicId[]>(() => (topics.length ? [topics[0].id] : []));
  const [inspect, setInspect] = useState<{ monthIndex0: number; day: number } | null>(null);

  // Keep selection valid/non-empty if topics change underneath us. Depend on a stable id
  // string, NOT the `topics` array (activeTopics returns a fresh array each render).
  const topicIdsKey = topics.map((t) => t.id).join(' ');
  useEffect(() => {
    const available = topicIdsKey ? topicIdsKey.split(' ') : [];
    setSelectedIds((ids) => {
      const kept = ids.filter((id) => available.includes(id));
      // Desired selection: keep the surviving picks if any, else seed the first available
      // topic, else empty when no topics exist. Seeding the first topic covers the
      // 0→first-topic transition — this screen mounts eagerly under the native tab bar, so
      // it initializes with an empty selection BEFORE any topic exists, and that case must
      // recover once one is created. (The old `kept.length === ids.length` short-circuit
      // returned the empty selection here, leaving the year view stuck on its empty state.)
      const next = kept.length ? kept : available.length ? [available[0] as TopicId] : [];
      // Preserve the array reference when nothing changed, to avoid a needless re-render.
      return next.length === ids.length && next.every((id, i) => id === ids[i]) ? ids : next;
    });
  }, [topicIdsKey]);

  // Clear the inspected cell whenever the selection or year changes (its values no longer apply).
  useEffect(() => {
    setInspect(null);
  }, [selectedIds, year]);

  // Tap a chip: keep ≥1 selected, at most 2. Tapping a 3rd swaps out the older selection.
  const toggle = (id: TopicId) =>
    setSelectedIds((ids) => {
      if (ids.includes(id)) return ids.length > 1 ? ids.filter((x) => x !== id) : ids;
      return ids.length < 2 ? [...ids, id] : [ids[1], id];
    });

  const selectedTopics = selectedIds
    .map((id) => topics.find((t) => t.id === id))
    .filter((t): t is TopicState => t !== undefined);
  const isSingle = selectedTopics.length === 1;

  if (topics.length === 0 || selectedTopics.length === 0) {
    return (
      <View style={styles.container}>
        <SvgMesh />
        <View style={styles.headerBlock}>
          <Text style={styles.kicker}>YEAR HEATMAP</Text>
          <Text style={styles.title}>Year</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing to chart yet</Text>
          <Text style={styles.emptyBody}>Create a topic and log a few days — the year fills in here.</Text>
        </View>
      </View>
    );
  }

  const sel = selectedTopics[0];
  const cov = coverage(state, sel.id, year);
  const minYear = years[0];
  const maxYear = years[years.length - 1];

  // The values at the inspected date, one per selected topic, for the detail line.
  const detail =
    inspect &&
    selectedTopics.map((t) => {
      const cell = cellState(state, t.id, loggingDateKey(year, inspect.monthIndex0, inspect.day));
      return {
        color: t.color,
        label: cell.kind === 'set' ? t.scale.labels?.[cell.rank] ?? String(cell.rank + 1) : '—',
      };
    });

  return (
    <View style={styles.container}>
      <SvgMesh />
      <ScrollView contentContainerStyle={styles.scrollBody}>
        {/* Header: title block + year stepper (a glass pill). */}
        <View style={styles.header}>
          <View style={styles.headerMain}>
            <Text style={styles.kicker}>{isSingle ? 'YEAR HEATMAP' : 'COMPARE · 2 TOPICS'}</Text>
            <Text style={styles.title} numberOfLines={1}>
              {isSingle ? sel.name : 'Compare'}
            </Text>
          </View>
          <GlassSurface strong radius={theme.rChip} style={styles.stepper}>
            <Pressable
              accessibilityRole="button"
              disabled={year <= minYear}
              onPress={() => setYear((y) => Math.max(minYear, y - 1))}
              style={({ pressed }) => [styles.stepBtn, year <= minYear && styles.stepDisabled, pressed && styles.pressed]}
            >
              <Chevron dir="left" size={15} color={theme.ink} />
            </Pressable>
            <Text style={styles.yearLabel}>{year}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={year >= maxYear}
              onPress={() => setYear((y) => Math.min(maxYear, y + 1))}
              style={({ pressed }) => [styles.stepBtn, year >= maxYear && styles.stepDisabled, pressed && styles.pressed]}
            >
              <Chevron dir="right" size={15} color={theme.ink} />
            </Pressable>
          </GlassSurface>
        </View>

        {/* Topic chips: multi-select drives single vs compare. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {topics.map((t) => (
            <TopicChip key={t.id} topic={t} active={selectedIds.includes(t.id)} onPress={() => toggle(t.id)} />
          ))}
        </ScrollView>

        {/* The grid card: a frosted glass panel with a status/detail line, a legend, and the
            heatmap beneath a hairline divider. */}
        <GlassSurface strong radius={theme.rCard} style={styles.gridCard}>
          <View style={styles.statusRow}>
            {detail ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailDate}>
                  {inspect!.day} {MONTHS[inspect!.monthIndex0]}
                </Text>
                {detail.map((d, i) => (
                  <View key={i} style={styles.detailItem}>
                    <View style={[styles.detailDot, { backgroundColor: d.color }]} />
                    <Text style={styles.detailLabel}>{d.label}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.statusText} numberOfLines={1}>
                {isSingle ? `${cov.logged} logged · ${cov.missing} missing` : 'Tap a cell to inspect both'}
              </Text>
            )}
          </View>

          {/* Fixed two-row legend (each row carries its topic's ramp) so the grid below stays
              put across single↔compare. Single: the topic + a missing key. Compare: one ramp
              row per topic. */}
          <View style={styles.legend}>
            {isSingle ? (
              <>
                <LegendTopicRow topic={sel} />
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, styles.missingDot]} />
                  <Text style={styles.legendMuted}>missing · not logged</Text>
                </View>
              </>
            ) : (
              selectedTopics.map((t) => <LegendTopicRow key={t.id} topic={t} />)
            )}
          </View>

          <View style={styles.divider} />

          <YearGrid
            state={state}
            topics={selectedTopics}
            year={year}
            cellSize={cellSize}
            gap={GRID_GAP}
            labelColWidth={LABEL_COL_WIDTH}
            onInspect={setInspect}
          />
        </GlassSurface>

        <Text style={styles.hint}>
          {isSingle ? 'Tap another topic to compare two side by side' : 'Tap a selected topic to remove · tap a new one to swap'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollBody: { paddingHorizontal: SCREEN_PAD, paddingBottom: 130 },

  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingTop: 64, marginBottom: 16 },
  headerBlock: { paddingTop: 64, paddingHorizontal: SCREEN_PAD },
  headerMain: { flexShrink: 1, minWidth: 0 },
  kicker: { fontFamily: fonts.sans, fontSize: 11.5, fontWeight: '600', letterSpacing: 1, color: theme.label2, marginBottom: 6 },
  title: { fontFamily: fonts.sans, fontSize: 34, fontWeight: '700', letterSpacing: -0.6, color: theme.ink },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  stepBtn: { padding: 4 },
  stepDisabled: { opacity: 0.3 },
  yearLabel: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '700', letterSpacing: -0.3, color: theme.ink, minWidth: 44, textAlign: 'center' },

  chipRow: { gap: 8, paddingBottom: 4, marginBottom: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 8, borderRadius: theme.rChip },
  chipIdle: { backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: StyleSheet.hairlineWidth, borderColor: theme.glassEdge },
  chipDot: { width: 8, height: 8, borderRadius: 3 },
  chipLabel: { fontFamily: fonts.sans, fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },

  gridCard: {
    padding: GRID_CARD_PAD,
    shadowColor: 'rgba(28,38,78,1)',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  statusRow: { minHeight: 22, justifyContent: 'center', marginBottom: 4 },
  statusText: { fontFamily: fonts.sans, fontSize: 12, color: theme.label2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  detailDate: { fontFamily: fonts.sans, fontSize: 13, fontWeight: '700', letterSpacing: -0.2, color: theme.ink },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailDot: { width: 8, height: 8, borderRadius: 3 },
  detailLabel: { fontFamily: fonts.sans, fontSize: 12.5, color: theme.label2, textTransform: 'capitalize' },

  // Two rows of fixed height → constant legend height across modes (no grid jump).
  legend: { marginTop: 12, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', height: 20, gap: 8 },
  legendDot: { width: 11, height: 11, borderRadius: 3.5 },
  missingDot: { backgroundColor: theme.missing, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.missingRing },
  legendName: { fontFamily: fonts.sans, fontSize: 13, fontWeight: '600', letterSpacing: -0.1, color: theme.ink, flexShrink: 1 },
  legendFlex: { flex: 1, minWidth: 8 },
  legendMuted: { fontFamily: fonts.sans, fontSize: 12, color: theme.label2 },
  rampStrip: { flexDirection: 'row', borderRadius: 5, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: theme.glassEdge },
  rampEnd: { fontFamily: fonts.sans, fontSize: 11, color: theme.label2 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.label4, marginVertical: 14, marginHorizontal: -GRID_CARD_PAD },

  hint: { fontFamily: fonts.sans, fontSize: 12, color: theme.label2, textAlign: 'center', marginTop: 16 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontFamily: fonts.sans, fontSize: 22, fontWeight: '700', letterSpacing: -0.4, color: theme.ink, marginBottom: 8 },
  emptyBody: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, color: theme.label2, textAlign: 'center' },

  pressed: { opacity: 0.7 },
});
