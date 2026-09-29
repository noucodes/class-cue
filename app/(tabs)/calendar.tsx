import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { Calendar, type DateData } from 'react-native-calendars';
import { QuickAddFab } from '@/components/QuickAddFab';
import { AgendaRow } from '@/components/rows';
import { EVENT_TYPES } from '@/constants';
import { useNow } from '@/hooks/useNow';
import { useAppStore, useClassMap } from '@/store/useAppStore';
import type { AcademicEvent, ClassSchedule } from '@/types';
import {
  addDays,
  agendaForDate,
  formatDateLong,
  formatDateShort,
  startOfWeek,
  toDateKey,
  typesByDate,
} from '@/utils/schedule';

type Mode = 'month' | 'week' | 'day';

function DayAgenda({ date, events, classes, now, compact }: { date: string; events: AcademicEvent[]; classes: ClassSchedule[]; now: Date; compact?: boolean }) {
  const theme = useTheme();
  const subjects = useClassMap();
  const items = agendaForDate(date, events, classes);
  if (!items.length) {
    return (
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, paddingVertical: compact ? 4 : 24, textAlign: compact ? 'left' : 'center' }}>
        {compact ? 'Free' : 'Nothing scheduled. Tap + to add something.'}
      </Text>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {items.map((item) => (
        <AgendaRow
          key={item.key}
          item={item}
          now={now}
          subject={item.kind === 'event' && item.event.subjectId ? subjects.get(item.event.subjectId)?.subjectName : undefined}
        />
      ))}
    </View>
  );
}

function MonthView({ selected, onSelect, events, classes }: { selected: string; onSelect: (d: string) => void; events: AcademicEvent[]; classes: ClassSchedule[] }) {
  const theme = useTheme();
  const [month, setMonth] = useState(selected.slice(0, 7));

  const marked = useMemo(() => {
    const from = addDays(`${month}-01`, -7);
    const to = addDays(`${month}-01`, 38);
    const byDate = typesByDate(events, classes, from, to);
    const out: Record<string, { dots: { key: string; color: string }[]; selected?: boolean; selectedColor?: string }> = {};
    for (const [date, types] of Object.entries(byDate)) {
      out[date] = { dots: types.slice(0, 4).map((t) => ({ key: t, color: EVENT_TYPES[t].color })) };
    }
    out[selected] = { ...(out[selected] ?? { dots: [] }), selected: true, selectedColor: theme.colors.primary };
    return out;
  }, [month, events, classes, selected, theme.colors.primary]);

  return (
    <Calendar
      // Calendar only reads `theme` on mount, so remount when light/dark flips.
      key={theme.dark ? 'dark' : 'light'}
      current={selected}
      markingType="multi-dot"
      markedDates={marked}
      firstDay={1}
      enableSwipeMonths
      onDayPress={(d: DateData) => onSelect(d.dateString)}
      onMonthChange={(d: DateData) => setMonth(d.dateString.slice(0, 7))}
      style={{ borderRadius: 16, overflow: 'hidden' }}
      theme={{
        calendarBackground: theme.colors.surface,
        dayTextColor: theme.colors.onSurface,
        monthTextColor: theme.colors.onSurface,
        textSectionTitleColor: theme.colors.onSurfaceVariant,
        textDisabledColor: theme.colors.outline,
        todayTextColor: theme.colors.primary,
        arrowColor: theme.colors.primary,
        selectedDayTextColor: theme.colors.onPrimary,
        textMonthFontWeight: '700',
      }}
    />
  );
}

export default function CalendarScreen() {
  const theme = useTheme();
  const now = useNow();
  const today = toDateKey(now);
  const [mode, setMode] = useState<Mode>('month');
  const [selected, setSelected] = useState(today);
  const events = useAppStore((s) => s.events);
  const classes = useAppStore((s) => s.classes);

  const step = (dir: 1 | -1) => setSelected((d) => addDays(d, dir * (mode === 'week' ? 7 : 1)));
  const weekStart = startOfWeek(selected);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.screen}>
        <SegmentedButtons
          value={mode}
          onValueChange={(v) => setMode(v as Mode)}
          buttons={[
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
            { value: 'day', label: 'Day' },
          ]}
        />

        {mode === 'month' ? (
          <View style={{ marginTop: 16 }}>
            <MonthView selected={selected} onSelect={setSelected} events={events} classes={classes} />
          </View>
        ) : (
          <View style={styles.nav}>
            <IconButton icon="chevron-left" onPress={() => step(-1)} accessibilityLabel="Previous" />
            <Text variant="titleMedium" style={{ flex: 1, textAlign: 'center' }} onPress={() => setSelected(today)}>
              {mode === 'week' ? `${formatDateShort(weekStart)} – ${formatDateShort(addDays(weekStart, 6))}` : formatDateLong(selected)}
            </Text>
            <IconButton icon="chevron-right" onPress={() => step(1)} accessibilityLabel="Next" />
          </View>
        )}

        {mode === 'week' ? (
          Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date) => (
            <View key={date} style={{ marginBottom: 16 }}>
              <Text
                variant="labelLarge"
                style={[styles.dayHeader, { color: date === today ? theme.colors.primary : theme.colors.onSurfaceVariant }]}
                onPress={() => {
                  setSelected(date);
                  setMode('day');
                }}
              >
                {formatDateLong(date).toUpperCase()}
              </Text>
              <DayAgenda date={date} events={events} classes={classes} now={now} compact />
            </View>
          ))
        ) : (
          <>
            {mode === 'month' && (
              <Text variant="titleMedium" style={styles.dayTitle}>
                {selected === today ? 'Today · ' : ''}
                {formatDateLong(selected)}
              </Text>
            )}
            <DayAgenda date={selected} events={events} classes={classes} now={now} />
          </>
        )}
      </ScrollView>
      <QuickAddFab date={selected} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 120 },
  nav: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dayHeader: { letterSpacing: 0.6, marginBottom: 6 },
  dayTitle: { marginTop: 20, marginBottom: 10, fontWeight: '600' },
});
