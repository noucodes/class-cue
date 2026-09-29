import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ProgressBar, Text, useTheme } from 'react-native-paper';
import { Card, EmptyState, SectionTitle } from '@/components/ui';
import { EVENT_TYPES, TASK_TYPES } from '@/constants';
import { useNow } from '@/hooks/useNow';
import { useAppStore } from '@/store/useAppStore';
import { completionByType, weekStats } from '@/utils/schedule';

export default function StatsScreen() {
  const theme = useTheme();
  const now = useNow(60_000);
  const events = useAppStore((s) => s.events);
  const classes = useAppStore((s) => s.classes);

  const week = useMemo(() => weekStats(events, classes, now), [events, classes, now]);
  const completion = useMemo(
    () => completionByType(events).sort((a, b) => TASK_TYPES.indexOf(a.type) - TASK_TYPES.indexOf(b.type)),
    [events],
  );

  const tiles = [
    { label: 'Classes', value: week.classes },
    { label: 'Completed tasks', value: week.completed },
    { label: 'Upcoming tasks', value: week.upcoming },
    { label: 'Overdue', value: week.overdue, alert: week.overdue > 0 },
  ];

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <SectionTitle>This week</SectionTitle>
      <View style={styles.grid}>
        {tiles.map((t) => (
          <Card key={t.label} style={styles.tile}>
            <Text variant="displaySmall" style={{ fontWeight: '700', color: t.alert ? theme.colors.error : theme.colors.onSurface }}>
              {t.value}
            </Text>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {t.label}
            </Text>
          </Card>
        ))}
      </View>

      <SectionTitle>Task completion</SectionTitle>
      {completion.length ? (
        <Card style={{ gap: 16 }}>
          {completion.map(({ type, done, total }) => (
            <View key={type} style={{ gap: 6 }}>
              <View style={styles.rowBetween}>
                <Text variant="titleSmall">{EVENT_TYPES[type].plural}</Text>
                <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  {Math.round((done / total) * 100)}% · {done}/{total}
                </Text>
              </View>
              <ProgressBar progress={done / total} color={EVENT_TYPES[type].color} style={{ height: 6, borderRadius: 3 }} />
            </View>
          ))}
        </Card>
      ) : (
        <EmptyState icon="chart-bar" title="No tasks yet" message="Stats appear once you add tasks." />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexBasis: '47%', flexGrow: 1, gap: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
});
