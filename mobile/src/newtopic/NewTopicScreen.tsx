import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { Scale } from '@journal/core';

import { buildRamp } from '../ui/colorRamp';
import { Chevron, IconCheck, IconClose } from '../ui/icons';
import { DEFAULT_TOPIC_COLOR, TOPIC_COLORS } from '../ui/palette';
import { SvgMesh } from '../ui/SvgMesh';
import { fonts, theme } from '../ui/theme';

// The floating header's height (18 top inset + 34 disc + 12 below). The discs are fixed-size,
// so the scroll region reserves this as top padding without measuring.
const HEADER_HEIGHT = 72;

// The New Topic screen: name + color is the whole fast path; scale customization is tucked
// behind a disclosure so a topic is creatable in two taps (ARCHITECTURE.md §3). On submit it
// hands the assembled topic up via `onCreate`; the shell mints the ids and appends the
// TopicCreated event. This screen owns only its draft form state.

// The level counts the scale control offers. Granularity is FIXED at creation (CLAUDE.md
// invariant 5) — there is no later event to change it — so this is the one and only place a
// topic's `levels` is decided. The design caps the choice at 2..5.
const LEVEL_OPTIONS = [2, 3, 4, 5] as const;

// Generic per-level labels seeded for each granularity (the design's DEFAULT_LEVELS): every
// topic ships with words so the fast path needs no label typing.
const DEFAULT_LABELS: Readonly<Record<number, readonly string[]>> = {
  2: ['no', 'yes'],
  3: ['low', 'mid', 'high'],
  4: ['none', 'some', 'more', 'most'],
  5: ['none', 'low', 'medium', 'high', 'max'],
};

const DEFAULT_LEVELS = 5;

type Props = {
  // Hand the finished topic up to the shell, which mints ids/ts and appends the
  // TopicCreated event. `scale.labels` is always present with one entry per level.
  readonly onCreate: (input: { name: string; color: string; scale: Scale }) => void;
  // Abandon the draft and return to the quick-log screen without creating anything.
  readonly onCancel: () => void;
};

