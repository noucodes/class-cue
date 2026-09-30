import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { QuickAddFab } from '@/components/QuickAddFab';
import { ClassRow } from '@/components/rows';
import { EmptyState, SectionTitle, styles } from '@/components/ui';
import { WEEK_ORDER } from '@/constants';
import { useAppStore } from '@/store/useAppStore';
import { formatTime, slotsOnDay, weekdayName } from '@/utils/schedule';

export default function ClassesScreen() {
  const theme = useTheme();
  const [view, setView] = useState<'list' | 'week'>('list');
  const classes = useAppStore((s) => s.classes);

  const sorted = [...classes].sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  const today = new Date().getDay();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={styles.screen}>
        {classes.length === 0 ? (
          <>
            <EmptyState
              icon="book-plus-outline"
              title="No classes added yet."
              message="Add your first class to build your schedule, or import it from your registration PDF."
              actionLabel="Add Class"
              onAction={() => router.push('/class/edit')}
            />
            <Button icon="file-document-outline" onPress={() => router.push('/class/import')}>
              Import from PDF
            </Button>
          </>
        ) : (
          <>
            <Button icon="file-document-outline" mode="outlined" onPress={() => router.push('/class/import')} style={{ marginBottom: 12 }}>
              Import schedule from PDF
            </Button>
            <SegmentedButtons
              value={view}
              onValueChange={(v) => setView(v as 'list' | 'week')}
              buttons={[
                { value: 'list', label: 'Classes', icon: 'format-list-bulleted' },
                { value: 'week', label: 'Timetable', icon: 'timetable' },
              ]}
            />
            {view === 'list' ? (
              <View style={{ gap: 8, marginTop: 16 }}>
                {sorted.map((c) => (
                  <ClassRow key={c.id} cls={c} />
                ))}
              </View>
            ) : (
              WEEK_ORDER.map((day) => {
                const list = slotsOnDay(classes, day);
                if (!list.length) return null;
                return (
                  <View key={day}>
                    <SectionTitle>{`${weekdayName(day)}${day === today ? ' · Today' : ''}`}</SectionTitle>
                    <View style={{ gap: 8 }}>
                      {list.map(({ cls, session }) => (
                        <View key={`${cls.id}@${session.startTime}`} style={{ flexDirection: 'row', gap: 8 }}>
                          <Text variant="labelMedium" style={{ width: 64, paddingTop: 14, color: theme.colors.onSurfaceVariant }}>
                            {formatTime(session.startTime)}
                          </Text>
                          <View style={{ flex: 1 }}>
                            <ClassRow cls={cls} session={session} />
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
      <QuickAddFab />
    </View>
  );
}
