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
import { GlassSurface } from '../ui/GlassSurface';
import { DEFAULT_TOPIC_COLOR, TOPIC_COLORS } from '../ui/palette';
import { fonts, theme } from '../ui/theme';

// The New Topic screen: name + color is the whole fast path; scale customization is
// tucked behind a disclosure so a topic is creatable in two taps (ARCHITECTURE.md §3).
// On submit it hands the assembled topic up via `onCreate`; the shell mints the ids
// and appends the TopicCreated event. This screen owns only its draft form state.

// The level counts the scale control offers. Granularity is FIXED at creation
// (CLAUDE.md invariant 5) — there is no later event to change it — so this is the one
// and only place a topic's `levels` is decided. The design caps the choice at 2..5.
const LEVEL_OPTIONS = [2, 3, 4, 5] as const;

// Generic per-level labels seeded for each granularity (the design's DEFAULT_LEVELS).
// "Generic labels the user can rename but doesn't have to" (ARCHITECTURE.md §3): every
// topic ships with words so the fast path needs no label typing, and the quick-log
// selector shows something more meaningful than bare numbers.
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
  // A topic requires a color, so one is pre-selected. This is a display default, NOT
  // the "nothing pre-selected" logging invariant — that governs day VALUES, not a
  // topic's color (CLAUDE.md invariant 2).
  const [color, setColor] = useState(DEFAULT_TOPIC_COLOR);
  const [levels, setLevels] = useState<number>(DEFAULT_LEVELS);
  const [labels, setLabels] = useState<string[]>([...DEFAULT_LABELS[DEFAULT_LEVELS]]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const ramp = buildRamp(color, levels);

  // Switch granularity, keeping any non-blank labels the user already typed and
  // filling the rest from the default word-set for the new count.
  const setLevelCount = (n: number) => {
    setLabels((prev) => DEFAULT_LABELS[n].map((d, i) => (prev[i]?.trim() ? prev[i] : d)));
    setLevels(n);
  };

  const setLabelAt = (i: number, text: string) =>
    setLabels((prev) => prev.map((x, j) => (j === i ? text : x)));

  const trimmedName = name.trim();
  // Create stays blocked until the name and EVERY label are non-blank: labels are
  // always stored, so a blank one would be a malformed scale. Blocking (rather than
  // silently substituting a placeholder) keeps stored data honest — "malformed scales
  // impossible to create".
  const labelsComplete = labels.every((l) => l.trim().length > 0);
  const canCreate = trimmedName.length > 0 && labelsComplete;

  const submit = () => {
    if (!canCreate) return;
    onCreate({
      name: trimmedName,
      color,
      scale: { levels, labels: labels.map((l) => l.trim()) },
    });
  };

  return (
    <View style={styles.container}>
      {/* A plain paper header row (no glass bar): only the close/create discs are glass.
          It sits above the scroll region rather than floating over it, so it stays fixed
          while the form scrolls without a glass material to refract the content beneath. */}
      <View style={styles.header}>
        <GlassSurface
          radius={theme.capsule}
          isInteractive
          glassEffectStyle="clear"
          style={styles.glassBtn}
          fallbackStyle={styles.glassBtnFallback}
        >
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.glassBtnPress}
          >
            <Text style={styles.glassGlyph}>✕</Text>
          </Pressable>
        </GlassSurface>
        <Text style={styles.kicker}>NEW TOPIC</Text>
        <GlassSurface
          radius={theme.capsule}
          isInteractive
          glassEffectStyle="clear"
          style={[styles.glassBtn, !canCreate && styles.glassBtnDisabled]}
          fallbackStyle={styles.glassBtnFallback}
        >
          <Pressable
            onPress={submit}
            disabled={!canCreate}
            accessibilityRole="button"
            accessibilityLabel="Create"
            style={styles.glassBtnPress}
          >
            <Text style={styles.glassGlyph}>＋</Text>
          </Pressable>
        </GlassSurface>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        // The fixed header sits outside this view, so on iOS we pad only the scroll
        // region by the keyboard height; Android's adjustResize handles it natively.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
        {/* NAME — the only required free-text field. */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Headache"
            placeholderTextColor={theme.muted}
            autoFocus
            style={styles.nameInput}
          />
        </View>

        {/* COLOR — pick one of the palette swatches; one is always selected. */}
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>COLOR</Text>
          <View style={styles.swatchRow}>
            {TOPIC_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: c === color }}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  c === color ? styles.swatchSelected : styles.swatchUnselected,
                ]}
              />
            ))}
          </View>
        </View>

        {/* SCALE PREVIEW — a non-interactive ramp strip (NOT the quick-log selector):
            the same buildRamp the topic will use, rendered pale→dark so the user sees
            what the chosen color/granularity looks like before committing. */}
        <View style={styles.section}>
          <Text style={styles.previewLabel}>SCALE PREVIEW · pale → dark</Text>
          <View style={styles.previewStrip}>
            {Array.from({ length: levels }, (_, rank) => (
              <View
                key={rank}
                style={[
                  styles.previewSegment,
                  { backgroundColor: ramp.fill(rank) },
                  rank > 0 && styles.previewSegmentDivider,
                ]}
              />
            ))}
          </View>
        </View>

        {/* ADVANCED — granularity + labels, collapsed by default and off the fast path. */}
        <Pressable
          onPress={() => setAdvancedOpen((open) => !open)}
          accessibilityRole="button"
          style={styles.disclosure}
        >
          <Text style={styles.disclosureChevron}>{advancedOpen ? '⌄' : '›'}</Text>
          <Text style={styles.disclosureLabel}>ADVANCED · CUSTOMIZE SCALE</Text>
        </Pressable>

        {advancedOpen && (
          <View style={styles.advanced}>
            <Text style={styles.advancedNote}>Levels can't change after a topic is created.</Text>

            <View style={styles.levelsRow}>
              <Text style={styles.fieldLabel}>LEVELS</Text>
              <View style={styles.levelsControl}>
                {LEVEL_OPTIONS.map((n, idx) => {
                  const selected = levels === n;
                  return (
                    <Pressable
                      key={n}
                      onPress={() => setLevelCount(n)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.levelOption,
                        idx > 0 && styles.levelOptionDivider,
                        selected && styles.levelOptionSelected,
                      ]}
                    >
                      <Text style={[styles.levelOptionLabel, selected && styles.levelOptionLabelSelected]}>
                        {n}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.labelList}>
              {labels.map((label, i) => (
                <View key={i} style={styles.labelItem}>
                  <View style={[styles.labelSwatch, { backgroundColor: ramp.fill(i) }]} />
                  <Text style={styles.labelIndex}>{i + 1}</Text>
                  <TextInput
                    value={label}
                    onChangeText={(text) => setLabelAt(i, text)}
                    placeholder={`level ${i + 1}`}
                    placeholderTextColor={theme.muted}
                    style={styles.labelInput}
                  />
                </View>
              ))}
            </View>

            {!labelsComplete && (
              <Text style={styles.validationNote}>Every level needs a label.</Text>
            )}
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.paper },
  keyboardView: { flex: 1 },

  // Plain paper header: 56px top clears the iOS notch/status bar without a safe-area
  // dependency (the value ScreenHeader used), a hairline rule separates it from the form,
  // and the row lays out cancel disc, kicker, create disc.
  header: {
    paddingTop: 56,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.rule,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Close / Create are clear-glass circular icon buttons (iOS Weather style). A faint
  // hairline ring — NOT the hard ink panel border — lets the untinted glass read against
  // the pale paper, the same thin stroke the Weather controls carry; the ring lives in
  // `style` so it shows on both the glass and solid-paper-fallback paths.
  glassBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: theme.hair,
    overflow: 'hidden',
  },
  // Pressable fills the whole circle so the entire glass disc is the tap target.
  glassBtnPress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Create stays dimmed until the form is valid (mirrors the old createBtnDisabled).
  glassBtnDisabled: { opacity: 0.35 },
  // The fallback disc gets a faint fill so it reads as a circle on Android / pre-iOS-26,
  // where there is no glass material to define its edge.
  glassBtnFallback: { backgroundColor: theme.field },
  glassGlyph: { fontFamily: fonts.sans, fontSize: 18, color: theme.ink, lineHeight: 22 },
  kicker: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    color: theme.muted,
  },

  body: { paddingHorizontal: 18, paddingBottom: 60 },
  section: { paddingTop: 20 },

  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    color: theme.muted,
    marginBottom: 10,
  },
  nameInput: {
    fontFamily: fonts.sans,
    fontSize: 22,
    fontWeight: '700',
    color: theme.ink,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: theme.field,
    borderWidth: 1.5,
    borderColor: theme.ink,
    borderRadius: theme.radius,
  },

  swatchRow: { flexDirection: 'row', gap: 7 },
  swatch: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: theme.radius,
  },
  swatchSelected: { borderWidth: 2.5, borderColor: theme.ink },
  swatchUnselected: { borderWidth: 1.5, borderColor: theme.hair },

  previewLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.4,
    color: theme.muted,
    marginBottom: 8,
  },
  previewStrip: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: theme.ink,
    borderRadius: theme.radius,
    overflow: 'hidden',
  },
  previewSegment: { flex: 1, minHeight: 44 },
  previewSegmentDivider: { borderLeftWidth: 1, borderLeftColor: theme.hair },

  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 6,
  },
  disclosureChevron: {
    fontFamily: fonts.sans,
    fontSize: 16,
    color: theme.ink,
    width: 14,
    textAlign: 'center',
  },
  disclosureLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    color: theme.ink,
  },

  advanced: {
    borderTopWidth: 1.5,
    borderTopColor: theme.rule,
    paddingTop: 16,
  },
  advancedNote: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: theme.muted,
    marginBottom: 16,
    lineHeight: 15,
  },
  levelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelsControl: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: theme.ink,
    borderRadius: theme.radius,
    overflow: 'hidden',
  },
  levelOption: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  levelOptionDivider: { borderLeftWidth: 1.5, borderLeftColor: theme.ink },
  levelOptionSelected: { backgroundColor: theme.ink },
  levelOptionLabel: { fontFamily: fonts.mono, fontSize: 13, fontWeight: '700', color: theme.ink },
  levelOptionLabelSelected: { color: theme.paper },

  labelList: { paddingTop: 16, gap: 9 },
  labelItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  labelSwatch: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: theme.hair,
    flexShrink: 0,
  },
  labelIndex: { fontFamily: fonts.mono, fontSize: 10, color: theme.muted, width: 14 },
  labelInput: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 13,
    color: theme.ink,
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: theme.field,
    borderWidth: 1.5,
    borderColor: theme.ink,
    borderRadius: theme.radius,
  },

  validationNote: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: theme.muted,
    marginTop: 12,
  },
});
