import { useMemo } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Card, EmptyState, InfoLine, SectionTitle } from '@/components/ui';
import { EventRow } from '@/components/rows';
import { CLASS_MODES } from '@/constants';
import { useNow } from '@/hooks/useNow';
import { useAppStore } from '@/store/useAppStore';
import { byDue, formatDays, formatTimeRange } from '@/utils/schedule';

export default function ClassDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow();
  const cls = useAppStore((s) => s.classes.find((c) => c.id === id));
  const events = useAppStore((s) => s.events);
  const deleteClass = useAppStore((s) => s.deleteClass);

  const related = useMemo(
    () => events.filter((e) => e.subjectId === id).sort((a, b) => Number(a.completed) - Number(b.completed) || byDue(a, b)),
    [events, id],
  );

  if (!cls) return <EmptyState icon="book-remove-outline" title="This class no longer exists." />;

  const confirmDelete = () =>
    Alert.alert('Delete class?', `${cls.subjectName} will be removed from your schedule. Its tasks will be kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteClass(cls.id);
        },
      },
    ]);

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Stack.Screen
        options={{
          title: cls.subjectCode ?? 'Class',
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <IconButton icon="pencil-outline" onPress={() => router.push({ pathname: '/class/edit', params: { id: cls.id } })} accessibilityLabel="Edit" />
              <IconButton icon="trash-can-outline" onPress={confirmDelete} accessibilityLabel="Delete" />
            </View>
          ),
        }}
      />

      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <View style={{ width: 6, height: 44, borderRadius: 3, backgroundColor: cls.color }} />
        <Text variant="headlineSmall" style={{ fontWeight: '700', flex: 1 }}>
          {cls.subjectName}
        </Text>
      </View>

      {cls.sessions.map((s, i) => (
        <Card key={i} style={{ marginBottom: 12 }}>
          {cls.sessions.length > 1 && (
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
              {`Schedule ${i + 1}`}
            </Text>
          )}
          <InfoLine icon="calendar-week">{formatDays(s.days, true)}</InfoLine>
          <InfoLine icon="clock-outline">{formatTimeRange(s.startTime, s.endTime)}</InfoLine>
          <InfoLine icon={CLASS_MODES[s.mode].icon}>{CLASS_MODES[s.mode].label}</InfoLine>
          {s.room && <InfoLine icon="map-marker-outline">{s.room}</InfoLine>}
        </Card>
      ))}

      <Card>
        {cls.teacher && <InfoLine icon="account-outline">{cls.teacher}</InfoLine>}
        {cls.building && <InfoLine icon="office-building-outline">{cls.building}</InfoLine>}
        <InfoLine icon="bell-outline">{cls.reminderEnabled ? `Reminder ${cls.reminderMinutes} min before` : 'Reminder off'}</InfoLine>
      </Card>

      {cls.notes && (
        <Card style={{ marginTop: 12 }}>
          <Text variant="bodyLarge">{cls.notes}</Text>
        </Card>
      )}

      <SectionTitle
        action={
          <Button compact icon="plus" onPress={() => router.push({ pathname: '/event/edit', params: { subjectId: cls.id } })}>
            Add
          </Button>
        }
      >
        Tasks & exams
      </SectionTitle>
      {related.length ? (
        <View style={{ gap: 8 }}>
          {related.map((e) => (
            <EventRow key={e.id} event={e} subject={cls.subjectName} now={now} />
          ))}
        </View>
      ) : (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Nothing linked to this class yet.
        </Text>
      )}
    </ScrollView>
  );
}
