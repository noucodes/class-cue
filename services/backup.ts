import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { TASK_TYPES } from '@/constants';
import { PICKER_COPIES } from '@/services/scheduleImport';
import { DEFAULT_SETTINGS, upgradeClass, type AppData } from '@/store/useAppStore';
import type { AcademicEvent, Settings } from '@/types';
import { DATE_RE, TIME_RE, toDateKey } from '@/utils/schedule';

interface Backup extends AppData {
  app: 'classcue';
  version: 1;
  exportedAt: string;
}

export async function exportData(data: AppData): Promise<void> {
  const backup: Backup = { app: 'classcue', version: 1, exportedAt: new Date().toISOString(), ...data };
  const file = new File(Paths.cache, `classcue-backup-${toDateKey(new Date())}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup, null, 2));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export ClassCue data' });
}

/** Opens a file picker and returns validated data, or null if the user cancelled. Throws on bad files. */
export async function pickBackup(): Promise<AppData | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: PICKER_COPIES });
  if (result.canceled) return null;
  const text = await new File(result.assets[0].uri).text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  return parseBackup(raw);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const optStr = (v: unknown) => v === undefined || typeof v === 'string';
const optTime = (v: unknown) => v === undefined || (typeof v === 'string' && TIME_RE.test(v));

function isEvent(v: unknown): v is AcademicEvent {
  return (
    isObj(v) &&
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    TASK_TYPES.includes(v.type as AcademicEvent['type']) &&
    typeof v.date === 'string' &&
    DATE_RE.test(v.date) &&
    optTime(v.startTime) &&
    optTime(v.endTime) &&
    typeof v.completed === 'boolean' &&
    typeof v.reminderEnabled === 'boolean' &&
    optStr(v.subjectId)
  );
}

function isSession(v: unknown): boolean {
  return (
    isObj(v) &&
    Array.isArray(v.days) &&
    v.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
    typeof v.startTime === 'string' &&
    TIME_RE.test(v.startTime) &&
    typeof v.endTime === 'string' &&
    TIME_RE.test(v.endTime) &&
    optStr(v.room)
  );
}

/** Accepts both current classes (with `sessions`) and older backups (one schedule on the class). */
function isClass(v: unknown): v is Parameters<typeof upgradeClass>[0] {
  return (
    isObj(v) &&
    typeof v.id === 'string' &&
    typeof v.subjectName === 'string' &&
    typeof v.color === 'string' &&
    (Array.isArray(v.sessions) ? v.sessions.length > 0 && v.sessions.every(isSession) : isSession(v))
  );
}

export function parseBackup(raw: unknown): AppData {
  if (!isObj(raw) || raw.app !== 'classcue') throw new Error('This is not a ClassCue backup file.');
  const { events, classes, settings } = raw;
  if (!Array.isArray(events) || !events.every(isEvent)) throw new Error('The backup contains invalid tasks.');
  if (!Array.isArray(classes) || !classes.every(isClass)) throw new Error('The backup contains invalid classes.');
  return {
    events,
    classes: classes.map((c) => {
      const cls = upgradeClass(c);
      return {
        ...cls,
        sessions: cls.sessions.map((x) => ({ ...x, mode: x.mode === 'online' ? 'online' : 'f2f' })),
        reminderEnabled: cls.reminderEnabled === true,
      };
    }),
    settings: parseSettings(settings),
  };
}

function parseSettings(v: unknown): Settings {
  const s = isObj(v) ? v : {};
  const d = DEFAULT_SETTINGS;
  return {
    userName: typeof s.userName === 'string' ? s.userName : d.userName,
    theme: s.theme === 'light' || s.theme === 'dark' || s.theme === 'system' ? s.theme : d.theme,
    notificationsEnabled: typeof s.notificationsEnabled === 'boolean' ? s.notificationsEnabled : d.notificationsEnabled,
    defaultReminderMinutes: typeof s.defaultReminderMinutes === 'number' ? s.defaultReminderMinutes : d.defaultReminderMinutes,
  };
}
