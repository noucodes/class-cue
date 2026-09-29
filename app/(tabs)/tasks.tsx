import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Chip, SegmentedButtons, useTheme } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { QuickAddFab } from '@/components/QuickAddFab';
import { EventRow } from '@/components/rows';
import { EmptyState } from '@/components/ui';
import { EVENT_TYPES, TASK_FILTERS, TASK_TYPES } from '@/constants';
import { useNow } from '@/hooks/useNow';
import { useAppStore, useClassMap } from '@/store/useAppStore';
import type { TaskFilter, TaskType } from '@/types';
import { filterTasks, sortTasks } from '@/utils/schedule';

const EMPTY: Record<TaskFilter, string> = {
  upcoming: 'No upcoming tasks',
  today: 'Nothing due today',
  tomorrow: 'Nothing due tomorrow',
  week: 'Nothing due this week',
  overdue: 'Nothing overdue',
  completed: 'No completed tasks yet',
};

export default function TasksScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ filter?: TaskFilter }>();
  const [filter, setFilter] = useState<TaskFilter>(params.filter ?? 'upcoming');
  const [type, setType] = useState<TaskType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'due' | 'priority'>('due');
  const now = useNow();
  const events = useAppStore((s) => s.events);
  const subjects = useClassMap();

  // Deep links (e.g. "+3 more" on Home) can switch the filter while this tab stays mounted.
  const [lastParam, setLastParam] = useState(params.filter);
  if (params.filter !== lastParam) {
    setLastParam(params.filter);
    if (params.filter) setFilter(params.filter);
  }

  const list = useMemo(() => {
    const ofType = type === 'all' ? events : events.filter((e) => e.type === type);
    const sorted = sortTasks(filterTasks(ofType, filter, now), sortBy);
    return filter === 'completed' ? sorted.reverse() : sorted;
  }, [events, filter, type, sortBy, now]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {TASK_FILTERS.map((f) => (
                <Chip key={f.value} selected={filter === f.value} showSelectedCheck={false} mode={filter === f.value ? 'flat' : 'outlined'} onPress={() => setFilter(f.value)}>
                  {f.label}
                </Chip>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip compact selected={type === 'all'} showSelectedCheck={false} onPress={() => setType('all')}>
                All
              </Chip>
              {TASK_TYPES.map((t) => (
                <Chip key={t} compact icon={EVENT_TYPES[t].icon} selected={type === t} showSelectedCheck={false} onPress={() => setType(t)}>
                  {EVENT_TYPES[t].plural}
                </Chip>
              ))}
            </ScrollView>
            <SegmentedButtons
              density="small"
              value={sortBy}
              onValueChange={(v) => setSortBy(v as 'due' | 'priority')}
              buttons={[
                { value: 'due', label: 'By due date', icon: 'sort-calendar-ascending' },
                { value: 'priority', label: 'By priority', icon: 'sort-descending' },
              ]}
            />
          </View>
        }
        renderItem={({ item }) => (
          <EventRow event={item} subject={item.subjectId ? subjects.get(item.subjectId)?.subjectName : undefined} now={now} />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="check-all"
            title={EMPTY[filter]}
            message={filter === 'overdue' || filter === 'upcoming' ? "You're all caught up!" : undefined}
            actionLabel="Add Task"
            onAction={() => router.push({ pathname: '/event/edit', params: { type: type === 'all' ? 'assignment' : type } })}
          />
        }
      />
      <QuickAddFab />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 120 },
  chips: { gap: 8 },
});
