import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { ActivityIndicator, Button, Checkbox, Switch, Text, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { Card, EmptyState, SectionTitle } from '@/components/ui';
import { CLASS_COLORS, CLASS_MODES } from '@/constants';
import { pickSchedulePdf } from '@/services/scheduleImport';
import { useAppStore, type ClassInput } from '@/store/useAppStore';
import type { ClassSchedule } from '@/types';
import { formatDays, formatTimeRange } from '@/utils/schedule';
import type { ClassDraft } from '@/utils/scheduleImport';

interface Row {
  draft: ClassDraft;
  selected: boolean;
  duplicate: boolean;
}

// The PDF has one class per subject name, so a class with the same name is already imported.
const isDuplicate = (d: ClassDraft, classes: ClassSchedule[]) =>
  classes.some((c) => c.subjectName.trim().toLowerCase() === d.subjectName.trim().toLowerCase());

const toClassInputs = (drafts: ClassDraft[], colorOffset: number): ClassInput[] =>
  drafts.map((d, i) => ({ ...d, color: CLASS_COLORS[(colorOffset + i) % CLASS_COLORS.length], reminderEnabled: true, reminderMinutes: 15 }));

export default function ImportScheduleScreen() {
  const theme = useTheme();
  const classes = useAppStore((s) => s.classes);
  const importClasses = useAppStore((s) => s.importClasses);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<{ name: string; rows: Row[]; skipped: string[] } | null>(null);
  const [replace, setReplace] = useState(false);

  const choose = async () => {
    setLoading(true);
    try {
      const result = await pickSchedulePdf();
      if (!result) return;
      setFile({
        name: result.fileName,
        skipped: result.skipped,
        rows: result.classes.map((draft) => {
          const duplicate = !replace && isDuplicate(draft, classes);
          return { draft, duplicate, selected: !duplicate };
        }),
      });
    } catch (e) {
      Alert.alert("Couldn't read that PDF", e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) =>
    setFile((f) => f && { ...f, rows: f.rows.map((r, idx) => (idx === i ? { ...r, selected: !r.selected } : r)) });

  const selected = file?.rows.filter((r) => r.selected).map((r) => r.draft) ?? [];

  const doImport = () => {
    importClasses(toClassInputs(selected, replace ? 0 : classes.length), replace);
    router.back();
  };

  const confirmImport = () => {
    if (!replace) return doImport();
    Alert.alert(
      'Replace your classes?',
      `Your ${classes.length} current classes will be removed and replaced with ${selected.length} from the PDF. Tasks are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: doImport },
      ],
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', gap: 12, backgroundColor: theme.colors.background }}>
        <ActivityIndicator />
        <Text style={{ textAlign: 'center' }}>Reading your schedule…</Text>
      </View>
    );
  }

  if (!file) {
    return (
      <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16 }}>
        <EmptyState
          icon="file-document-outline"
          title="Import your class schedule"
          message="Choose your registration form PDF (e.g. Certificate of Registration). ClassCue reads the subject table on your phone — nothing is uploaded."
          actionLabel="Choose PDF"
          onAction={choose}
        />
      </ScrollView>
    );
  }

  const dupes = file.rows.filter((r) => r.duplicate).length;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
          {file.name}
        </Text>

        {file.rows.length === 0 ? (
          <EmptyState
            icon="file-question-outline"
            title="No class schedule found"
            message="This PDF doesn't have a readable subject table. Scanned images or photos can't be read — add classes manually instead."
            actionLabel="Choose another PDF"
            onAction={choose}
          />
        ) : (
          <>
            <SectionTitle>{`Found ${file.rows.length} class${file.rows.length === 1 ? '' : 'es'}`}</SectionTitle>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {file.rows.map(({ draft, selected: on, duplicate }, i) => (
                <Pressable
                  key={i}
                  onPress={() => toggle(i)}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: theme.colors.outlineVariant }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <Checkbox.Android status={on ? 'checked' : 'unchecked'} onPress={() => toggle(i)} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="titleSmall">
                      {draft.subjectName}
                      {draft.subjectCode ? <Text style={{ color: theme.colors.onSurfaceVariant }}>{`  ${draft.subjectCode}`}</Text> : null}
                    </Text>
                    {draft.sessions.map((s, si) => (
                      <Text key={si} variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                        {[formatDays(s.days), formatTimeRange(s.startTime, s.endTime), CLASS_MODES[s.mode].label, s.room].filter(Boolean).join(' · ')}
                      </Text>
                    ))}
                    {draft.teacher && (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                        {draft.teacher}
                      </Text>
                    )}
                    {duplicate && (
                      <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                        Already in your classes
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </Card>

            {file.skipped.length > 0 && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                No schedule listed for: {file.skipped.join(', ')}. Add these manually once they have a time.
              </Text>
            )}

            {classes.length > 0 && (
              <Card style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge">Replace my current classes</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {`Removes your ${classes.length} existing classes. Tasks are kept.`}
                    </Text>
                  </View>
                  <Switch
                    value={replace}
                    onValueChange={(v) => {
                      setReplace(v);
                      // Duplicates only matter when adding alongside existing classes.
                      setFile((f) => f && { ...f, rows: f.rows.map((r) => ({ ...r, duplicate: !v && isDuplicate(r.draft, classes), selected: v ? true : !isDuplicate(r.draft, classes) })) });
                    }}
                    accessibilityLabel="Replace my current classes"
                  />
                </View>
              </Card>
            )}
            {!replace && dupes > 0 && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                {dupes} already added — unchecked so they are not added twice.
              </Text>
            )}

            <Button mode="contained" onPress={confirmImport} disabled={!selected.length} style={{ marginTop: 20 }} contentStyle={{ paddingVertical: 6 }}>
              {`Add ${selected.length} class${selected.length === 1 ? '' : 'es'}`}
            </Button>
            <Button onPress={choose} style={{ marginTop: 8 }}>
              Choose a different PDF
            </Button>
          </>
        )}
      </ScrollView>
    </View>
  );
}
