import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { ScreenHeader } from '../ui/ScreenHeader';
import { fonts, theme } from '../ui/theme';

// First-paint estimate for the floating header's height; the real value arrives via
// onLayout. Close to the measured height so the scroll content barely shifts on mount.
const HEADER_ESTIMATE = 150;

// The quick-log screen: one scrollable list of today's topics, each with an inline
// value selector. The two data-semantics invariants are the whole point of this
// screen and must hold VISUALLY:
//   • Nothing is pre-selected — an un-logged topic shows an empty selector.
//   • Missing is distinct from set — un-logged topics read as visibly open, so the
//     user can see at a glance which topics still need logging today.
// Folded `state` is the single source of truth (CLAUDE.md invariant 4); this screen
// only renders it and reports taps upward via `onSet`.

type Props = {
  readonly state: State;
  // Today's logging day, computed once by the shell via loggingDateFor (the boundary
  // setting driving the UI). Every cell lookup is keyed on this date.
  readonly loggingDate: LoggingDate;
  // Human label for the header sub-line, e.g. "Tue · 02 Jun".
  readonly dateLabel: string;
  // The current logging-day boundary as "HH:MM", shown in the header so the cue reflects the
  // user's setting rather than a stale literal.
  readonly boundaryLabel: string;
  // Append a value for (topic, today, rank). Re-tapping a different segment is just a
  // later set; there is no un-set (consistent with the domain — no clear event).
  readonly onSet: (topicId: TopicId, rank: Rank) => void;
  // Open the New Topic screen. Reachable from the empty state (when there are no
  // topics yet) and from a standing affordance once topics exist.
  readonly onNewTopic: () => void;
};

