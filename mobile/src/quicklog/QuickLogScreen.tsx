import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedProps,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import {
  activeTopics,
  cellState,
  type LoggingDate,
  type Rank,
  type State,
  type TopicId,
  type TopicState,
} from '@journal/core';

import { buildRamp } from '../ui/colorRamp';
import { GlassSurface } from '../ui/GlassSurface';
import { IconPlus } from '../ui/icons';
import { SvgMesh } from '../ui/SvgMesh';
import { fonts, motion, theme } from '../ui/theme';

// The quick-log screen: one scrollable list of today's topics, each a frosted glass card
// with an inline value selector. The two data-semantics invariants are the whole point of
// this screen and must hold VISUALLY:
//   • Nothing is pre-selected — an un-logged topic shows an empty selector.
//   • Missing is distinct from set — un-logged topics read as visibly open.
// Folded `state` is the single source of truth (CLAUDE.md invariant 4); this screen only
// renders it and reports taps upward via `onSet`.

type Props = {
  readonly state: State;
  // Today's logging day, computed once by the shell via loggingDateFor. Every cell lookup
  // is keyed on this date.
  readonly loggingDate: LoggingDate;
  // Human label for the header sub-line, e.g. "Tue · 02 Jun".
  readonly dateLabel: string;
  // Append a value for (topic, today, rank). Re-tapping a different segment is just a later
  // set; there is no un-set (consistent with the domain — no clear event).
  readonly onSet: (topicId: TopicId, rank: Rank) => void;
  // Open the New Topic screen.
  readonly onNewTopic: () => void;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// A small ring that springs to the done/total fraction as topics get logged.
function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 52;
  const sw = 5;
  const r = (size - sw) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = total ? done / total : 0;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(pct, motion.springSoft);
  }, [pct, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(60,60,67,0.14)" strokeWidth={sw} />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={theme.accent}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringValue}>
          {done}
          <Text style={styles.ringTotal}>/{total}</Text>
        </Text>
      </View>
    </View>
  );
}

