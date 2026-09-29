import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsModule from 'expo-notifications';
import { EVENT_TYPES } from '@/constants';
import type { AppData } from '@/store/useAppStore';
import type { AcademicEvent, ClassSchedule } from '@/types';
import {
  classReminderSlot,
  formatDuration,
  formatTime,
  reminderDate,
  relativeDayLabel,
  toDateKey,
} from '@/utils/schedule';

// iOS keeps at most 64 pending local notifications; leave headroom for class reminders.
const MAX_EVENT_REMINDERS = 40;

const inExpoGoAndroid =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// ponytail: reminders are off in Expo Go on Android; use a development build (`npx expo run:android`) to test them.
export const notificationsSupported = Platform.OS !== 'web' && !inExpoGoAndroid;

// Expo Go on Android (SDK 53+) throws as soon as expo-notifications is imported, so only load it where it works.
const Notifications: typeof NotificationsModule | undefined = notificationsSupported
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-notifications')
  : undefined;

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Notifications) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function eventContent(e: AcademicEvent, fireAt: Date, subject?: string): NotificationsModule.NotificationContentInput {
  const { label } = EVENT_TYPES[e.type];
  const when = e.startTime ? formatTime(e.startTime) : 'today';
  const data = { eventId: e.id };
  if (e.type === 'quiz' || e.type === 'exam') {
    const day = relativeDayLabel(e.date, toDateKey(fireAt)).toLowerCase();
    return { title: `${label} ${day}`, body: [subject ?? e.title, when, e.location].filter(Boolean).join(' · '), data };
  }
  if (e.type === 'other') {
    return { title: e.title, body: `Starts in ${formatDuration(e.reminderMinutes! * 60_000)} · ${when}`, data };
  }
  return {
    title: `${label} due soon`,
    body: `${e.title}${subject ? ` (${subject})` : ''} is due in ${formatDuration(e.reminderMinutes! * 60_000)}.`,
    data,
  };
}

function classContent(c: ClassSchedule, minutes: number): NotificationsModule.NotificationContentInput {
  return {
    title: 'Class starting soon',
    body: `${c.subjectName} starts in ${formatDuration(minutes * 60_000)}.${c.room ? `\n${c.room}` : ''}`,
    data: { classId: c.id },
  };
}

/**
 * Rebuilds every scheduled reminder from current data. Cheap enough to run on each change,
 * and it means cancelled/edited/completed items can never leave a stale notification behind.
 */
export async function syncNotifications({ events, classes, settings }: AppData): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.notificationsEnabled || !(await Notifications.getPermissionsAsync()).granted) return;

  const now = Date.now();
  const subjects = new Map(classes.map((c) => [c.id, c.subjectName]));
  const due = events
    .map((e) => ({ e, at: reminderDate(e) }))
    .filter((x): x is { e: AcademicEvent; at: Date } => x.at !== null && x.at.getTime() > now)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_EVENT_REMINDERS);

  const jobs = due.map(({ e, at }) =>
    Notifications.scheduleNotificationAsync({
      content: eventContent(e, at, e.subjectId ? subjects.get(e.subjectId) : undefined),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    }),
  );

  for (const c of classes) {
    if (!c.reminderEnabled || c.reminderMinutes == null) continue;
    for (const day of c.days) {
      jobs.push(
        Notifications.scheduleNotificationAsync({
          content: classContent(c, c.reminderMinutes),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            ...classReminderSlot(c.startTime, day, c.reminderMinutes),
          },
        }),
      );
    }
  }
  await Promise.all(jobs);
}
