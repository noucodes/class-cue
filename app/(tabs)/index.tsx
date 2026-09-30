import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { QuickAddFab } from '@/components/QuickAddFab';
import { EmptyState, SectionTitle, styles } from '@/components/ui';
import { DueSoon, TodayClasses } from '@/features/home/HomeSections';
import { useNow } from '@/hooks/useNow';
import { useAppStore, useClassMap } from '@/store/useAppStore';
import { addDays, byDue, formatDateLong, greeting, nextClass, slotsOnDay, toDateKey } from '@/utils/schedule';

/** How many tasks the dashboard shows; the Tasks tab has the rest. */
const DUE_SOON_LIMIT = 5;

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
    const weekEnd = addDays(today, 6);
    return {
      todayClasses: slotsOnDay(classes, now.getDay()),
      next: nextClass(classes, now),
      // Overdue items sort first because they're due earliest.
      dueSoon: events
        .filter((e) => !e.completed && e.date <= weekEnd)
        .sort(byDue)
        .slice(0, DUE_SOON_LIMIT),
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

        {classes.length ? (
          <>
            <SectionTitle>Today</SectionTitle>
            <TodayClasses slots={data.todayClasses} next={data.next} now={now} />
          </>
        ) : (
          <EmptyState
            icon="book-plus-outline"
            title="No classes added yet."
            message="Add your classes or import them from your registration PDF."
            actionLabel="Add Class"
            onAction={() => router.push('/class/edit')}
          />
        )}

        <DueSoon events={data.dueSoon} subjects={subjects} now={now} />
      </ScrollView>
      <QuickAddFab />
    </View>
  );
}