// The inline segmented selector for one topic: one tappable glass pill per scale level. A
// pill fills with the topic's intensity color ONLY when its rank is the logged value; when
// the cell is absent, `selectedRank` is null and NO pill is filled — the empty-selector
// invariant, rendered.
function ValueSelector({
  topic,
  selectedRank,
  onSet,
}: {
  topic: TopicState;
  selectedRank: Rank | null;
  onSet: (topicId: TopicId, rank: Rank) => void;
}) {
  const ramp = buildRamp(topic.color, topic.scale.levels);
  const labelFor = (rank: number): string => topic.scale.labels?.[rank] ?? String(rank + 1);

  return (
    <View style={styles.selector}>
      {Array.from({ length: topic.scale.levels }, (_, rank) => {
        const selected = selectedRank === rank;
        const fill = selected ? ramp.fill(rank) : undefined;
        return (
          <Pressable
            key={rank}
            onPress={() => onSet(topic.id, rank)}
            style={({ pressed }) => [
              styles.segment,
              selected
                ? { backgroundColor: fill, shadowColor: fill, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }
                : styles.segmentIdle,
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={2}
              style={[
                styles.segmentLabel,
                selected
                  ? { color: ramp.textOn(rank), fontWeight: '700' }
                  : { color: theme.label2, fontWeight: '500' },
              ]}
            >
              {labelFor(rank)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function QuickLogRow({
  topic,
  selectedRank,
  index,
  onSet,
}: {
  topic: TopicState;
  selectedRank: Rank | null;
  index: number;
  onSet: (topicId: TopicId, rank: Rank) => void;
}) {
  const logged = selectedRank !== null;
  const label = logged ? topic.scale.labels?.[selectedRank] ?? String(selectedRank + 1) : null;
  return (
    <Animated.View entering={FadeInDown.duration(500).delay(index * 55)}>
      <GlassSurface radius={theme.rCard} style={styles.card}>
        <View style={styles.rowHeader}>
          <View style={styles.rowHeaderLeft}>
            <View style={[styles.swatch, { backgroundColor: topic.color, shadowColor: topic.color }]} />
            <Text style={styles.topicName} numberOfLines={1}>
              {topic.name}
            </Text>
          </View>
          {/* Logged rows show the chosen label in the topic's hue; un-logged rows carry the
              muted "not logged" cue so still-open topics stay scannable down a long list. */}
          {logged ? (
            <Text style={[styles.statusLabel, { color: topic.color }]} numberOfLines={1}>
              {label}
            </Text>
          ) : (
            <Text style={styles.statusTag}>not logged</Text>
          )}
        </View>
        <ValueSelector topic={topic} selectedRank={selectedRank} onSet={onSet} />
      </GlassSurface>
    </Animated.View>
  );
}

export function QuickLogScreen({ state, loggingDate, dateLabel, onSet, onNewTopic }: Props) {
  const topics = activeTopics(state);

  // Per topic, today's value or null-if-absent. The switch on `kind` is what keeps missing
  // from decaying into rank 0 (CLAUDE.md invariant 1): an absent cell yields null.
  const selectedRankOf = (topicId: TopicId): Rank | null => {
    const cell = cellState(state, topicId, loggingDate);
    return cell.kind === 'set' ? cell.rank : null;
  };

  const done = topics.filter((t) => selectedRankOf(t.id) !== null).length;
  const total = topics.length;
  const complete = total > 0 && done === total;
  const isEmpty = total === 0;

  return (
    <View style={styles.container}>
      {/* The gradient mesh lives INSIDE the screen, behind its content: the tab navigator
          paints opaque over anything mounted at the router root, so the surface the glass
          refracts has to be part of the screen itself. */}
      <SvgMesh />

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {/* The header scrolls with the content (no floating bar): a transparent header would
            let rows slide under it and read as broken. */}
        <View style={styles.header}>
          <View style={styles.headerMain}>
            <Text style={styles.kicker}>QUICK LOG</Text>
            <Text style={styles.title}>Today</Text>
            <Text style={styles.sub}>{dateLabel}</Text>
          </View>
          {!isEmpty && <ProgressRing done={done} total={total} />}
        </View>

        {isEmpty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No topics yet</Text>
            <Text style={styles.emptyBody}>Create one to start logging your day.</Text>
            <Pressable
              onPress={onNewTopic}
              accessibilityRole="button"
              style={({ pressed }) => [styles.newTopicSolid, pressed && styles.pressed]}
            >
              <Text style={styles.newTopicSolidLabel}>+  New topic</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {topics.map((t, i) => (
              <QuickLogRow key={t.id} topic={t} index={i} selectedRank={selectedRankOf(t.id)} onSet={onSet} />
            ))}
            <Text style={styles.footnote}>
              {complete
                ? 'All topics logged for today. Tap any value to change it.'
                : `${total - done} topic${total - done === 1 ? '' : 's'} still open · nothing is pre-selected`}
            </Text>
          </>
        )}
      </ScrollView>

      {/* The standing "new topic" action: a floating Liquid Glass disc bottom-right, above
          the native tab bar. Icon-only "+", deliberately kept in its current position (not a
          tab-bar FAB). Clear glass (translucent, refracting the mesh) with an accent glyph,
          rather than a solid accent fill. */}
      {!isEmpty && (
        <GlassSurface
          radius={theme.rChip}
          isInteractive
          glassEffectStyle="clear"
          style={styles.fab}
        >
          <Pressable
            onPress={onNewTopic}
            accessibilityRole="button"
            accessibilityLabel="New topic"
            style={({ pressed }) => [styles.fabPress, pressed && styles.pressed]}
          >
            <IconPlus size={26} color={theme.accent} strokeWidth={2.6} />
          </Pressable>
        </GlassSurface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },

  // The header is a normal scroll child (it scrolls away with the content). 64px top clears
  // the notch/status bar without a safe-area dependency.
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 64,
    marginBottom: 22,
  },
  headerMain: { flexShrink: 1 },
  kicker: { fontFamily: fonts.sans, fontSize: 11.5, fontWeight: '600', letterSpacing: 1, color: theme.label2, marginBottom: 6 },
  title: { fontFamily: fonts.sans, fontSize: 34, fontWeight: '700', letterSpacing: -0.6, color: theme.ink },
  sub: { fontFamily: fonts.sans, fontSize: 13, color: theme.label2, marginTop: 6 },

  // Springy accent progress ring (counter), top-right of the header.
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringValue: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '700', letterSpacing: -0.4, color: theme.ink },
  ringTotal: { color: theme.label3 },

  // Bottom padding clears the native tab bar and the floating "+" disc above it.
  scrollBody: { paddingHorizontal: 16, paddingBottom: 150 },

  // A frosted glass topic card with a soft drop shadow.
  card: {
    padding: 16,
    marginBottom: 12,
    shadowColor: 'rgba(28,38,78,1)',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  rowHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 4,
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  topicName: { fontFamily: fonts.sans, fontSize: 17, fontWeight: '600', letterSpacing: -0.3, color: theme.ink, flexShrink: 1 },
  statusLabel: { fontFamily: fonts.sans, fontSize: 12.5, fontWeight: '600', letterSpacing: -0.1, textTransform: 'capitalize', flexShrink: 0 },
  statusTag: { fontFamily: fonts.sans, fontSize: 11.5, fontWeight: '500', color: theme.label3, flexShrink: 0 },

  selector: { flexDirection: 'row', gap: 6, marginTop: 14 },
  segment: {
    flex: 1,
    minHeight: 50,
    borderRadius: 13,
    paddingHorizontal: 2,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentIdle: {
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glassEdge,
  },
  segmentLabel: { fontFamily: fonts.sans, fontSize: 11, letterSpacing: -0.1, lineHeight: 13, textAlign: 'center' },

  pressed: { transform: [{ scale: 0.94 }] },

  footnote: { fontFamily: fonts.sans, fontSize: 13, color: theme.label2, textAlign: 'center', marginTop: 18, lineHeight: 20, paddingHorizontal: 20 },

  // Empty state.
  empty: { paddingTop: 40, alignItems: 'center' },
  emptyTitle: { fontFamily: fonts.sans, fontSize: 22, fontWeight: '700', letterSpacing: -0.4, color: theme.ink, marginBottom: 8 },
  emptyBody: { fontFamily: fonts.sans, fontSize: 14, color: theme.label2, marginBottom: 24, textAlign: 'center' },
  newTopicSolid: { paddingHorizontal: 22, paddingVertical: 14, backgroundColor: theme.accent, borderRadius: theme.rChip },
  newTopicSolidLabel: { fontFamily: fonts.sans, fontSize: 15, fontWeight: '700', letterSpacing: 0.2, color: '#fff' },

  // Floating Liquid Glass "+" disc with a soft drop shadow so it lifts off the content.
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 96,
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(28,38,78,1)',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  fabPress: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
});
