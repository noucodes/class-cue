import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { ActivityIndicator, List, SegmentedButtons, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { ChipGroup } from '@/components/form';
import { Card, SectionTitle } from '@/components/ui';
import { APP_VERSION, REMINDER_OPTIONS } from '@/constants';
import { exportData, pickBackup } from '@/services/backup';
import { notificationsSupported, requestNotificationPermission } from '@/services/notifications';
import { useAppStore } from '@/store/useAppStore';
import type { ThemePreference } from '@/types';

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

export default function MoreScreen() {
  const theme = useTheme();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [name, setName] = useState(settings.userName);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const toggleNotifications = async (on: boolean) => {
    if (on && !(await requestNotificationPermission())) {
      Alert.alert('Notifications are blocked', 'Allow notifications for ClassCue in your device settings to get reminders.');
      return;
    }
    updateSettings({ notificationsEnabled: on });
  };

  const onExport = async () => {
    setBusy('export');
    try {
      const { events, classes, settings: s } = useAppStore.getState();
      await exportData({ events, classes, settings: s });
    } catch (e) {
      Alert.alert('Export failed', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const onImport = async () => {
    setBusy('import');
    try {
      const data = await pickBackup();
      if (!data) return;
      Alert.alert(
        'Replace your data?',
        `This backup has ${data.classes.length} classes and ${data.events.length} tasks. Everything currently in ClassCue will be replaced.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => {
              useAppStore.getState().replaceAll(data);
              setName(data.settings.userName);
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert('Import failed', errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmDeleteAll = () => {
    const { events, classes } = useAppStore.getState();
    Alert.alert(
      'Delete all data?',
      `This permanently removes ${classes.length} classes and ${events.length} tasks, along with their reminders. Your name and settings are kept.

Export your data first if you might want it back.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete all', style: 'destructive', onPress: () => useAppStore.getState().deleteAllData() },
      ],
    );
  };

  const spinner = (key: typeof busy) => (busy === key ? () => <ActivityIndicator style={{ marginRight: 8 }} /> : undefined);

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <SectionTitle>Profile</SectionTitle>
      <Card>
        <TextInput
          mode="outlined"
          label="Your name"
          value={name}
          onChangeText={setName}
          onBlur={() => updateSettings({ userName: name.trim() })}
          returnKeyType="done"
        />
      </Card>

      <SectionTitle>Insights</SectionTitle>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <List.Item title="Statistics" left={(p) => <List.Icon {...p} icon="chart-box-outline" />} right={(p) => <List.Icon {...p} icon="chevron-right" />} onPress={() => router.push('/stats')} />
        <List.Item title="Search" left={(p) => <List.Icon {...p} icon="magnify" />} right={(p) => <List.Icon {...p} icon="chevron-right" />} onPress={() => router.push('/search')} />
      </Card>

      <SectionTitle>Appearance</SectionTitle>
      <SegmentedButtons
        value={settings.theme}
        onValueChange={(v) => updateSettings({ theme: v as ThemePreference })}
        buttons={[
          { value: 'system', label: 'System', icon: 'theme-light-dark' },
          { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
          { value: 'dark', label: 'Dark', icon: 'weather-night' },
        ]}
      />

      <SectionTitle>Notifications</SectionTitle>
      <Card>
        {notificationsSupported ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLarge">Reminders</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Per-item reminders can be turned off when editing a task or class.
                </Text>
              </View>
              <Switch value={settings.notificationsEnabled} onValueChange={toggleNotifications} accessibilityLabel="Reminders" />
            </View>
            <ChipGroup<number>
              label="Default reminder for new tasks"
              options={REMINDER_OPTIONS.map((o) => ({ value: o.minutes, label: `${o.label} before` }))}
              isSelected={(m) => m === settings.defaultReminderMinutes}
              onToggle={(m) => updateSettings({ defaultReminderMinutes: m })}
            />
          </>
        ) : (
          <Text variant="bodyMedium">Reminders need the installed app — they are not available in a browser or in Expo Go on Android.</Text>
        )}
      </Card>

      <SectionTitle>Data</SectionTitle>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <List.Item
          title="Import class schedule"
          description="Read classes from your registration PDF"
          left={(p) => <List.Icon {...p} icon="file-document-outline" />}
          right={(p) => <List.Icon {...p} icon="chevron-right" />}
          onPress={() => router.push('/class/import')}
        />
        <List.Item
          title="Export data"
          description="Save a JSON backup of classes, tasks and settings"
          left={(p) => <List.Icon {...p} icon="export-variant" />}
          right={spinner('export')}
          onPress={busy ? undefined : onExport}
        />
        <List.Item
          title="Import data"
          description="Restore from a ClassCue backup"
          left={(p) => <List.Icon {...p} icon="import" />}
          right={spinner('import')}
          onPress={busy ? undefined : onImport}
        />
        <List.Item
          title="Delete all data"
          description="Remove every class and task"
          titleStyle={{ color: theme.colors.error }}
          left={(p) => <List.Icon {...p} icon="trash-can-outline" color={theme.colors.error} />}
          onPress={busy ? undefined : confirmDeleteAll}
        />
      </Card>

      <SectionTitle>About</SectionTitle>
      <Card>
        <Text variant="titleMedium">ClassCue</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Your academic command center — classes, deadlines and exams in one place. Everything is stored on this device.
        </Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
          Version {APP_VERSION}
        </Text>
      </Card>
    </ScrollView>
  );
}
