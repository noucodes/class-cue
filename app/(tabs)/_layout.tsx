import { Tabs, router } from 'expo-router';
import { IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { IconName } from '@/constants';

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'calendar', title: 'Calendar', icon: 'calendar-month-outline', iconActive: 'calendar-month' },
  { name: 'tasks', title: 'Tasks', icon: 'checkbox-marked-circle-outline', iconActive: 'checkbox-marked-circle' },
  { name: 'classes', title: 'Classes', icon: 'book-outline', iconActive: 'book' },
  { name: 'more', title: 'More', icon: 'dots-horizontal-circle-outline', iconActive: 'dots-horizontal-circle' },
];

export default function TabLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.colors.background },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant },
        headerRight: () => (
          <IconButton icon="magnify" onPress={() => router.push('/search')} accessibilityLabel="Search" />
        ),
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            headerShown: t.name !== 'index',
            tabBarIcon: ({ color, size, focused }) => (
              <MaterialCommunityIcons name={focused ? t.iconActive : t.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
