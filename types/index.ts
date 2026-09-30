export type EventType = 'assignment' | 'quiz' | 'exam' | 'report' | 'pit' | 'project' | 'class' | 'other';

/** Event types stored as AcademicEvent. Classes live in ClassSchedule. */
export type TaskType = Exclude<EventType, 'class'>;

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * Dates are local calendar days ("YYYY-MM-DD") and times are local wall-clock ("HH:mm").
 * A 10:00 class stays at 10:00 wherever the phone is, which is what a timetable means.
 */
export interface AcademicEvent {
  id: string;
  title: string;
  /** References ClassSchedule.id */
  subjectId?: string;
  type: TaskType;
  description?: string;
  date: string;
  /** Due time for tasks, start time for quizzes/exams/other */
  startTime?: string;
  endTime?: string;
  location?: string;
  priority?: Priority;
  completed: boolean;
  reminderEnabled: boolean;
  reminderMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export type ClassMode = 'f2f' | 'online';

/** One meeting pattern of a class, e.g. "Tue/Thu 1:00–2:30 PM, room 09-303, face-to-face". */
export interface ClassSession {
  /** 0 = Sunday … 6 = Saturday (Date#getDay) */
  days: number[];
  startTime: string;
  endTime: string;
  room?: string;
  mode: ClassMode;
}

export interface ClassSchedule {
  id: string;
  subjectName: string;
  subjectCode?: string;
  teacher?: string;
  building?: string;
  /** At least one. A class can meet at different times/rooms on different days. */
  sessions: ClassSession[];
  color: string;
  notes?: string;
  reminderEnabled: boolean;
  reminderMinutes?: number;
}

export interface Settings {
  userName: string;
  theme: ThemePreference;
  notificationsEnabled: boolean;
  defaultReminderMinutes: number;
}

/** One entry on a given day: either a class occurrence or an academic event. */
export type AgendaItem =
  | { kind: 'class'; key: string; date: string; time: string; cls: ClassSchedule; session: ClassSession }
  | { kind: 'event'; key: string; date: string; time?: string; event: AcademicEvent };

export type TaskFilter = 'today' | 'tomorrow' | 'week' | 'upcoming' | 'overdue' | 'completed';
