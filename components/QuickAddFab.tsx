import { useState } from 'react';
import { FAB, useTheme } from 'react-native-paper';
import { router, useIsFocused } from 'expo-router';
import { EVENT_TYPES } from '@/constants';
import type { EventType } from '@/types';

const QUICK_TYPES: EventType[] = ['class', 'project', 'pit', 'exam', 'quiz', 'assignment'];

// Rendered as the last child of a screen so it overlays content but sits above the tab bar.
/** The primary "+" entry point: two taps to any new item. `date` pre-fills the form (e.g. from the calendar). */
export function QuickAddFab({ date }: { date?: string }) {
  const [open, setOpen] = useState(false);
  const focused = useIsFocused();
  const theme = useTheme();

  const add = (type: EventType) => {
    if (type === 'class') router.push('/class/edit');
    else router.push({ pathname: '/event/edit', params: date ? { type, date } : { type } });
  };

  return (
    <FAB.Group
      open={open}
      visible={focused}
      icon={open ? 'close' : 'plus'}
      label={open ? 'What do you want to add?' : undefined}
      accessibilityLabel="Quick add"
      onStateChange={({ open: o }) => setOpen(o)}
      fabStyle={{ backgroundColor: theme.colors.primary }}
      color={theme.colors.onPrimary}
      actions={QUICK_TYPES.map((type) => ({
        icon: EVENT_TYPES[type].icon,
        label: EVENT_TYPES[type].label,
        color: EVENT_TYPES[type].color,
        onPress: () => add(type),
      }))}
    />
  );
}
