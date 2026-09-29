import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { QuickAddFab } from '@/components/QuickAddFab';
import { ClassRow } from '@/components/rows';
import { EmptyState, SectionTitle, styles } from '@/components/ui';
import { NextClassCard, SmartAlerts, TodaySummary, UpcomingList } from '@/features/home/HomeSections';
import { useNow } from '@/hooks/useNow';
import { useAppStore, useClassMap } from '@/store/useAppStore';
import {
  classesOnDay,
  dashboardAlerts,
  formatDateLong,
  greeting,
  nextClass,
  toDateKey,
  upcomingEvents,
} from '@/utils/schedule';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const events = useAppStore((s) => s.events);
  const classes = useAppStore((s) => s.classes);
  const userName = useAppStore((s) => s.settings.userName);
  const subjects = useClassMap();

  const today = toDateKey(now);
  const data = useMemo(() => {
    const todays = events.filter((e) => e.date === today && !e.completed);
    return {
      alerts: dashboardAlerts(events, now),
      upcoming: upcomingEvents(events, now, 6),
      next: nextClass(classes, now),
      todayClasses: classesOnDay(classes, now.getDay()),
      counts: {
        tasksDue: todays.filter((e) => e.type !== 'quiz' && e.type !== 'exam').length,
        quizzes: todays.filter((e) => e.type === 'quiz').length,
        exams: todays.filter((e) => e.type === 'exam').length,
      },
    };
  }, [events, classes, now, today]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text variant="headlineSmall" style={{ fontWeight: '700' }}>
              {greeting(now)}
              {userName ? `, ${userName}` : ''}
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatDateLong(today)}
            </Text>
          </View>
          <IconButton icon="magnify" onPress={() => router.push('/search')} accessibilityLabel="Search" />
        </View>

        <TodaySummary {...data.counts} classes={data.todayClasses.length} />
        <SmartAlerts alerts={data.alerts} subjects={subjects} now={now} hasUpcoming={data.upcoming.length > 0} />
        <NextClassCard next={data.next} now={now} />
        <UpcomingList events={data.upcoming} subjects={subjects} now={now} />

        <SectionTitle>{"Today's schedule"}</SectionTitle>
        {data.todayClasses.length ? (
          <View style={{ gap: 8 }}>
            {data.todayClasses.map((c) => (
              <ClassRow key={c.id} cls={c} showDays={false} />
            ))}
          </View>
        ) : classes.length ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            No classes today.
          </Text>
        ) : (
          <EmptyState
            icon="book-plus-outline"
            title="No classes added yet."
            message="Add your first class to build your schedule."
            actionLabel="Add Class"
            onAction={() => router.push('/class/edit')}
          />
        )}
      </ScrollView>
      <QuickAddFab />
    </View>
  );
}
