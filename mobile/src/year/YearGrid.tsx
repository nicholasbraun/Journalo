import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cellState, type State, type TopicState } from '@journal/core';

import { buildRamp, type Ramp } from '../ui/colorRamp';
import { fonts, theme } from '../ui/theme';
import { daysInMonth, LABELLED_DAYS, loggingDateKey, MAX_DAYS_IN_MONTH, MONTHS } from './calendar';

// The heatmap grid: 12 month columns × 31 day rows. The whole no-jump guarantee lives in
// how this is laid out — a cell's position is a pure function of (month, day) and the
// fixed geometry props (`cellSize`, `gap`, `labelColWidth`). It NEVER depends on the topic,
// its scale, or whether we're in single or compare mode. Single view and compare-split
// view render the identical grid; only what fills each cell box changes. So switching
// topics or entering/leaving compare repaints colors without moving a single cell.

const CELL_RADIUS = 7; // soft-square cells (design `YR_RADIUS`)

// "YYYY-MM-DD" for today, so future days (which haven't happened) can render faint rather
// than as the neutral "missing" grey — missing means "a past day you didn't log", which a
// future day is not.
function todayKey(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

type Inspect = { monthIndex0: number; day: number };

type Props = {
  readonly state: State;
  // 1 topic → solid cells; 2 topics → each cell sliced into vertical bands (compare-split).
  // The grid geometry is the same either way, so the bands appear inside the existing cell
  // box rather than reflowing anything.
  readonly topics: readonly TopicState[];
  readonly year: number;
  readonly cellSize: number;
  readonly gap: number;
  readonly labelColWidth: number;
  // Tapping a real (non-future) day reports it so the screen can show the date's values.
  readonly onInspect?: (sel: Inspect) => void;
};

// One day-cell. Absent past days render the neutral "missing" grey; a logged rank renders the
// topic's intensity fill (rank 0 is a pale tint, still distinct from missing — invariant 1);
// future days render faint. In split mode the cell is divided into equal bands, one per topic.
function Cell({
  state,
  topics,
  ramps,
  year,
  monthIndex0,
  day,
  cellSize,
  marginLeft,
  today,
  onInspect,
}: {
  state: State;
  topics: readonly TopicState[];
  ramps: readonly Ramp[];
  year: number;
  monthIndex0: number;
  day: number;
  cellSize: number;
  marginLeft: number;
  today: string;
  onInspect?: (sel: Inspect) => void;
}) {
  const box = { width: cellSize, height: cellSize, marginLeft };

  // Days past the month's real length still occupy a slot (kept blank) so every column and
  // row stays aligned and the grid stays rectangular.
  if (day > daysInMonth(year, monthIndex0)) {
    return <View style={box} />;
  }

  const date = loggingDateKey(year, monthIndex0, day);
  const isFuture = date > today;
  if (isFuture) {
    return <View style={[box, styles.cellRound, styles.future]} />;
  }

  const fillFor = (topic: TopicState, ramp: Ramp): string => {
    const cell = cellState(state, topic.id, date);
    return cell.kind === 'set' ? ramp.fill(cell.rank) : theme.missing;
  };

  const inner =
    topics.length === 1 ? (
      <View style={[box, styles.cellRound, { backgroundColor: fillFor(topics[0], ramps[0]) }]} />
    ) : (
      <View style={[box, styles.cellRound, styles.split]}>
        {topics.map((topic, i) => (
          <View
            key={topic.id}
            style={[styles.band, { backgroundColor: fillFor(topic, ramps[i]) }, i > 0 && styles.bandDivider]}
          />
        ))}
      </View>
    );

  if (!onInspect) return inner;
  return (
    <Pressable onPress={() => onInspect({ monthIndex0, day })} accessibilityRole="button">
      {inner}
    </Pressable>
  );
}

export function YearGrid({ state, topics, year, cellSize, gap, labelColWidth, onInspect }: Props) {
  // One ramp per topic, aligned by index with `topics`. Building these here (not per cell)
  // keeps the inner loop cheap across the ~370 cells.
  const ramps = topics.map((t) => buildRamp(t.color, t.scale.levels));
  const today = todayKey();

  const columns = Array.from({ length: 12 }, (_, m) => m);
  const days = Array.from({ length: MAX_DAYS_IN_MONTH }, (_, i) => i + 1);

  return (
    <View>
      {/* Month-label header row: a label-column spacer, then one centered label per column. */}
      <View style={styles.row}>
        <View style={{ width: labelColWidth }} />
        {columns.map((m) => (
          <Text key={m} numberOfLines={1} style={[styles.monthLabel, { width: cellSize, marginLeft: gap }]}>
            {MONTHS[m][0]}
          </Text>
        ))}
      </View>

      {days.map((d) => (
        <View key={d} style={[styles.row, { marginTop: gap }]}>
          <View style={{ width: labelColWidth }}>
            {LABELLED_DAYS.has(d) && <Text style={[styles.dayLabel, { lineHeight: cellSize }]}>{d}</Text>}
          </View>
          {columns.map((m) => (
            <Cell
              key={m}
              state={state}
              topics={topics}
              ramps={ramps}
              year={year}
              monthIndex0={m}
              day={d}
              cellSize={cellSize}
              marginLeft={gap}
              today={today}
              onInspect={onInspect}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  monthLabel: {
    fontFamily: fonts.sans,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
    color: theme.label3,
    marginBottom: 3,
  },
  dayLabel: {
    fontFamily: fonts.sans,
    fontSize: 8.5,
    fontWeight: '500',
    textAlign: 'right',
    paddingRight: 4,
    color: theme.label3,
  },
  cellRound: { borderRadius: CELL_RADIUS },
  future: { backgroundColor: 'rgba(255,255,255,0.16)' },
  split: { flexDirection: 'row', overflow: 'hidden' },
  band: { flex: 1, height: '100%' },
  bandDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: 'rgba(255,255,255,0.5)' },
});
