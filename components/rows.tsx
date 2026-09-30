import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox, Text, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CLASS_MODES, EVENT_TYPES } from '@/constants';
import { PriorityTag, TypeIcon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import type { AcademicEvent, AgendaItem, ClassSchedule, ClassSession } from '@/types';
import { formatDays, formatTime, formatTimeRange, isOverdue, relativeDayLabel, sessionPlace, toDateKey } from '@/utils/schedule';

const isTask = (e: AcademicEvent) => e.type !== 'quiz' && e.type !== 'exam' && e.type !== 'report';

export function dueText(e: AcademicEvent, now: Date): string {
  const day = relativeDayLabel(e.date, toDateKey(now));
  const time = e.startTime ? ` · ${formatTime(e.startTime)}` : '';
  return `${isTask(e) ? 'Due ' : ''}${day}${time}`;
}

export const EventRow = memo(function EventRow({
  event,
  subject,
  now,
}: {
  event: AcademicEvent;
  subject?: string;
  now: Date;
}) {
  const theme = useTheme();
  const toggleComplete = useAppStore((s) => s.toggleComplete);
  const overdue = isOverdue(event, now);
  const muted = theme.colors.onSurfaceVariant;

  // The checkbox sits beside the pressable, not inside it: nested buttons are invalid on web.
  return (
    <View style={[styles.eventRow, { backgroundColor: theme.colors.surface }]}>
    <Pressable
      onPress={() => router.push(`/event/${event.id}`)}
      style={({ pressed }) => [styles.eventMain, { opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`${EVENT_TYPES[event.type].label}: ${event.title}`}
    >
      <TypeIcon type={event.type} />
      <View style={styles.body}>
        <Text
          variant="titleSmall"
          numberOfLines={1}
          style={event.completed && { textDecorationLine: 'line-through', color: muted }}
        >
          {event.title}
        </Text>
        <Text variant="bodySmall" numberOfLines={1} style={{ color: muted }}>
          {EVENT_TYPES[event.type].label}
          {subject ? ` · ${subject}` : ''}
        </Text>
        <View style={styles.meta}>
          <Text variant="labelSmall" style={{ color: overdue ? theme.colors.error : muted }}>
            {overdue ? 'Overdue · ' : ''}
            {dueText(event, now)}
          </Text>
          {event.priority && !event.completed && <PriorityTag priority={event.priority} />}
        </View>
      </View>
    </Pressable>
      <Checkbox.Android
        status={event.completed ? 'checked' : 'unchecked'}
        onPress={() => toggleComplete(event.id)}
        accessibilityLabel={event.completed ? 'Mark as not complete' : 'Mark as complete'}
      />
    </View>
  );
});

/** With `session`, shows that one meeting (day views); without it, lists every schedule of the class. */
export const ClassRow = memo(function ClassRow({ cls, session }: { cls: ClassSchedule; session?: ClassSession }) {
  const theme = useTheme();
  const muted = theme.colors.onSurfaceVariant;
  const sessions = session ? [session] : cls.sessions;
  return (
    <Pressable
      onPress={() => router.push(`/class/${cls.id}`)}
      style={({ pressed }) => [styles.row, { backgroundColor: theme.colors.surface, opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={cls.subjectName}
    >
      <View style={[styles.colorBar, { backgroundColor: cls.color }]} />
      <View style={styles.body}>
        <Text variant="titleSmall" numberOfLines={1}>
          {cls.subjectName}
          {cls.subjectCode ? <Text style={{ color: muted }}>{`  ${cls.subjectCode}`}</Text> : null}
        </Text>
        {sessions.map((s, i) => (
          <View key={i} style={styles.session}>
            <MaterialCommunityIcons name={CLASS_MODES[s.mode].icon} size={14} color={muted} accessibilityLabel={CLASS_MODES[s.mode].label} />
            <Text variant="bodySmall" numberOfLines={1} style={{ color: muted, flex: 1 }}>
              {[session ? undefined : formatDays(s.days), formatTimeRange(s.startTime, s.endTime), sessionPlace(s)].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ))}
        {cls.teacher && (
          <Text variant="bodySmall" numberOfLines={1} style={{ color: muted }}>
            {cls.teacher}
          </Text>
        )}
      </View>
    </Pressable>
  );
});

/** A timed line in a day view: time gutter + class or event row. */
export function AgendaRow({ item, now, subject }: { item: AgendaItem; now: Date; subject?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.agenda}>
      <Text variant="labelMedium" style={[styles.time, { color: theme.colors.onSurfaceVariant }]}>
        {item.time ? formatTime(item.time) : 'All day'}
      </Text>
      <View style={{ flex: 1 }}>
        {item.kind === 'class' ? (
          <ClassRow cls={item.cls} session={item.session} />
        ) : (
          <EventRow event={item.event} subject={subject} now={now} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14 },
  eventRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingRight: 4 },
  eventMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  body: { flex: 1, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  session: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colorBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  agenda: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  time: { width: 64, paddingTop: 14 },
});
