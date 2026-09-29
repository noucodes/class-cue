import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Button, TextInput, useTheme } from 'react-native-paper';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ChipGroup, FieldError, FieldLabel, PickerField, ReminderField, formStyles } from '@/components/form';
import { CLASS_COLORS, WEEK_ORDER } from '@/constants';
import { useAppStore, type ClassInput } from '@/store/useAppStore';
import { minutesOf, weekdayShort } from '@/utils/schedule';

type Errors = Partial<Record<'subjectName' | 'days' | 'endTime' | 'reminder', string>>;

function validate(f: ClassInput): Errors {
  const e: Errors = {};
  if (!f.subjectName.trim()) e.subjectName = 'Enter the subject name.';
  if (!f.days.length) e.days = 'Pick at least one day.';
  if (minutesOf(f.endTime) <= minutesOf(f.startTime)) e.endTime = 'End time must be after the start time.';
  if (f.reminderEnabled && !(f.reminderMinutes && f.reminderMinutes > 0)) e.reminder = 'Choose when to be reminded.';
  return e;
}

const TEXT_FIELDS: { key: 'subjectCode' | 'teacher' | 'room' | 'building'; label: string }[] = [
  { key: 'subjectCode', label: 'Subject code' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'room', label: 'Room' },
  { key: 'building', label: 'Building' },
];

export default function EditClassScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useAppStore((s) => s.classes.find((c) => c.id === id));
  const classCount = useAppStore((s) => s.classes.length);
  const addClass = useAppStore((s) => s.addClass);
  const updateClass = useAppStore((s) => s.updateClass);

  const [form, setForm] = useState<ClassInput>(() => {
    if (existing) {
      const { id: _id, ...rest } = existing;
      return rest;
    }
    return {
      subjectName: '',
      days: [],
      startTime: '08:00',
      endTime: '09:30',
      color: CLASS_COLORS[classCount % CLASS_COLORS.length],
      reminderEnabled: true,
      reminderMinutes: 15,
    };
  });
  const [errors, setErrors] = useState<Errors>({});
  const set = <K extends keyof ClassInput>(key: K, value: ClassInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = () => {
    const trim = (s?: string) => s?.trim() || undefined;
    const clean: ClassInput = {
      ...form,
      subjectName: form.subjectName.trim(),
      subjectCode: trim(form.subjectCode),
      teacher: trim(form.teacher),
      room: trim(form.room),
      building: trim(form.building),
      notes: trim(form.notes),
    };
    const errs = validate(clean);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (existing) updateClass(existing.id, clean);
    else addClass(clean);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? 'Edit Class' : 'New Class' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <TextInput
          mode="outlined"
          label="Subject name"
          value={form.subjectName}
          onChangeText={(t) => set('subjectName', t)}
          error={!!errors.subjectName}
          autoFocus={!existing}
          style={errors.subjectName ? undefined : formStyles.input}
        />
        {errors.subjectName && <View style={formStyles.input}><FieldError>{errors.subjectName}</FieldError></View>}

        {TEXT_FIELDS.map((f) => (
          <TextInput key={f.key} mode="outlined" label={f.label} value={form[f.key] ?? ''} onChangeText={(t) => set(f.key, t)} style={formStyles.input} />
        ))}

        <ChipGroup<number>
          label="Days"
          options={WEEK_ORDER.map((d) => ({ value: d, label: weekdayShort(d) }))}
          isSelected={(d) => form.days.includes(d)}
          onToggle={(d) => set('days', form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d])}
          error={errors.days}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <PickerField mode="time" label="Start time" value={form.startTime} onChange={(t) => set('startTime', t)} />
          </View>
          <View style={{ flex: 1 }}>
            <PickerField mode="time" label="End time" value={form.endTime} onChange={(t) => set('endTime', t)} error={errors.endTime} />
          </View>
        </View>

        <FieldLabel>Color</FieldLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          {CLASS_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => set('color', c)}
              accessibilityRole="radio"
              accessibilityState={{ checked: form.color === c }}
              accessibilityLabel={`Color ${c}`}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: c,
                borderWidth: 3,
                borderColor: form.color === c ? theme.colors.onSurface : 'transparent',
              }}
            />
          ))}
        </View>

        <TextInput mode="outlined" label="Notes" value={form.notes ?? ''} onChangeText={(t) => set('notes', t)} multiline style={[formStyles.input, { minHeight: 80 }]} />

        <ReminderField
          enabled={form.reminderEnabled}
          minutes={form.reminderMinutes}
          onChange={(enabled, minutes) => setForm((f) => ({ ...f, reminderEnabled: enabled, reminderMinutes: minutes }))}
          error={errors.reminder}
        />

        <Button mode="contained" onPress={save} contentStyle={{ paddingVertical: 6 }} style={{ marginTop: 8 }}>
          {existing ? 'Save changes' : 'Add Class'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
