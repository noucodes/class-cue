// Run with `npm run check` (Node strips the types natively).
import assert from 'node:assert/strict';
import type { AcademicEvent, ClassSchedule } from '../types';
import {
  addDays,
  agendaForDate,
  classReminderSlot,
  daysBetween,
  dashboardAlerts,
  filterTasks,
  formatTime,
  nextClass,
  nextMeeting,
  relativeDayLabel,
  reminderDate,
  searchAll,
  sortTasks,
} from './schedule.ts';

const now = new Date(2026, 8, 29, 9, 28); // Tue Sep 29 2026, 9:28 local
const ev = (p: Partial<AcademicEvent>): AcademicEvent => ({
  id: p.title ?? 'x', title: 'x', type: 'assignment', date: '2026-09-29', completed: false,
  reminderEnabled: false, createdAt: '', updatedAt: '', ...p,
});
const cls = (p: Partial<ClassSchedule> & { days?: number[]; startTime?: string; endTime?: string }): ClassSchedule => {
  const { days = [2], startTime = '10:00', endTime = '11:30', ...rest } = p;
  return {
    id: p.subjectName ?? 'c', subjectName: 'c', sessions: [{ days, startTime, endTime, mode: 'f2f' }],
    color: '#000', reminderEnabled: false, ...rest,
  };
};

// dates
assert.equal(addDays('2026-12-31', 1), '2027-01-01');
assert.equal(daysBetween('2026-09-29', '2026-10-03'), 4);
assert.equal(relativeDayLabel('2026-09-30', '2026-09-29'), 'Tomorrow');
assert.equal(relativeDayLabel('2026-10-02', '2026-09-29'), 'Friday');
assert.equal(formatTime('00:05'), '12:05 AM');
assert.equal(formatTime('13:00'), '1:00 PM');

// task buckets
const events = [
  ev({ title: 'late', date: '2026-09-28', startTime: '17:00' }),
  ev({ title: 'today', startTime: '17:00', priority: 'low' }),
  ev({ title: 'untimed-today' }),
  ev({ title: 'tomorrow', date: '2026-09-30', priority: 'urgent' }),
  ev({ title: 'exam', type: 'exam', date: '2026-10-03' }),
  ev({ title: 'done', completed: true }),
];
const titles = (xs: AcademicEvent[]) => xs.map((e) => e.title);
assert.deepEqual(titles(filterTasks(events, 'overdue', now)), ['late']);
assert.deepEqual(titles(filterTasks(events, 'today', now)), ['today', 'untimed-today']);
assert.deepEqual(titles(filterTasks(events, 'completed', now)), ['done']);
assert.equal(sortTasks(filterTasks(events, 'upcoming', now), 'priority')[0].title, 'tomorrow');
const alerts = dashboardAlerts(events, now);
assert.deepEqual(titles(alerts.overdue), ['late']);
assert.equal(alerts.upcomingExams[0].daysLeft, 4);

// classes
const web = cls({ subjectName: 'Web', days: [2, 4] });
const math = cls({ subjectName: 'Math', startTime: '08:00', endTime: '09:30' }); // in progress
assert.equal(nextClass([web, math], now)?.cls.subjectName, 'Math');
assert.equal(nextClass([web, math], now)?.ongoing, true);
assert.equal(nextClass([web], new Date(2026, 8, 29, 12))?.date, '2026-10-01'); // Thursday
assert.deepEqual(agendaForDate('2026-09-29', events, [web]).map((i) => i.key)[0], 'Web@2026-09-29@10:00');

// multiple schedules on one class
const lab = cls({ subjectName: 'Lab' });
lab.sessions.push({ days: [4], startTime: '13:00', endTime: '16:00', mode: 'online' });
assert.equal(agendaForDate('2026-10-01', [], [lab])[0].time, '13:00'); // Thursday uses the 2nd schedule
assert.equal(nextClass([lab], new Date(2026, 8, 29, 12))?.session.startTime, '13:00');
assert.deepEqual(nextMeeting(lab, '2026-09-30', now), { date: '2026-10-01', time: '13:00' }); // task default
assert.deepEqual(nextMeeting(lab, '2026-09-29', now), { date: '2026-09-29', time: '10:00' }); // today's class still ahead
assert.deepEqual(nextMeeting(lab, '2026-09-29', new Date(2026, 8, 29, 11)), { date: '2026-10-01', time: '13:00' }); // already started → next one

// reminders
assert.equal(reminderDate(ev({ startTime: '17:00', reminderEnabled: true, reminderMinutes: 60 }))?.getHours(), 16);
assert.deepEqual(classReminderSlot('00:10', 0, 15), { weekday: 7, hour: 23, minute: 55 }); // Sun 00:10 → Sat 23:55

// search
assert.equal(searchAll('web', events, [web]).classes.length, 1);
assert.equal(searchAll('  ', events, [web]).events.length, 0);

console.log('schedule checks passed');
