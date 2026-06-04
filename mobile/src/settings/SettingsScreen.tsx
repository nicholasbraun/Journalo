import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TimeOfDay } from '@journal/core';

import { ScreenHeader } from '../ui/ScreenHeader';
import { fonts, theme } from '../ui/theme';
import { formatHm12 } from '../ui/time';
import { TimePickerField } from '../ui/TimePickerField';

// First-paint estimate for the floating header; corrected by onLayout (see QuickLogScreen).
const HEADER_ESTIMATE = 124;

// The Settings screen, transcribed from the design handoff (screen_settings.jsx): a minimal,
// scrollable list of three sections — Reminder, Logging, Data. Pure presentation: it receives
// every value and callback as props and reads no context itself (the route wires it to
// SettingsProvider + the journal), so the data-vs-display distinction stays in the providers.

type Props = {
  readonly reminderEnabled: boolean;
  readonly reminderTime: TimeOfDay;
  readonly boundary: TimeOfDay;
  readonly topicCount: number;
  readonly onReminderEnabledChange: (enabled: boolean) => void;
  readonly onReminderTimeChange: (time: TimeOfDay) => void;
  readonly onBoundaryChange: (boundary: TimeOfDay) => void;
};

// A muted mono caption introducing each section.
function SectionLabel({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

// A labeled row: caption on the left, control on the right, with a hairline beneath unless
// it is the last row in its section.
function FieldRow({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.fieldRow, last && styles.fieldRowLast]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldControl}>{children}</View>
    </View>
  );
}

// The on/off switch. A bordered track that fills with ink when on; the knob sits left when
// off and right when on. No sliding animation — the position swap reads clearly on its own.
function Toggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!on)}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      style={[styles.toggleTrack, on && styles.toggleTrackOn]}
    >
      <View
        style={[
          styles.toggleKnob,
          on ? styles.toggleKnobOn : styles.toggleKnobOff,
        ]}
      />
    </Pressable>
  );
}

export function SettingsScreen({
  reminderEnabled,
  reminderTime,
  boundary,
  topicCount,
  onReminderEnabledChange,
  onReminderTimeChange,
  onBoundaryChange,
}: Props) {
  const [headerHeight, setHeaderHeight] = useState(HEADER_ESTIMATE);

  return (
    <View style={styles.container}>
      <ScreenHeader onHeightChange={setHeaderHeight}>
        <Text style={styles.kicker}>APP</Text>
        <Text style={styles.title}>Settings</Text>
      </ScreenHeader>

      <ScrollView contentContainerStyle={[styles.scrollBody, { paddingTop: headerHeight }]}>
        <SectionLabel style={styles.sectionLabelFirst}>REMINDER</SectionLabel>
        <FieldRow label="Daily reminder">
          <Toggle on={reminderEnabled} onChange={onReminderEnabledChange} />
        </FieldRow>
        {/* The time only matters when the reminder is on; dim it and disable taps when off
            so the dependency is visible rather than implied. */}
        <View
          style={!reminderEnabled && styles.disabled}
          pointerEvents={reminderEnabled ? 'auto' : 'none'}
        >
          <FieldRow label="Remind me at" last>
            <TimePickerField value={reminderTime} onChange={onReminderTimeChange} />
          </FieldRow>
        </View>

        <SectionLabel>LOGGING</SectionLabel>
        <FieldRow label="Day boundary" last>
          <TimePickerField value={boundary} onChange={onBoundaryChange} />
        </FieldRow>
        {/* The boundary is the one domain setting; explain what it does in user terms. Its
            freeze semantics (past entries keep their date) live in the providers/core, not
            here — this copy only describes the forward-looking effect. */}
        <Text style={styles.note}>
          Entries made before {formatHm12(boundary)} count toward the previous day, so
          late-night logs land on the right date.
        </Text>

        <SectionLabel>DATA</SectionLabel>
        <FieldRow label="Topics tracked">
          <Text style={styles.dataValue}>{topicCount}</Text>
        </FieldRow>
        <FieldRow label="Storage" last>
          <Text style={styles.dataMuted}>on device · offline</Text>
        </FieldRow>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.paper },

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

  scrollBody: { paddingHorizontal: 18, paddingBottom: 120 },

  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: theme.muted,
    paddingTop: 22,
    paddingBottom: 8,
  },
  sectionLabelFirst: { paddingTop: 8 },

  disabled: { opacity: 0.4 },

  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.rule,
  },
  fieldRowLast: { borderBottomWidth: 0 },
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.muted,
    flexShrink: 1,
  },
  fieldControl: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },

  note: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 18,
    color: theme.muted,
    marginTop: 12,
  },

  dataValue: { fontFamily: fonts.mono, fontSize: 13, fontWeight: '700', color: theme.ink },
  dataMuted: { fontFamily: fonts.mono, fontSize: 12, color: theme.muted },

  // Toggle: 52×30 track with a 22×22 knob inset 2px on the matching side.
  toggleTrack: {
    width: 52,
    height: 30,
    borderWidth: 1.5,
    borderColor: theme.ink,
    borderRadius: theme.radius,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  toggleTrackOn: { backgroundColor: theme.ink },
  toggleKnob: {
    position: 'absolute',
    top: 2,
    width: 22,
    height: 22,
  },
  toggleKnobOff: { left: 2, backgroundColor: theme.ink },
  toggleKnobOn: { left: 24, backgroundColor: theme.paper },
});
