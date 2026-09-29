import { Alert, ScrollView, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Card, EmptyState, InfoLine, PriorityTag, TypeIcon } from '@/components/ui';
import { dueText } from '@/components/rows';
import { EVENT_TYPES, REMINDER_OPTIONS } from '@/constants';
import { useNow } from '@/hooks/useNow';
import { useAppStore } from '@/store/useAppStore';
import { formatDateLong, formatDuration, formatTimeRange, isOverdue } from '@/utils/schedule';

export default function EventDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow();
  const event = useAppStore((s) => s.events.find((e) => e.id === id));
  const subject = useAppStore((s) => s.classes.find((c) => c.id === event?.subjectId));
  const toggleComplete = useAppStore((s) => s.toggleComplete);
  const deleteEvent = useAppStore((s) => s.deleteEvent);

  if (!event) {
    return <EmptyState icon="calendar-remove-outline" title="This item no longer exists." />;
  }

  const meta = EVENT_TYPES[event.type];
  const overdue = isOverdue(event, now);
  const reminderLabel = event.reminderEnabled && event.reminderMinutes
    ? `${REMINDER_OPTIONS.find((o) => o.minutes === event.reminderMinutes)?.label ?? formatDuration(event.reminderMinutes * 60_000)} before`
    : 'Off';

  const confirmDelete = () =>
    Alert.alert(`Delete ${meta.label.toLowerCase()}?`, `"${event.title}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteEvent(event.id);
        },
      },
    ]);

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Stack.Screen
        options={{
          title: meta.label,
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <IconButton icon="pencil-outline" onPress={() => router.push({ pathname: '/event/edit', params: { id: event.id } })} accessibilityLabel="Edit" />
              <IconButton icon="trash-can-outline" onPress={confirmDelete} accessibilityLabel="Delete" />
            </View>
          ),
        }}
      />

      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <TypeIcon type={event.type} size={52} />
        <View style={{ flex: 1 }}>
          <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
            {event.title}
          </Text>
          <Text variant="bodyMedium" style={{ color: overdue ? theme.colors.error : theme.colors.onSurfaceVariant }}>
            {event.completed ? 'Completed' : `${overdue ? 'Overdue · ' : ''}${dueText(event, now)}`}
          </Text>
        </View>
      </View>

      <Card>
        {subject && (
          <InfoLine icon="book-open-variant">
            <Text variant="bodyLarge" style={{ color: theme.colors.primary }} onPress={() => router.push(`/class/${subject.id}`)}>
              {subject.subjectName}
            </Text>
          </InfoLine>
        )}
        <InfoLine icon="calendar">{formatDateLong(event.date)}</InfoLine>
        {event.startTime && <InfoLine icon="clock-outline">{formatTimeRange(event.startTime, event.endTime)}</InfoLine>}
        {event.location && <InfoLine icon="map-marker-outline">{event.location}</InfoLine>}
        <InfoLine icon="bell-outline">{`Reminder: ${reminderLabel}`}</InfoLine>
        {event.priority && (
          <View style={{ paddingVertical: 6, paddingLeft: 28 }}>
            <PriorityTag priority={event.priority} />
          </View>
        )}
      </Card>

      {event.description && (
        <Card>
          <Text variant="bodyLarge">{event.description}</Text>
        </Card>
      )}

      <Button
        mode={event.completed ? 'outlined' : 'contained'}
        icon={event.completed ? 'restore' : 'check'}
        onPress={() => toggleComplete(event.id)}
        contentStyle={{ paddingVertical: 6 }}
      >
        {event.completed ? 'Mark as not complete' : 'Mark as complete'}
      </Button>
    </ScrollView>
  );
}
