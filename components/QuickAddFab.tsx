import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FAB, useTheme } from 'react-native-paper';
import { router, useIsFocused } from 'expo-router';
import { EVENT_TYPES, type IconName } from '@/constants';

// Rendered as the last child of a screen so it overlays content but sits above the tab bar.
/**
 * The primary "+" entry point. Just two choices — a class, or anything else; the task form
 * picks the kind (assignment, quiz, exam, report…) so the menu doesn't grow with every type.
 * `date` pre-fills the form (e.g. from the calendar).
 *
 * Built from plain FABs rather than FAB.Group, which nests <button>s on web.
 */
export function QuickAddFab({ date }: { date?: string }) {
  const [open, setOpen] = useState(false);
  const focused = useIsFocused();
  const theme = useTheme();
  if (!focused) return null;

  const actions: { icon: IconName; label: string; color: string; onPress: () => void }[] = [
    { icon: EVENT_TYPES.class.icon, label: 'Class', color: EVENT_TYPES.class.color, onPress: () => router.push('/class/edit') },
    {
      icon: 'checkbox-marked-circle-plus-outline',
      label: 'Task, quiz, exam, report…',
      color: theme.colors.primary,
      onPress: () => router.push({ pathname: '/event/edit', params: date ? { date } : {} }),
    },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {open && (
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.backdrop }]}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close quick add"
        />
      )}
      <View style={styles.stack} pointerEvents="box-none">
        {open &&
          actions.map((a) => (
            <FAB
              key={a.label}
              icon={a.icon}
              label={a.label}
              size="small"
              color={a.color}
              style={{ backgroundColor: theme.colors.surface }}
              onPress={() => {
                setOpen(false);
                a.onPress();
              }}
            />
          ))}
        <FAB
          icon={open ? 'close' : 'plus'}
          accessibilityLabel="Quick add"
          color={theme.colors.onPrimary}
          style={{ backgroundColor: theme.colors.primary }}
          onPress={() => setOpen((o) => !o)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { position: 'absolute', right: 16, bottom: 16, alignItems: 'flex-end', gap: 12 },
});
