import { useDeferredValue, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Searchbar, Text, useTheme } from 'react-native-paper';
import { ClassRow, EventRow } from '@/components/rows';
import { EmptyState, SectionTitle } from '@/components/ui';
import { useNow } from '@/hooks/useNow';
import { useAppStore, useClassMap } from '@/store/useAppStore';
import { searchAll } from '@/utils/schedule';

export default function SearchScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const now = useNow();
  const events = useAppStore((s) => s.events);
  const classes = useAppStore((s) => s.classes);
  const subjects = useClassMap();

  const results = useMemo(() => searchAll(deferred, events, classes), [deferred, events, classes]);
  const empty = !results.classes.length && !results.events.length;

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Searchbar placeholder="Search classes, tasks, exams…" value={query} onChangeText={setQuery} autoFocus />

      {!query.trim() ? (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 24, textAlign: 'center' }}>
          Search by subject, title, teacher, room or notes.
        </Text>
      ) : empty ? (
        <EmptyState icon="magnify-close" title={`No results for "${query.trim()}"`} />
      ) : (
        <>
          {results.classes.length > 0 && (
            <>
              <SectionTitle>{`Classes (${results.classes.length})`}</SectionTitle>
              <View style={{ gap: 8 }}>
                {results.classes.map((c) => (
                  <ClassRow key={c.id} cls={c} />
                ))}
              </View>
            </>
          )}
          {results.events.length > 0 && (
            <>
              <SectionTitle>{`Tasks & events (${results.events.length})`}</SectionTitle>
              <View style={{ gap: 8 }}>
                {results.events.map((e) => (
                  <EventRow key={e.id} event={e} subject={e.subjectId ? subjects.get(e.subjectId)?.subjectName : undefined} now={now} />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}
