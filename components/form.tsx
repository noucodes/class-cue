import { Platform, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { Chip, IconButton, Switch, Text, TextInput, TouchableRipple, useTheme } from 'react-native-paper';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { REMINDER_OPTIONS, type IconName } from '@/constants';
import { atTime, formatDateLong, formatTime, parseDateKey, toDateKey, toTimeKey } from '@/utils/schedule';

export interface ChipOption<T> {
  value: T;
  label: string;
  icon?: IconName;
  color?: string;
}

/** Single or multi select as a wrap of chips; the caller decides via isSelected/onToggle. */
export function ChipGroup<T extends string | number>({
  label,
  options,
  isSelected,
  onToggle,
  error,
}: {
  label?: string;
  options: ChipOption<T>[];
  isSelected: (value: T) => boolean;
  onToggle: (value: T) => void;
  error?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <View style={styles.chips}>
        {options.map((o) => {
          const selected = isSelected(o.value);
          return (
            <Chip
              key={String(o.value)}
              icon={o.icon}
              selected={selected}
              showSelectedCheck={false}
              mode={selected ? 'flat' : 'outlined'}
              onPress={() => onToggle(o.value)}
              style={selected && o.color ? { backgroundColor: `${o.color}29` } : undefined}
              textStyle={selected && o.color ? { color: theme.dark ? theme.colors.onSurface : o.color } : undefined}
            >
              {o.label}
            </Chip>
          );
        })}
      </View>
      {error && <FieldError>{error}</FieldError>}
    </View>
  );
}

/** Date ("YYYY-MM-DD") or time ("HH:mm") field backed by the native picker. */
export function PickerField({
  mode,
  label,
  value,
  onChange,
  onClear,
  error,
}: {
  mode: 'date' | 'time';
  label: string;
  value?: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  error?: string;
}) {
  const theme = useTheme();
  const date = value ? (mode === 'date' ? parseDateKey(value) : atTime(toDateKey(new Date()), value)) : new Date();
  const emit = (d: Date) => onChange(mode === 'date' ? toDateKey(d) : toTimeKey(d));
  const display = value ? (mode === 'date' ? formatDateLong(value) : formatTime(value)) : 'Not set';

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: date, mode, onValueChange: (_e, d) => emit(d) });
    } else if (!value) {
      emit(date);
    }
  };

  return (
    <View style={styles.field}>
      <FieldLabel>{label}</FieldLabel>
      <View style={[styles.picker, { borderColor: error ? theme.colors.error : theme.colors.outlineVariant }]}>
        {Platform.OS === 'ios' && value ? (
          <DateTimePicker value={date} mode={mode} display="compact" onValueChange={(_e, d) => emit(d)} />
        ) : (
          <TouchableRipple onPress={open} style={{ flex: 1, paddingVertical: 12 }} accessibilityRole="button" accessibilityLabel={`${label}: ${display}`}>
            <Text variant="bodyLarge" style={!value && { color: theme.colors.onSurfaceVariant }}>
              {display}
            </Text>
          </TouchableRipple>
        )}
        {onClear && value ? <IconButton icon="close" size={18} onPress={onClear} accessibilityLabel={`Clear ${label}`} /> : null}
      </View>
      {error && <FieldError>{error}</FieldError>}
    </View>
  );
}

/** Reminder toggle + preset offsets + custom minutes. `minutes` is only meaningful when enabled. */
export function ReminderField({
  enabled,
  minutes,
  onChange,
  error,
}: {
  enabled: boolean;
  minutes?: number;
  onChange: (enabled: boolean, minutes?: number) => void;
  error?: string;
}) {
  const isPreset = REMINDER_OPTIONS.some((o) => o.minutes === minutes);
  const [custom, setCustom] = useState(minutes != null && !isPreset);
  return (
    <View style={styles.field}>
      <View style={styles.switchRow}>
        <Text variant="bodyLarge">Reminder</Text>
        <Switch value={enabled} onValueChange={(v) => onChange(v, minutes)} accessibilityLabel="Reminder" />
      </View>
      {enabled && (
        <>
          <ChipGroup<number>
            options={[...REMINDER_OPTIONS.map((o) => ({ value: o.minutes, label: `${o.label} before` })), { value: -1, label: 'Custom' }]}
            isSelected={(v) => (v === -1 ? custom : !custom && v === minutes)}
            onToggle={(v) => {
              setCustom(v === -1);
              if (v !== -1) onChange(true, v);
            }}
          />
          {custom && (
            <TextInput
              mode="outlined"
              label="Minutes before"
              keyboardType="number-pad"
              value={minutes != null ? String(minutes) : ''}
              onChangeText={(t) => onChange(true, t ? Number(t.replace(/\D/g, '')) : undefined)}
            />
          )}
        </>
      )}
      {error && <FieldError>{error}</FieldError>}
    </View>
  );
}

export function FieldLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
      {children}
    </Text>
  );
}

export function FieldError({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 4 }}>
      {children}
    </Text>
  );
}

export const formStyles = StyleSheet.create({
  input: { marginBottom: 16 },
});

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  picker: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, minHeight: 50 },
});
