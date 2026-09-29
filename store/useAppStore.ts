import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { appStorage, STORAGE_KEY } from '@/services/storage';
import type { AcademicEvent, ClassSchedule, Settings } from '@/types';

export type EventInput = Omit<AcademicEvent, 'id' | 'createdAt' | 'updatedAt'>;
export type ClassInput = Omit<ClassSchedule, 'id'>;

export interface AppData {
  events: AcademicEvent[];
  classes: ClassSchedule[];
  settings: Settings;
}

interface AppState extends AppData {
  addEvent: (input: EventInput) => string;
  updateEvent: (id: string, patch: Partial<EventInput>) => void;
  deleteEvent: (id: string) => void;
  toggleComplete: (id: string) => void;
  addClass: (input: ClassInput) => string;
  updateClass: (id: string, patch: Partial<ClassInput>) => void;
  deleteClass: (id: string) => void;
  importClasses: (inputs: ClassInput[], replace: boolean) => void;
  /** Removes every class and task. Settings (name, theme, reminders) are kept. */
  deleteAllData: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceAll: (data: AppData) => void;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const DEFAULT_SETTINGS: Settings = {
  userName: 'Elton',
  theme: 'system',
  notificationsEnabled: true,
  defaultReminderMinutes: 60,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      events: [],
      classes: [],
      settings: DEFAULT_SETTINGS,

      addEvent: (input) => {
        const now = new Date().toISOString();
        const id = newId();
        set((s) => ({ events: [...s.events, { ...input, id, createdAt: now, updatedAt: now }] }));
        return id;
      },
      updateEvent: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e)),
        })),
      deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      toggleComplete: (id) =>
        set((s) => ({
          events: s.events.map((e) =>
            e.id === id ? { ...e, completed: !e.completed, updatedAt: new Date().toISOString() } : e,
          ),
        })),

      addClass: (input) => {
        const id = newId();
        set((s) => ({ classes: [...s.classes, { ...input, id }] }));
        return id;
      },
      updateClass: (id, patch) =>
        set((s) => ({ classes: s.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      // Tasks outlive their class; they just lose the subject link.
      deleteClass: (id) =>
        set((s) => ({
          classes: s.classes.filter((c) => c.id !== id),
          events: s.events.map((e) => (e.subjectId === id ? { ...e, subjectId: undefined } : e)),
        })),

      // Replacing unlinks tasks from the removed classes, same as deleteClass.
      importClasses: (inputs, replace) =>
        set((s) => {
          const added = inputs.map((input) => ({ ...input, id: newId() }));
          if (!replace) return { classes: [...s.classes, ...added] };
          const removed = new Set(s.classes.map((c) => c.id));
          return {
            classes: added,
            events: s.events.map((e) => (e.subjectId && removed.has(e.subjectId) ? { ...e, subjectId: undefined } : e)),
          };
        }),

      deleteAllData: () => set({ events: [], classes: [] }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      replaceAll: (data) => set({ events: data.events, classes: data.classes, settings: data.settings }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => appStorage),
      partialize: ({ events, classes, settings }) => ({ events, classes, settings }),
      merge: (persisted, current) => {
        const p = persisted as Partial<AppData> | undefined;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p?.settings } };
      },
    },
  ),
);

export const useClassMap = () => {
  const classes = useAppStore((s) => s.classes);
  return useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
};
