import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Button, TextInput, useTheme } from 'react-native-paper';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ChipGroup, FieldError, PickerField, ReminderField, formStyles } from '@/components/form';
import { EVENT_TYPES, PRIORITIES, TASK_TYPES, TYPE_FIELDS } from '@/constants';
import { useAppStore, type EventInput } from '@/store/useAppStore';
import type { EventType, Priority, TaskType } from '@/types';
import { minutesOf, toDateKey } from '@/utils/schedule';

type Errors = Partial<Record<'title' | 'endTime' | 'reminder', string>>;

function validate(f: EventInput): Errors {
  const e: Errors = {};
  if (!f.title.trim()) e.title = 'Give it a name.';
  else if (f.title.length > 120) e.title = 'Keep the name under 120 characters.';
  if (f.endTime && !f.startTime) e.endTime = 'Set a start time first.';
  else if (f.endTime && f.startTime && minutesOf(f.endTime) <= minutesOf(f.startTime)) e.endTime = 'End time must be after the start time.';
  if (f.reminderEnabled && !(f.reminderMinutes && f.reminderMinutes > 0)) e.reminder = 'Choose when to be reminded.';
  return e;
}

export default function EditEventScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string; type?: TaskType; date?: string; subjectId?: string }>();
  const existing = useAppStore((s) => s.events.find((e) => e.id === params.id));
  const classes = useAppStore((s) => s.classes);
  const defaultReminder = useAppStore((s) => s.settings.defaultReminderMinutes);
  const addEvent = useAppStore((s) => s.addEvent);
  const updateEvent = useAppStore((s) => s.updateEvent);

  const [form, setForm] = useState<EventInput>(() => {
    if (existing) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = existing;
      return rest;
    }
    const type = params.type && TASK_TYPES.includes(params.type) ? params.type : 'assignment';
    return {
      title: '',
      type,
      subjectId: params.subjectId,
      date: params.date ?? toDateKey(new Date()),
      priority: TYPE_FIELDS[type].priority ? 'medium' : undefined,
      completed: false,
      reminderEnabled: true,
      reminderMinutes: defaultReminder,
    };
  });
  const [errors, setErrors] = useState<Errors>({});
  const set = <K extends keyof EventInput>(key: K, value: EventInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const fields = TYPE_FIELDS[form.type];
  const label = EVENT_TYPES[form.type].label;

  const changeType = (type: EventType) => {
    if (type === 'class') {
      router.replace('/class/edit');
      return;
    }
    setForm((f) => ({
      ...f,
      type,
      priority: TYPE_FIELDS[type].priority ? (f.priority ?? 'medium') : undefined,
      location: TYPE_FIELDS[type].location ? f.location : undefined,
      endTime: TYPE_FIELDS[type].endTime ? f.endTime : undefined,
    }));
  };

  const save = () => {
    const clean: EventInput = {
      ...form,
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      location: form.location?.trim() || undefined,
    };
    const errs = validate(clean);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (existing) updateEvent(existing.id, clean);
    else addEvent(clean);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: existing ? `Edit ${label}` : `New ${label}` }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {!existing && (
          <ChipGroup<EventType>
            label="Event type"
            options={[...TASK_TYPES, 'class' as const].map((t) => ({ value: t, label: EVENT_TYPES[t].label, icon: EVENT_TYPES[t].icon, color: EVENT_TYPES[t].color }))}
            isSelected={(t) => t === form.type}
            onToggle={changeType}
          />
        )}

        <TextInput
          mode="outlined"
          label={`${label} name`}
          value={form.title}
          onChangeText={(t) => set('title', t)}
          error={!!errors.title}
          autoFocus={!existing}
          style={errors.title ? undefined : formStyles.input}
        />
        {errors.title && <View style={formStyles.input}><FieldError>{errors.title}</FieldError></View>}

        {classes.length > 0 && (
          <ChipGroup<string>
            label="Subject"
            options={[{ value: '', label: 'None' }, ...classes.map((c) => ({ value: c.id, label: c.subjectName, color: c.color }))]}
            isSelected={(id) => (form.subjectId ?? '') === id}
            onToggle={(id) => set('subjectId', id || undefined)}
          />
        )}

        <PickerField mode="date" label={fields.timeLabel === 'Due time' ? 'Due date' : 'Date'} value={form.date} onChange={(d) => set('date', d)} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <PickerField mode="time" label={fields.timeLabel} value={form.startTime} onChange={(t) => set('startTime', t)} onClear={() => set('startTime', undefined)} />
          </View>
          {fields.endTime && (
            <View style={{ flex: 1 }}>
              <PickerField mode="time" label="End time" value={form.endTime} onChange={(t) => set('endTime', t)} onClear={() => set('endTime', undefined)} error={errors.endTime} />
            </View>
          )}
        </View>

        {fields.location && (
          <TextInput mode="outlined" label="Location" value={form.location ?? ''} onChangeText={(t) => set('location', t)} style={formStyles.input} />
        )}

        {fields.priority && (
          <ChipGroup<Priority>
            label="Priority"
            options={(Object.keys(PRIORITIES) as Priority[]).map((p) => ({ value: p, label: PRIORITIES[p].label, icon: PRIORITIES[p].icon, color: PRIORITIES[p].color }))}
            isSelected={(p) => form.priority === p}
            onToggle={(p) => set('priority', p)}
          />
        )}

        <TextInput
          mode="outlined"
          label={fields.priority ? 'Description' : 'Notes'}
          value={form.description ?? ''}
          onChangeText={(t) => set('description', t)}
          multiline
          style={[formStyles.input, { minHeight: 96 }]}
        />

        <ReminderField
          enabled={form.reminderEnabled}
          minutes={form.reminderMinutes}
          onChange={(enabled, minutes) => setForm((f) => ({ ...f, reminderEnabled: enabled, reminderMinutes: minutes }))}
          error={errors.reminder}
        />

        <Button mode="contained" onPress={save} contentStyle={{ paddingVertical: 6 }} style={{ marginTop: 8 }}>
          {existing ? 'Save changes' : `Add ${label}`}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
