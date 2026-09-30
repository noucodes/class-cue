import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ClassMode, EventType, Priority, TaskFilter, TaskType } from '@/types';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Color is reserved for event types and priority; everything else stays neutral. */
export const EVENT_TYPES: Record<EventType, { label: string; plural: string; icon: IconName; color: string }> = {
  assignment: { label: 'Assignment', plural: 'Assignments', icon: 'file-document-edit-outline', color: '#3B82F6' },
  quiz: { label: 'Quiz', plural: 'Quizzes', icon: 'help-circle-outline', color: '#F59E0B' },
  exam: { label: 'Exam', plural: 'Exams', icon: 'school-outline', color: '#EF4444' },
  report: { label: 'Report', plural: 'Reports', icon: 'presentation', color: '#EC4899' },
  pit: { label: 'PIT', plural: 'PITs', icon: 'puzzle-outline', color: '#8B5CF6' },
  project: { label: 'Project', plural: 'Projects', icon: 'folder-star-outline', color: '#10B981' },
  class: { label: 'Class', plural: 'Classes', icon: 'book-open-variant', color: '#64748B' },
  other: { label: 'Other', plural: 'Other', icon: 'calendar-blank-outline', color: '#94A3B8' },
};

export const TASK_TYPES: TaskType[] = ['assignment', 'quiz', 'exam', 'report', 'pit', 'project', 'other'];

/** Which form fields each event type shows. */
export const TYPE_FIELDS: Record<TaskType, { timeLabel: string; priority: boolean; location: boolean; endTime: boolean }> = {
  assignment: { timeLabel: 'Due time', priority: true, location: false, endTime: false },
  project: { timeLabel: 'Due time', priority: true, location: false, endTime: false },
  pit: { timeLabel: 'Due time', priority: true, location: true, endTime: false },
  quiz: { timeLabel: 'Time', priority: false, location: true, endTime: false },
  exam: { timeLabel: 'Time', priority: false, location: true, endTime: true },
  report: { timeLabel: 'Time', priority: true, location: false, endTime: false },
  other: { timeLabel: 'Start time', priority: true, location: true, endTime: true },
};

export const PRIORITIES: Record<Priority, { label: string; color: string; icon: IconName }> = {
  low: { label: 'Low', color: '#94A3B8', icon: 'chevron-down' },
  medium: { label: 'Medium', color: '#3B82F6', icon: 'equal' },
  high: { label: 'High', color: '#F59E0B', icon: 'chevron-up' },
  urgent: { label: 'Urgent', color: '#EF4444', icon: 'chevron-double-up' },
};

export const REMINDER_OPTIONS: { label: string; minutes: number }[] = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '1 day', minutes: 1440 },
];

export const TASK_FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'This Week' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
];

export const CLASS_MODES: Record<ClassMode, { label: string; icon: IconName }> = {
  f2f: { label: 'Face-to-face', icon: 'account-group-outline' },
  online: { label: 'Online', icon: 'laptop' },
};

export const CLASS_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#64748B'];

/** Mon → Sun display order. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const APP_VERSION = '1.0.0';
