import { StyleSheet, View } from 'react-native';
import { Button, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, SectionTitle } from '@/components/ui';
import { EventRow } from '@/components/rows';
import { CLASS_MODES } from '@/constants';
import type { AcademicEvent, ClassSchedule } from '@/types';
import {
  atTime,
  formatDuration,
  formatTime,
  formatTimeRange,
  relativeDayLabel,
  sessionPlace,
  toDateKey,
  type ClassOccurrence,
  type ClassSlot,
} from '@/utils/schedule';

type SubjectMap = Map<string, ClassSchedule>;

function statusOf({ session }: ClassSlot, now: Date): { label: string; active: boolean; done: boolean } {
  const today = toDateKey(now);
  const start = atTime(today, session.startTime);
  const end = atTime(today, session.endTime);
  if (end <= now) return { label: 'Done', active: false, done: true };
  if (start <= now) return { label: `Now · ends in ${formatDuration(end.getTime() - now.getTime())}`, active: true, done: false };
  return { label: `In ${formatDuration(start.getTime() - now.getTime())}`, active: false, done: false };
}

/** Today's classes in one card. With no class today, a single line points to the next one. */
export function TodayClasses({ slots, next, now }: { slots: ClassSlot[]; next: ClassOccurrence | null; now: Date }) {
  const theme = useTheme();
  const muted = theme.colors.onSurfaceVariant;

  if (!slots.length) {
    return (
      <Card>
        <Text variant="titleMedium">No classes today</Text>
        {next && (
          <Text variant="bodyMedium" style={{ color: muted, marginTop: 2 }}>
            {`Next: ${next.cls.subjectName}, ${relativeDayLabel(next.date, toDateKey(now))} at ${formatTime(next.session.startTime)}`}
          </Text>
        )}
      </Card>
    );
  }

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      {slots.map((slot, i) => {
        const { cls, session } = slot;
        const status = statusOf(slot, now);
        return (
          <TouchableRipple
            key={`${cls.id}@${session.startTime}`}
            onPress={() => router.push(`/class/${cls.id}`)}
            accessibilityRole="button"
            style={[styles.classRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.outlineVariant }]}
          >
            <View style={[styles.classInner, status.done && { opacity: 0.5 }]}>
              <View style={[styles.bar, { backgroundColor: cls.color }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="titleMedium" style={{ fontWeight: '600' }} numberOfLines={1}>
                  {cls.subjectName}
                </Text>
                <View style={styles.line}>
                  <MaterialCommunityIcons name={CLASS_MODES[session.mode].icon} size={14} color={muted} />
                  <Text variant="bodyMedium" style={{ color: muted, flex: 1 }} numberOfLines={1}>
                    {[formatTimeRange(session.startTime, session.endTime), sessionPlace(session)].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>
              <Text
                variant="labelMedium"
                style={[
                  styles.status,
                  status.active
                    ? { backgroundColor: theme.colors.primaryContainer, color: theme.colors.onPrimaryContainer }
                    : { color: muted },
                ]}
              >
                {status.label}
              </Text>
            </View>
          </TouchableRipple>
        );
      })}
    </Card>
  );
}

/** Overdue and upcoming work in one short list; overdue rows are already marked red by EventRow. */
export function DueSoon({ events, subjects, now }: { events: AcademicEvent[]; subjects: SubjectMap; now: Date }) {
  const theme = useTheme();
  return (
    <>
      <SectionTitle
        action={
          <Button compact onPress={() => router.push('/tasks')}>
            See all
          </Button>
        }
      >
        Due soon
      </SectionTitle>
      {events.length ? (
        <View style={{ gap: 8 }}>
          {events.map((e) => (
            <EventRow key={e.id} event={e} subject={e.subjectId ? subjects.get(e.subjectId)?.subjectName : undefined} now={now} />
          ))}
        </View>
      ) : (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {"Nothing due this week. You're all caught up."}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  classRow: { paddingHorizontal: 16, paddingVertical: 14 },
  classInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
});
