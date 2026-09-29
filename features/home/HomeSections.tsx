import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, SectionTitle, TypeIcon } from '@/components/ui';
import { EventRow, dueText } from '@/components/rows';
import { EVENT_TYPES, type IconName } from '@/constants';
import type { AcademicEvent, ClassSchedule } from '@/types';
import {
  formatDateShort,
  formatDuration,
  formatTime,
  formatTimeRange,
  relativeDayLabel,
  toDateKey,
  type ClassOccurrence,
  type DashboardAlerts,
} from '@/utils/schedule';

type SubjectMap = Map<string, ClassSchedule>;

export function TodaySummary({ tasksDue, quizzes, exams, classes }: { tasksDue: number; quizzes: number; exams: number; classes: number }) {
  const tiles: { label: string; value: number; icon: keyof typeof EVENT_TYPES }[] = [
    { label: classes === 1 ? 'Class' : 'Classes', value: classes, icon: 'class' },
    { label: tasksDue === 1 ? 'Task due' : 'Tasks due', value: tasksDue, icon: 'assignment' },
    { label: quizzes === 1 ? 'Quiz' : 'Quizzes', value: quizzes, icon: 'quiz' },
    { label: exams === 1 ? 'Exam' : 'Exams', value: exams, icon: 'exam' },
  ];
  return (
    <Card style={styles.summary}>
      {tiles.map((t) => (
        <View key={t.label} style={styles.tile} accessible accessibilityLabel={`${t.value} ${t.label} today`}>
          <TypeIcon type={t.icon} size={30} />
          <Text variant="headlineSmall" style={styles.bold}>
            {t.value}
          </Text>
          <Text variant="labelSmall" numberOfLines={1}>
            {t.label}
          </Text>
        </View>
      ))}
    </Card>
  );
}

export function NextClassCard({ next, now }: { next: ClassOccurrence | null; now: Date }) {
  const theme = useTheme();
  if (!next) return null;
  const { cls, start, end, ongoing, date } = next;
  const today = toDateKey(now);
  const when = ongoing
    ? `In progress · ends in ${formatDuration(end.getTime() - now.getTime())}`
    : date === today
      ? `Starts in ${formatDuration(start.getTime() - now.getTime())}`
      : `${relativeDayLabel(date, today)} at ${formatTime(cls.startTime)}`;

  return (
    <>
      <SectionTitle>{ongoing ? 'Now' : 'Next class'}</SectionTitle>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <TouchableRipple onPress={() => router.push(`/class/${cls.id}`)} accessibilityRole="button">
          <View style={styles.nextClass}>
            <View style={[styles.bar, { backgroundColor: cls.color }]} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="titleLarge" style={styles.bold}>
                {cls.subjectName}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatTimeRange(cls.startTime, cls.endTime)}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {[cls.room, cls.building, cls.teacher].filter(Boolean).join(' · ')}
              </Text>
              <View style={[styles.pill, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.onPrimaryContainer} />
                <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                  {when}
                </Text>
              </View>
            </View>
          </View>
        </TouchableRipple>
      </Card>
    </>
  );
}

function AlertCard({ icon, title, color, children }: { icon: IconName; title: string; color: string; children: ReactNode }) {
  return (
    <Card style={[styles.alert, { borderLeftColor: color }]}>
      <View style={styles.alertTitle}>
        <MaterialCommunityIcons name={icon} size={16} color={color} />
        <Text variant="labelLarge" style={{ color, letterSpacing: 0.6 }}>
          {title}
        </Text>
      </View>
      {children}
    </Card>
  );
}

function AlertLine({ event, detail }: { event: AcademicEvent; detail: string }) {
  const theme = useTheme();
  return (
    <TouchableRipple onPress={() => router.push(`/event/${event.id}`)} accessibilityRole="button" style={{ paddingVertical: 6 }}>
      <View>
        <Text variant="titleSmall">{event.title}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {detail}
        </Text>
      </View>
    </TouchableRipple>
  );
}

/** Surfaces only what needs attention, most urgent first. */
export function SmartAlerts({ alerts, subjects, now, hasUpcoming }: { alerts: DashboardAlerts; subjects: SubjectMap; now: Date; hasUpcoming: boolean }) {
  const theme = useTheme();
  const { overdue, dueToday, upcomingExams } = alerts;
  const subjectOf = (e: AcademicEvent) => (e.subjectId ? subjects.get(e.subjectId)?.subjectName : undefined);

  if (!overdue.length && !dueToday.length && !upcomingExams.length) {
    if (hasUpcoming) return null;
    return (
      <Card style={{ alignItems: 'center', marginTop: 16, gap: 4 }}>
        <MaterialCommunityIcons name="check-circle-outline" size={32} color={theme.colors.primary} />
        <Text variant="titleMedium">{"You're all caught up"}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Nothing due. Enjoy the breather.
        </Text>
      </Card>
    );
  }

  return (
    <View style={{ gap: 12, marginTop: 16 }}>
      {overdue.length > 0 && (
        <AlertCard icon="alert-circle-outline" title="OVERDUE" color={theme.colors.error}>
          {overdue.slice(0, 3).map((e) => (
            <AlertLine key={e.id} event={e} detail={[subjectOf(e), dueText(e, now)].filter(Boolean).join(' · ')} />
          ))}
          {overdue.length > 3 && (
            <Text variant="labelMedium" onPress={() => router.push({ pathname: '/tasks', params: { filter: 'overdue' } })} style={{ color: theme.colors.primary }}>
              +{overdue.length - 3} more
            </Text>
          )}
        </AlertCard>
      )}
      {dueToday.length > 0 && (
        <AlertCard icon="clock-alert-outline" title="DUE TODAY" color="#EA580C">
          {dueToday.slice(0, 3).map((e) => (
            <AlertLine key={e.id} event={e} detail={[subjectOf(e), e.startTime ? `${EVENT_TYPES[e.type].label} at ${formatTime(e.startTime)}` : EVENT_TYPES[e.type].label].filter(Boolean).join(' · ')} />
          ))}
        </AlertCard>
      )}
      {upcomingExams.slice(0, 1).map(({ event, daysLeft }) => (
        <AlertCard key={event.id} icon="school-outline" title="UPCOMING EXAM" color={EVENT_TYPES.exam.color}>
          <AlertLine
            event={event}
            detail={`${subjectOf(event) ?? event.title} · ${formatDateShort(event.date)} · ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`}
          />
        </AlertCard>
      ))}
    </View>
  );
}

export function UpcomingList({ events, subjects, now }: { events: AcademicEvent[]; subjects: SubjectMap; now: Date }) {
  const theme = useTheme();
  if (!events.length) return null;
  const today = toDateKey(now);
  let lastDay = '';
  return (
    <>
      <SectionTitle>Upcoming</SectionTitle>
      <View style={{ gap: 8 }}>
        {events.map((e) => {
          const header = e.date !== lastDay ? relativeDayLabel(e.date, today) : null;
          lastDay = e.date;
          return (
            <View key={e.id} style={{ gap: 6 }}>
              {header && (
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {header}
                </Text>
              )}
              <EventRow event={e} subject={e.subjectId ? subjects.get(e.subjectId)?.subjectName : undefined} now={now} />
            </View>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 8 },
  tile: { flex: 1, alignItems: 'center', gap: 2 },
  nextClass: { flexDirection: 'row', gap: 14, padding: 16 },
  bar: { width: 5, borderRadius: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 6 },
  alert: { borderLeftWidth: 4, gap: 2 },
  alertTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
});
