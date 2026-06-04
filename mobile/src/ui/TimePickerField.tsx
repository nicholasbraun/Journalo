import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

import type { TimeOfDay } from '@journal/core';

import { fonts, theme } from './theme';
import { formatHm12, fromDate, toDate } from './time';

// A native time-of-day picker, used for both settings times (reminder + day boundary).
// Replaces the old hand-built −/value/+ stepper with the real platform control — the same
// native-over-custom trade as the Liquid Glass tab bar. The `TimeOfDay` shape is unchanged,
// so callers (and the settings store / domain) are untouched; this only swaps the input UI.

type Props = {
  readonly value: TimeOfDay;
  readonly onChange: (time: TimeOfDay) => void;
};

export function TimePickerField({ value, onChange }: Props) {
  const handle = (_event: DateTimePickerEvent, date?: Date) => {
    // Android fires onChange with no date on dismiss/cancel; ignore those.
    if (date !== undefined) onChange(fromDate(date));
  };

  if (Platform.OS === 'ios') {
    // The compact display renders an inline tappable pill that pops the native wheel.
    // Accent tinted to brand ink; light theme pinned (app is light-only this session).
    return (
      <DateTimePicker
        value={toDate(value)}
        mode="time"
        display="compact"
        accentColor={theme.ink}
        themeVariant="light"
        onChange={handle}
      />
    );
  }

  // Android has no inline compact picker; show the value and open the native dialog on tap.
  return (
    <Pressable
      onPress={() =>
        DateTimePickerAndroid.open({ value: toDate(value), mode: 'time', is24Hour: false, onChange: handle })
      }
      accessibilityRole="button"
      accessibilityLabel={`Time, ${formatHm12(value)}`}
      style={styles.androidField}
    >
      <Text style={styles.androidValue}>{formatHm12(value)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  androidField: {
    borderWidth: 1.5,
    borderColor: theme.ink,
    borderRadius: theme.radius,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  androidValue: {
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    color: theme.ink,
  },
});
