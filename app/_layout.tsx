import { useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { darkTheme, lightTheme, navigationTheme } from '@/constants/theme';
import { useNotificationSync } from '@/hooks/useNotificationSync';
import { useAppStore } from '@/store/useAppStore';

function useHydrated() {
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated());
  useEffect(() => useAppStore.persist.onFinishHydration(() => setHydrated(true)), []);
  return hydrated;
}

function NotificationSync() {
  useNotificationSync();
  return null;
}

export default function RootLayout() {
  const hydrated = useHydrated();
  const pref = useAppStore((s) => s.settings.theme);
  const system = useColorScheme();
  const dark = pref === 'system' ? system === 'dark' : pref === 'dark';
  const theme = dark ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <ThemeProvider value={navigationTheme(theme)}>
        <StatusBar style={dark ? 'light' : 'dark'} />
        {hydrated ? (
          <>
            <NotificationSync />
            <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="event/[id]" options={{ title: '' }} />
              <Stack.Screen name="event/edit" options={{ presentation: 'modal', title: 'New' }} />
              <Stack.Screen name="class/[id]" options={{ title: '' }} />
              <Stack.Screen name="class/edit" options={{ presentation: 'modal', title: 'New Class' }} />
              <Stack.Screen name="class/import" options={{ presentation: 'modal', title: 'Import Schedule' }} />
              <Stack.Screen name="search" options={{ title: 'Search' }} />
              <Stack.Screen name="stats" options={{ title: 'Statistics' }} />
            </Stack>
          </>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.colors.background }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}
      </ThemeProvider>
    </PaperProvider>
  );
}