// The inline segmented selector for one topic: one tappable segment per scale level.
// A segment is filled with the topic's intensity color ONLY when its rank is the
// logged value; when the cell is absent, `selectedRank` is null and NO segment is
// filled — the empty-selector invariant, rendered.
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
  // Labels are display-only; fall back to the rank number when a topic has none.
  const labelFor = (rank: number): string =>
    topic.scale.labels?.[rank] ?? String(rank + 1);

  return (
    <View style={styles.selector}>
      {Array.from({ length: topic.scale.levels }, (_, rank) => {
        const selected = selectedRank === rank;
        return (
          <Pressable
            key={rank}
            onPress={() => onSet(topic.id, rank)}
            // Internal hairline divider (not in the handoff) so the segments read as
            // distinct tap targets even when the whole selector is empty.
            style={[
              styles.segment,
              rank > 0 && styles.segmentDivider,
              selected && { backgroundColor: ramp.fill(rank) },
            ]}
          >
            <Text
              numberOfLines={2}
              style={[
                styles.segmentLabel,
                selected
                  ? { color: ramp.textOn(rank), fontWeight: '700' }
                  : { color: theme.muted, fontWeight: '500' },
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
  onSet,
}: {
  topic: TopicState;
  selectedRank: Rank | null;
  onSet: (topicId: TopicId, rank: Rank) => void;
}) {
  const ramp = buildRamp(topic.color, topic.scale.levels);
  const logged = selectedRank !== null;
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <View style={styles.rowHeaderLeft}>
          <View style={[styles.swatch, { backgroundColor: ramp.swatch }]} />
          <Text style={styles.topicName}>{topic.name}</Text>
        </View>
        {/* Per-row status cue (an addition to the handoff): the muted "not logged"
            tag makes the still-open topics scannable down a long list. A logged row
            carries no tag — its filled segment already speaks. */}
        {!logged && <Text style={styles.statusTag}>not logged</Text>}
      </View>
      <ValueSelector topic={topic} selectedRank={selectedRank} onSet={onSet} />
    </View>
  );
}

export function QuickLogScreen({ state, loggingDate, dateLabel, boundaryLabel, onSet, onNewTopic }: Props) {
  const topics = activeTopics(state);

  // Per topic, today's value or null-if-absent. The switch on `kind` is what keeps
  // missing from decaying into rank 0 (CLAUDE.md invariant 1): an absent cell yields
  // null, never a rank.
  const selectedRankOf = (topicId: TopicId): Rank | null => {
    const cell = cellState(state, topicId, loggingDate);
    return cell.kind === 'set' ? cell.rank : null;
  };

  const done = topics.filter((t) => selectedRankOf(t.id) !== null).length;
  const total = topics.length;
  const complete = total > 0 && done === total;
  const isEmpty = total === 0;

  const [headerHeight, setHeaderHeight] = useState(HEADER_ESTIMATE);

  return (
    <View style={styles.container}>
      <ScreenHeader onHeightChange={setHeaderHeight} contentStyle={styles.headerRow}>
        <View style={styles.headerMain}>
          <Text style={styles.kicker}>QUICK LOG</Text>
          <Text style={styles.title}>Today</Text>
          <Text style={styles.sub}>{dateLabel} · day boundary {boundaryLabel}</Text>
        </View>
        {/* The progress counter only makes sense once there is something to count;
            an empty journal shows the create-your-first-topic state instead. */}
        {!isEmpty && (
          <View style={styles.counter}>
            <Text style={styles.counterValue}>
              {done}
              <Text style={styles.counterTotal}>/{total}</Text>
            </Text>
            <Text style={styles.counterLabel}>{complete ? 'COMPLETE' : 'LOGGED'}</Text>
          </View>
        )}
      </ScreenHeader>

      <ScrollView contentContainerStyle={[styles.scrollBody, { paddingTop: headerHeight }]}>
        {isEmpty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No topics yet</Text>
            <Text style={styles.emptyBody}>Create one to start logging your day.</Text>
            <Pressable onPress={onNewTopic} accessibilityRole="button" style={styles.newTopicSolid}>
              <Text style={styles.newTopicSolidLabel}>+  New topic</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {topics.map((t) => (
              <QuickLogRow
                key={t.id}
                topic={t}
                selectedRank={selectedRankOf(t.id)}
                onSet={onSet}
              />
            ))}
            <Text style={styles.footnote}>
              {complete
                ? 'All topics logged for today. Re-tap any value to change it.'
                : `${total - done} topic${total - done === 1 ? '' : 's'} still open. ` +
                  'Tap one value per topic — nothing is pre-selected.'}
            </Text>
          </>
        )}
      </ScrollView>

      {/* Standing "new topic" action as a floating glass capsule, pinned above the tab bar.
          Only with topics present — the empty state already offers a centered button, and a
          floating one over an empty screen reads oddly. */}
      {!isEmpty && (
        <GlassSurface
          radius={theme.capsule}
          isInteractive
          tintColor={theme.ink}
          style={styles.fab}
          fallbackStyle={styles.fabFallback}
        >
          <Pressable onPress={onNewTopic} accessibilityRole="button" style={styles.fabPress}>
            <Text style={styles.fabLabel}>+  New topic</Text>
          </Pressable>
        </GlassSurface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.paper },

  // Header chrome (notch inset, padding, hairline) now lives in ScreenHeader; this only
  // lays out the header's two columns — title block and progress counter.
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  headerMain: { flexShrink: 1 },
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
  sub: { fontFamily: fonts.mono, fontSize: 12, color: theme.muted, marginTop: 8 },
  counter: { alignItems: 'flex-end', flexShrink: 0 },
  counterValue: {
    fontFamily: fonts.mono,
    fontSize: 22,
    fontWeight: '700',
    color: theme.ink,
  },
  counterTotal: { color: theme.muted },
  counterLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.3,
    color: theme.muted,
    marginTop: 5,
  },

  // Bottom padding clears both the native tab bar and the floating "+ New topic" capsule
  // pinned above it, so the last row never hides behind the button.
  scrollBody: { paddingHorizontal: 18, paddingBottom: 150 },

  row: { paddingTop: 18, paddingBottom: 22, borderBottomWidth: 1.5, borderBottomColor: theme.rule },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  rowHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  swatch: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: theme.ink,
    borderRadius: theme.radius,
  },
  topicName: {
    fontFamily: fonts.sans,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: theme.ink,
  },
  statusTag: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    color: theme.muted,
    flexShrink: 0,
  },

  selector: {
    flexDirection: 'row',
    borderWidth: 2.5,
    borderColor: theme.ink,
    borderRadius: theme.radius,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentDivider: { borderLeftWidth: 1.5, borderLeftColor: theme.rule },
  segmentLabel: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    lineHeight: 12,
    letterSpacing: -0.1,
    textAlign: 'center',
  },

  footnote: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: theme.muted,
    marginTop: 18,
    lineHeight: 18,
  },

  // Empty state: shown when the journal has no topics. Sits in the scroll body in
  // place of the row list, with a primary action straight to topic creation.
  empty: { paddingTop: 64, alignItems: 'center' },
  emptyTitle: {
    fontFamily: fonts.sans,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: theme.ink,
    marginBottom: 8,
  },
  emptyBody: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: theme.muted,
    marginBottom: 24,
    textAlign: 'center',
  },

  // Primary (solid) create button for the empty state.
  newTopicSolid: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: theme.ink,
    borderWidth: 1.5,
    borderColor: theme.ink,
    borderRadius: theme.radius,
  },
  newTopicSolidLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    color: theme.paper,
  },

  // The standing create action: a PROMINENT (ink-tinted) glass capsule bottom-right, above
  // the native tab bar. A primary action must always read as tappable, so unlike the at-rest
  // chrome it carries the brand-ink tint rather than clear glass — the Liquid Glass form of
  // the original solid button. The press target (with its padding) lives in `fabPress`.
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 96,
    overflow: 'hidden',
  },
  // The solid-paper fallback can't tint glass, so fill it with ink: a plain solid-ink pill,
  // matching the tinted glass's prominence on older iOS / Android.
  fabFallback: { backgroundColor: theme.ink },
  fabPress: { paddingHorizontal: 18, paddingVertical: 14 },
  fabLabel: {
    fontFamily: fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    // Paper-on-ink: the label sits over the ink tint (glass) or the ink fill (fallback).
    color: theme.paper,
  },
});
