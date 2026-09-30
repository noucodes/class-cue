import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Button, IconButton, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ChipGroup, FieldError, FieldLabel, PickerField, ReminderField, formStyles } from '@/components/form';
import { Card } from '@/components/ui';
import { CLASS_COLORS, CLASS_MODES, WEEK_ORDER } from '@/constants';
import { useAppStore, type ClassInput } from '@/store/useAppStore';
import type { ClassMode, ClassSession } from '@/types';
import { minutesOf, weekdayShort } from '@/utils/schedule';

type SessionErrors = Partial<Record<'days' | 'endTime', string>>;
type Errors = Partial<Record<'subjectName' | 'reminder', string>> & { sessions?: SessionErrors[] };

function validate(f: ClassInput): Errors {
  const e: Errors = {};
  if (!f.subjectName.trim()) e.subjectName = 'Enter the subject name.';
  const sessions = f.sessions.map((s) => {
    const se: SessionErrors = {};
    if (!s.days.length) se.days = 'Pick at least one day.';
    if (minutesOf(s.endTime) <= minutesOf(s.startTime)) se.endTime = 'End time must be after the start time.';
    return se;
  });
  if (sessions.some((se) => Object.keys(se).length)) e.sessions = sessions;
  if (f.reminderEnabled && !(f.reminderMinutes && f.reminderMinutes > 0)) e.reminder = 'Choose when to be reminded.';
  return e;
}

const TEXT_FIELDS: { key: 'subjectCode' | 'teacher' | 'building'; label: string }[] = [
  { key: 'subjectCode', label: 'Subject code' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'building', label: 'Building' },
];

const newSession = (from?: ClassSession): ClassSession => ({
  days: [],
  startTime: from?.startTime ?? '08:00',
  endTime: from?.endTime ?? '09:30',
  mode: from?.mode ?? 'f2f',
});

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
      sessions: [newSession()],
      color: CLASS_COLORS[classCount % CLASS_COLORS.length],
      reminderEnabled: true,
      reminderMinutes: 15,
    };
  });
  const [errors, setErrors] = useState<Errors>({});
  const set = <K extends keyof ClassInput>(key: K, value: ClassInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setSession = (i: number, patch: Partial<ClassSession>) =>
    setForm((f) => ({ ...f, sessions: f.sessions.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  const removeSession = (i: number) => {
    setForm((f) => ({ ...f, sessions: f.sessions.filter((_, idx) => idx !== i) }));
    setErrors((e) => ({ ...e, sessions: e.sessions?.filter((_, idx) => idx !== i) }));
  };

  const save = () => {
    const trim = (s?: string) => s?.trim() || undefined;
    const clean: ClassInput = {
      ...form,
      subjectName: form.subjectName.trim(),
      subjectCode: trim(form.subjectCode),
      teacher: trim(form.teacher),
      building: trim(form.building),
      sessions: form.sessions.map((x) => ({ ...x, room: trim(x.room) })),
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

        {form.sessions.map((session, i) => {
          const se = errors.sessions?.[i] ?? {};
          return (
            <Card key={i} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text variant="titleSmall" style={{ flex: 1 }}>
                  {form.sessions.length > 1 ? `Schedule ${i + 1}` : 'Schedule'}
                </Text>
                {form.sessions.length > 1 && (
                  <IconButton icon="trash-can-outline" size={20} style={{ margin: 0 }} onPress={() => removeSession(i)} accessibilityLabel={`Remove schedule ${i + 1}`} />
                )}
              </View>
              <ChipGroup<number>
                label="Days"
                options={WEEK_ORDER.map((d) => ({ value: d, label: weekdayShort(d) }))}
                isSelected={(d) => session.days.includes(d)}
                onToggle={(d) => setSession(i, { days: session.days.includes(d) ? session.days.filter((x) => x !== d) : [...session.days, d] })}
                error={se.days}
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <PickerField mode="time" label="Start time" value={session.startTime} onChange={(t) => setSession(i, { startTime: t })} />
                </View>
                <View style={{ flex: 1 }}>
                  <PickerField mode="time" label="End time" value={session.endTime} onChange={(t) => setSession(i, { endTime: t })} error={se.endTime} />
                </View>
              </View>
              <SegmentedButtons
                value={session.mode}
                onValueChange={(v) => setSession(i, { mode: v as ClassMode })}
                buttons={(Object.keys(CLASS_MODES) as ClassMode[]).map((m) => ({ value: m, label: CLASS_MODES[m].label, icon: CLASS_MODES[m].icon }))}
                style={formStyles.input}
              />
              <TextInput
                mode="outlined"
                label={session.mode === 'online' ? 'Room or meeting link (optional)' : 'Room'}
                value={session.room ?? ''}
                onChangeText={(t) => setSession(i, { room: t })}
              />
            </Card>
          );
        })}
        <Button
          icon="plus"
          mode="outlined"
          onPress={() => set('sessions', [...form.sessions, newSession(form.sessions.at(-1))])}
          style={{ marginBottom: 16 }}
        >
          Add another schedule
        </Button>

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