export function NewTopicScreen({ onCreate, onCancel }: Props) {
  const [name, setName] = useState('');
  // A topic requires a color, so one is pre-selected. This is a display default, NOT the
  // "nothing pre-selected" logging invariant — that governs day VALUES (CLAUDE.md invariant 2).
  const [color, setColor] = useState(DEFAULT_TOPIC_COLOR);
  const [levels, setLevels] = useState<number>(DEFAULT_LEVELS);
  const [labels, setLabels] = useState<string[]>([...DEFAULT_LABELS[DEFAULT_LEVELS]]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const ramp = buildRamp(color, levels);

  // Switch granularity, keeping any non-blank labels the user already typed and filling the
  // rest from the default word-set for the new count.
  const setLevelCount = (n: number) => {
    setLabels((prev) => DEFAULT_LABELS[n].map((d, i) => (prev[i]?.trim() ? prev[i] : d)));
    setLevels(n);
  };

  const setLabelAt = (i: number, text: string) =>
    setLabels((prev) => prev.map((x, j) => (j === i ? text : x)));

  const trimmedName = name.trim();
  // Create stays blocked until the name and EVERY label are non-blank: labels are always
  // stored, so a blank one would be a malformed scale.
  const labelsComplete = labels.every((l) => l.trim().length > 0);
  const canCreate = trimmedName.length > 0 && labelsComplete;

  const submit = () => {
    if (!canCreate) return;
    onCreate({ name: trimmedName, color, scale: { levels, labels: labels.map((l) => l.trim()) } });
  };

  return (
    <View style={styles.container}>
      <SvgMesh />
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingTop: HEADER_HEIGHT }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* NAME — the only required free-text field. */}
          <Text style={styles.fieldLabel}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Anxiety"
            placeholderTextColor={theme.label3}
            autoFocus
            style={styles.nameInput}
          />

          {/* COLOR — pick one of the palette swatches; one is always selected. */}
          <Text style={[styles.fieldLabel, styles.sectionGap]}>COLOR</Text>
          <View style={styles.swatchRow}>
            {TOPIC_COLORS.map((c) => {
              const selected = c === color;
              return (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.swatch,
                    { backgroundColor: c, transform: [{ scale: selected ? 1 : 0.86 }] },
                    selected && { shadowColor: c, shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
                  ]}
                >
                  {selected && <IconCheck size={15} color="#fff" />}
                </Pressable>
              );
            })}
          </View>

          {/* SCALE PREVIEW — a non-interactive ramp strip (NOT the quick-log selector): the
              same buildRamp the topic will use, rendered pale→dark with its labels. */}
          <Text style={[styles.fieldLabel, styles.sectionGap]}>SCALE PREVIEW · PALE → DARK</Text>
          <View style={styles.previewStrip}>
            {Array.from({ length: levels }, (_, rank) => (
              <View key={rank} style={[styles.previewSegment, { backgroundColor: ramp.fill(rank) }]}>
                <Text numberOfLines={1} style={[styles.previewLabel, { color: ramp.textOn(rank) }]}>
                  {labels[rank]}
                </Text>
              </View>
            ))}
          </View>

          {/* ADVANCED — granularity + labels, collapsed by default and off the fast path. */}
          <Pressable
            onPress={() => setAdvancedOpen((open) => !open)}
            accessibilityRole="button"
            style={styles.disclosure}
          >
            <View style={{ transform: [{ rotate: advancedOpen ? '90deg' : '0deg' }] }}>
              <Chevron dir="right" size={14} color={theme.label2} />
            </View>
            <Text style={styles.disclosureLabel}>CUSTOMIZE SCALE</Text>
          </Pressable>

          {advancedOpen && (
            <View>
              <Text style={styles.advancedNote}>Levels can't change after a topic is created.</Text>

              <View style={styles.levelsRow}>
                <Text style={styles.fieldLabel}>LEVELS</Text>
                <View style={styles.levelsControl}>
                  {LEVEL_OPTIONS.map((n) => {
                    const selected = levels === n;
                    return (
                      <Pressable
                        key={n}
                        onPress={() => setLevelCount(n)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[styles.levelOption, selected && styles.levelOptionSelected]}
                      >
                        <Text style={[styles.levelOptionLabel, selected && styles.levelOptionLabelSelected]}>{n}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.labelList}>
                {labels.map((label, i) => (
                  <View key={i} style={styles.labelItem}>
                    <View style={[styles.labelSwatch, { backgroundColor: ramp.fill(i) }]} />
                    <TextInput
                      value={label}
                      onChangeText={(text) => setLabelAt(i, text)}
                      placeholder={`level ${i + 1}`}
                      placeholderTextColor={theme.label3}
                      style={styles.labelInput}
                    />
                  </View>
                ))}
              </View>

              {!labelsComplete && <Text style={styles.validationNote}>Every level needs a label.</Text>}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating header: a grabber + close/title/create. Close is a neutral disc; Create
          fills with the chosen topic color once the form is valid (the design's colored
          check button), so the action previews the topic's identity. */}
      <View style={styles.header}>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          style={({ pressed }) => [styles.disc, styles.closeDisc, pressed && styles.pressed]}
        >
          <IconClose size={16} color={theme.label2} />
        </Pressable>
        <Text style={styles.headerTitle}>New topic</Text>
        <Pressable
          onPress={submit}
          disabled={!canCreate}
          accessibilityRole="button"
          accessibilityLabel="Create"
          style={({ pressed }) => [
            styles.disc,
            canCreate
              ? { backgroundColor: color, shadowColor: color, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }
              : styles.createDiscDisabled,
            pressed && canCreate && styles.pressed,
          ]}
        >
          <IconCheck size={17} color={canCreate ? '#fff' : theme.label3} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  keyboardView: { flex: 1 },

  // Floating, transparent header pinned to the modal's top (no notch to clear — a sheet sits
  // below the status bar). The form scrolls under the discs.
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontFamily: fonts.sans, fontSize: 17, fontWeight: '600', letterSpacing: -0.3, color: theme.ink },
  disc: { width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  closeDisc: { backgroundColor: 'rgba(120,120,128,0.16)' },
  createDiscDisabled: { backgroundColor: 'rgba(120,120,128,0.2)' },
  pressed: { opacity: 0.7 },

  body: { paddingHorizontal: 18, paddingBottom: 60 },
  sectionGap: { marginTop: 22 },

  fieldLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.label2,
    marginBottom: 10,
  },
  nameInput: {
    fontFamily: fonts.sans,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: theme.ink,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glassEdge,
  },

  swatchRow: { flexDirection: 'row', gap: 8 },
  swatch: { flex: 1, aspectRatio: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  previewStrip: { flexDirection: 'row', gap: 5 },
  previewSegment: { flex: 1, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  previewLabel: { fontFamily: fonts.sans, fontSize: 10.5, fontWeight: '600' },

  disclosure: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22, paddingVertical: 6 },
  disclosureLabel: { fontFamily: fonts.sans, fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: theme.ink },

  advancedNote: { fontFamily: fonts.sans, fontSize: 11.5, color: theme.label2, marginBottom: 14, paddingTop: 6 },
  levelsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  levelsControl: { flexDirection: 'row', gap: 4, backgroundColor: 'rgba(120,120,128,0.12)', borderRadius: 11, padding: 3 },
  levelOption: { width: 38, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  levelOptionSelected: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  levelOptionLabel: { fontFamily: fonts.sans, fontSize: 14, fontWeight: '700', color: theme.label2 },
  levelOptionLabelSelected: { color: theme.ink },

  labelList: { gap: 8 },
  labelItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  labelSwatch: { width: 22, height: 22, borderRadius: 7, flexShrink: 0 },
  labelInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: theme.ink,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glassEdge,
  },

  validationNote: { fontFamily: fonts.sans, fontSize: 11.5, color: theme.label2, marginTop: 12 },
});
