import { type ReactNode, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { TimeOfDay } from '@journal/core';

import { GlassSurface } from '../ui/GlassSurface';
import { SvgMesh } from '../ui/SvgMesh';
import { fonts, motion, theme } from '../ui/theme';
import { formatHm12 } from '../ui/time';
import { TimePickerField } from '../ui/TimePickerField';

// The Settings screen (design handoff `settings.jsx`): iOS inset grouped lists rendered as
// frosted glass cards over the mesh — Reminder, Logging, Data. Pure presentation: it receives
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

// An inset grouped section: an uppercase caption, a glass card holding the rows, and an
// optional footer note beneath.
function Group({ header, footer, children }: { header: string; footer?: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupHeader}>{header}</Text>
      <GlassSurface strong radius={20} style={styles.groupCard}>
        {children}
      </GlassSurface>
      {footer ? <Text style={styles.groupFooter}>{footer}</Text> : null}
    </View>
  );
}

// A labeled row inside a group: label left, control right, hairline beneath unless last.
function Row({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowControl}>{children}</View>
      {!last && <View style={styles.rowDivider} />}
    </View>
  );
}

// The on/off switch: an iOS-style track that fills accent when on, with a knob that springs
// across (CLAUDE.md "display setting" — purely cosmetic, no data consequence).
function Toggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const pos = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    pos.value = withSpring(on ? 1 : 0, motion.spring);
  }, [on, pos]);
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pos.value * 20 }] }));
  return (
    <Pressable
      onPress={() => onChange(!on)}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      style={[styles.track, { backgroundColor: on ? theme.accent : 'rgba(120,120,128,0.22)' }]}
    >
      <Animated.View style={[styles.knob, knobStyle]} />
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
  return (
    <View style={styles.container}>
      <SvgMesh />
      <ScrollView contentContainerStyle={styles.scrollBody}>
        <View style={styles.header}>
          <Text style={styles.kicker}>APP</Text>
          <Text style={styles.title}>Settings</Text>
        </View>

        <Group header="Reminder">
          <Row label="Daily reminder">
            <Toggle on={reminderEnabled} onChange={onReminderEnabledChange} />
          </Row>
          {/* The time only matters when the reminder is on; dim it and disable taps when off
              so the dependency is visible rather than implied. */}
          <View
            style={!reminderEnabled && styles.disabled}
            pointerEvents={reminderEnabled ? 'auto' : 'none'}
          >
            <Row label="Remind me at" last>
              <TimePickerField value={reminderTime} onChange={onReminderTimeChange} />
            </Row>
          </View>
        </Group>

        <Group
          header="Logging"
          footer={`Entries made before ${formatHm12(boundary)} count toward the previous day, so late-night logs land on the right date.`}
        >
          <Row label="Day boundary" last>
            <TimePickerField value={boundary} onChange={onBoundaryChange} />
          </Row>
        </Group>

        <Group header="Data">
          <Row label="Topics tracked">
            <Text style={styles.dataMuted}>{topicCount}</Text>
          </Row>
          <Row label="Storage" last>
            <Text style={styles.dataMuted}>On device · offline</Text>
          </Row>
        </Group>

        <Text style={styles.version}>Journalo · v2.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },

  scrollBody: { paddingHorizontal: 16, paddingBottom: 120 },
  header: { paddingTop: 64, marginBottom: 22 },
  kicker: { fontFamily: fonts.sans, fontSize: 11.5, fontWeight: '600', letterSpacing: 1, color: theme.label2, marginBottom: 6 },
  title: { fontFamily: fonts.sans, fontSize: 34, fontWeight: '700', letterSpacing: -0.6, color: theme.ink },

  group: { marginBottom: 22 },
  groupHeader: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: theme.label2,
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  groupCard: {
    shadowColor: 'rgba(28,38,78,1)',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  groupFooter: {
    fontFamily: fonts.sans,
    fontSize: 11.5,
    lineHeight: 17,
    color: theme.label2,
    paddingHorizontal: 18,
    paddingTop: 8,
  },

  disabled: { opacity: 0.4 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowLabel: { fontFamily: fonts.sans, fontSize: 16, letterSpacing: -0.3, color: theme.ink, flexShrink: 1 },
  rowControl: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  // Hairline between rows, inset from the left to align under the label (iOS grouped-list style).
  rowDivider: { position: 'absolute', left: 16, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: theme.label4 },

  dataMuted: { fontFamily: fonts.sans, fontSize: 15, color: theme.label2 },

  version: { fontFamily: fonts.sans, fontSize: 11.5, color: theme.label3, textAlign: 'center', marginTop: 4 },

  // iOS-style toggle: 51×31 track, 27px knob, knob springs 20px across.
  track: { width: 51, height: 31, borderRadius: 999, padding: 2, justifyContent: 'center' },
  knob: {
    width: 27,
    height: 27,
    borderRadius: 999,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
});
