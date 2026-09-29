// Pure scheduling/date logic. No runtime imports so `npm run check` can run it under plain Node.
import type {
  AcademicEvent,
  AgendaItem,
  ClassSchedule,
  EventType,
  Priority,
  TaskFilter,
  TaskType,
} from '../types';

const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const pad = (n: number) => String(n).padStart(2, '0');

// ---------- primitives (local time only; never `new Date('YYYY-MM-DD')`, which is UTC) ----------

export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeKey = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function atTime(key: string, time: string): Date {
  const d = parseDateKey(key);
  const [h, min] = time.split(':').map(Number);
  d.setHours(h, min, 0, 0);
  return d;
}

export const minutesOf = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export function addDays(key: string, n: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

/** Calendar-day difference b - a, DST-safe. */
export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / DAY_MS);
}

export const weekdayOf = (key: string) => parseDateKey(key).getDay();

/** Monday of the week containing `key`. */
export const startOfWeek = (key: string) => addDays(key, -((weekdayOf(key) + 6) % 7));

// ---------- formatting ----------

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}

export const formatTimeRange = (start: string, end?: string) =>
  end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);

export function formatDateLong(key: string): string {
  const d = parseDateKey(key);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatDateShort(key: string): string {
  const d = parseDateKey(key);
  return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export const weekdayName = (day: number) => WEEKDAYS[day];
export const weekdayShort = (day: number) => WEEKDAYS[day].slice(0, 3);

/** "Today", "Tomorrow", "Yesterday", "Friday" (within a week) or "Oct 12". */
export function relativeDayLabel(key: string, today: string): string {
  const diff = daysBetween(today, key);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return WEEKDAYS[weekdayOf(key)];
  return formatDateShort(key);
}

/** "32 minutes", "2 h 5 min", "3 days". */
export function formatDuration(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  if (mins < 24 * 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} h ${m} min` : `${h} hour${h === 1 ? '' : 's'}`;
  }
  const d = Math.round(mins / (24 * 60));
  return `${d} day${d === 1 ? '' : 's'}`;
}

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

// ---------- events ----------

/** Untimed events are due at the end of their day. */
export const dueAt = (e: AcademicEvent) => atTime(e.date, e.startTime ?? '23:59');

export const isOverdue = (e: AcademicEvent, now: Date) => !e.completed && dueAt(e) < now;

const PRIORITY_RANK: Record<Priority, number> = { urgent: 3, high: 2, medium: 1, low: 0 };

export const byDue = (a: AcademicEvent, b: AcademicEvent) => dueAt(a).getTime() - dueAt(b).getTime();

export function sortTasks(events: AcademicEvent[], by: 'due' | 'priority'): AcademicEvent[] {
  const sorted = [...events];
  if (by === 'due') return sorted.sort(byDue);
  return sorted.sort(
    (a, b) => PRIORITY_RANK[b.priority ?? 'low'] - PRIORITY_RANK[a.priority ?? 'low'] || byDue(a, b),
  );
}

export function filterTasks(events: AcademicEvent[], filter: TaskFilter, now: Date): AcademicEvent[] {
  const today = toDateKey(now);
  const open = events.filter((e) => !e.completed);
  switch (filter) {
    case 'completed':
      return events.filter((e) => e.completed);
    case 'overdue':
      return open.filter((e) => isOverdue(e, now));
    case 'today':
      return open.filter((e) => e.date === today);
    case 'tomorrow':
      return open.filter((e) => e.date === addDays(today, 1));
    case 'week': {
      const end = addDays(today, 6);
      return open.filter((e) => e.date >= today && e.date <= end && !isOverdue(e, now));
    }
    case 'upcoming':
      return open.filter((e) => !isOverdue(e, now));
  }
}

export function upcomingEvents(events: AcademicEvent[], now: Date, limit: number): AcademicEvent[] {
  return events
    .filter((e) => !e.completed && !isOverdue(e, now))
    .sort(byDue)
    .slice(0, limit);
}

export interface DashboardAlerts {
  overdue: AcademicEvent[];
  dueToday: AcademicEvent[];
  upcomingExams: { event: AcademicEvent; daysLeft: number }[];
}

export function dashboardAlerts(events: AcademicEvent[], now: Date): DashboardAlerts {
  const today = toDateKey(now);
  const open = events.filter((e) => !e.completed);
  return {
    overdue: open.filter((e) => isOverdue(e, now)).sort(byDue),
    dueToday: open.filter((e) => e.date === today && !isOverdue(e, now)).sort(byDue),
    upcomingExams: open
      .filter((e) => e.type === 'exam')
      .map((event) => ({ event, daysLeft: daysBetween(today, event.date) }))
      .filter((x) => x.daysLeft > 0 && x.daysLeft <= 14)
      .sort((a, b) => a.daysLeft - b.daysLeft),
  };
}

// ---------- classes ----------

export const classOccursOn = (cls: ClassSchedule, key: string) => cls.days.includes(weekdayOf(key));

export function agendaForDate(key: string, events: AcademicEvent[], classes: ClassSchedule[]): AgendaItem[] {
  const items: AgendaItem[] = [
    ...classes
      .filter((c) => classOccursOn(c, key))
      .map((cls): AgendaItem => ({ kind: 'class', key: `${cls.id}@${key}`, date: key, time: cls.startTime, cls })),
    ...events
      .filter((e) => e.date === key)
      .map((event): AgendaItem => ({ kind: 'event', key: event.id, date: key, time: event.startTime, event })),
  ];
  // Untimed items sink to the bottom of the day.
  return items.sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'));
}

export function classesOnDay(classes: ClassSchedule[], day: number): ClassSchedule[] {
  return classes.filter((c) => c.days.includes(day)).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export interface ClassOccurrence {
  cls: ClassSchedule;
  date: string;
  start: Date;
  end: Date;
  ongoing: boolean;
}

/** The class in progress, or the next one to start within the coming week. */
export function nextClass(classes: ClassSchedule[], now: Date): ClassOccurrence | null {
  const today = toDateKey(now);
  for (let i = 0; i < 8; i++) {
    const date = addDays(today, i);
    const hit = classesOnDay(classes, weekdayOf(date))
      .map((cls) => ({ cls, date, start: atTime(date, cls.startTime), end: atTime(date, cls.endTime) }))
      .find((o) => o.end > now);
    if (hit) return { ...hit, ongoing: hit.start <= now };
  }
  return null;
}

// ---------- calendar ----------

/** Which event types appear on each day in [from, to], for calendar dots. */
export function typesByDate(
  events: AcademicEvent[],
  classes: ClassSchedule[],
  from: string,
  to: string,
): Record<string, EventType[]> {
  const out: Record<string, EventType[]> = {};
  const add = (key: string, t: EventType) => {
    const list = (out[key] ??= []);
    if (!list.includes(t)) list.push(t);
  };
  for (let key = from; key <= to; key = addDays(key, 1)) {
    if (classes.some((c) => classOccursOn(c, key))) add(key, 'class');
  }
  for (const e of events) if (e.date >= from && e.date <= to) add(e.date, e.type);
  return out;
}

// ---------- statistics ----------

export interface WeekStats {
  classes: number;
  completed: number;
  upcoming: number;
  overdue: number;
}

export function weekStats(events: AcademicEvent[], classes: ClassSchedule[], now: Date): WeekStats {
  const from = startOfWeek(toDateKey(now));
  const to = addDays(from, 6);
  const inWeek = events.filter((e) => e.date >= from && e.date <= to);
  return {
    classes: classes.reduce((n, c) => n + c.days.length, 0),
    completed: inWeek.filter((e) => e.completed).length,
    upcoming: inWeek.filter((e) => !e.completed && !isOverdue(e, now)).length,
    overdue: events.filter((e) => isOverdue(e, now)).length,
  };
}

export function completionByType(events: AcademicEvent[]): { type: TaskType; done: number; total: number }[] {
  const map = new Map<TaskType, { done: number; total: number }>();
  for (const e of events) {
    const s = map.get(e.type) ?? { done: 0, total: 0 };
    s.total++;
    if (e.completed) s.done++;
    map.set(e.type, s);
  }
  return [...map].map(([type, s]) => ({ type, ...s }));
}

// ---------- search ----------

export function searchAll(query: string, events: AcademicEvent[], classes: ClassSchedule[]) {
  const q = query.trim().toLowerCase();
  if (!q) return { classes: [], events: [] };
  const hit = (...fields: (string | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(q));
  const subjectName = new Map(classes.map((c) => [c.id, c.subjectName]));
  return {
    classes: classes.filter((c) => hit(c.subjectName, c.subjectCode, c.teacher, c.room, c.building)),
    events: events
      .filter((e) => hit(e.title, e.description, e.location, e.subjectId && subjectName.get(e.subjectId)))
      .sort(byDue),
  };
}

// ---------- reminders ----------

/** When an event's reminder should fire, or null if it has none. */
export function reminderDate(e: AcademicEvent): Date | null {
  if (!e.reminderEnabled || e.completed || e.reminderMinutes == null) return null;
  return new Date(dueAt(e).getTime() - e.reminderMinutes * 60_000);
}

/**
 * Weekly trigger for a class reminder on `day`. Subtracting minutes can cross into the previous day.
 * Returns expo-notifications' weekday (1 = Sunday … 7 = Saturday).
 */
export function classReminderSlot(startTime: string, day: number, minutesBefore: number) {
  const week = 7 * 24 * 60;
  const t = (((day * 24 * 60 + minutesOf(startTime) - minutesBefore) % week) + week) % week;
  return { weekday: Math.floor(t / (24 * 60)) + 1, hour: Math.floor((t % (24 * 60)) / 60), minute: t % 60 };
}
