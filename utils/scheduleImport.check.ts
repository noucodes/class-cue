// Run with `npm run check`. Uses a synthetic PDF shaped like a USTP Certificate of Registration.
import assert from 'node:assert/strict';
import { zlibSync } from 'fflate';
import { extractTextItems, parseDays, parseSchedule, parseScheduleLine, type TextItem } from './scheduleImport.ts';

// parsing primitives
assert.deepEqual(parseDays('TTh'), [2, 4]);
assert.deepEqual(parseDays('MWF'), [1, 3, 5]);
assert.equal(parseDays('TBA'), null);
assert.deepEqual(parseScheduleLine('Th 6:00 PM - 9:00 PM/09-309(Cisco Lab 1)'), {
  days: [4], startTime: '18:00', endTime: '21:00', room: '09-309(Cisco Lab 1)',
});
assert.deepEqual(parseScheduleLine('F 12:30 PM - 2:00 PM'), { days: [5], startTime: '12:30', endTime: '14:00', room: undefined });
assert.equal(parseScheduleLine('S 12:00 AM - 1:00 AM')?.startTime, '00:00');

// Same coordinates/layout as the real form, invented names.
const row = (y: number, code: string, title: string, sched: string, fac: string, sy = y + 0.36): TextItem[] => [
  { x: 30, y, text: code }, { x: 80, y, text: title }, { x: 238.28, y, text: '3' },
  { x: 300, y: y + 3.68, text: 'CEA_CPE_4D_NIGHTCLASS' }, { x: 366, y: sy, text: sched }, { x: 481, y: sy + 1, text: fac },
];
const items: TextItem[] = [
  { x: 34, y: 594.73, text: 'CODE' }, { x: 117.53, y: 594.73, text: 'SUBJECT TITLE' }, { x: 365, y: 594.73, text: 'SCHEDULE/ROOM' },
  ...row(578.1, 'CPE321', 'Occupational Safety', 'M 6:00 PM - 9:00 PM/05-105', 'Ana Cruz'),
  ...row(568.1, 'CpE 313', 'Computer Networks', 'S 1:00 PM - 4:00 PM/09-303(ICT Lab3[45])', 'Ben Reyes', 569),
  { x: 366, y: 559, text: 'Th 6:00 PM - 9:00 PM/09-309(Cisco Lab 1)' }, { x: 481, y: 559.9, text: 'Ben Reyes' },
  ...row(548.1, 'CpE 312', 'Methods of Research', 'F 6:00 PM - 8:00 PM', 'Cy Lim'),
  ...row(538.1, 'EC 311', 'Elective Course 1 **', 'W 6:00 PM - 9:00 PM/43-402', 'Di Tan'),
  { x: 30, y: 528.1, text: 'PE 104' }, { x: 80, y: 528.1, text: 'Team Sports' }, { x: 366, y: 528.46, text: 'TBA' },
  { x: 169, y: 504.5, text: 'Total Unit(s)' },
  { x: 39, y: 476.46, text: 'Tuition Fee' }, { x: 366, y: 470, text: 'M 1:00 PM - 2:00 PM' }, // below table: ignored
];

const { classes, skipped } = parseSchedule(items);
assert.equal(classes.length, 5);
const net = classes.filter((c) => c.subjectCode === 'CpE 313');
assert.deepEqual(net.map((c) => c.days), [[6], [4]]); // continuation line joins the subject above
assert.equal(net[1].room, '09-309(Cisco Lab 1)');
assert.equal(net[1].teacher, 'Ben Reyes');
assert.equal(classes.find((c) => c.subjectCode === 'EC 311')?.subjectName, 'Elective Course 1');
assert.equal(classes.find((c) => c.subjectCode === 'CpE 312')?.room, undefined);
assert.deepEqual(skipped, ['Team Sports']);

// End-to-end through a minimal Flate-compressed PDF, including escaped parens.
const content = 'BT\n1 0 0 1 366 578.46 Tm\n/F3 7 Tf\n(Th 6:00 PM - 9:00 PM/09-309\\(Cisco Lab 1\\))Tj\nET\n';
const stream = zlibSync(new TextEncoder().encode(content));
const head = new TextEncoder().encode('%PDF-1.5\n1 0 obj<</Filter/FlateDecode>>stream\n');
const tail = new TextEncoder().encode('\nendstream\nendobj\n%%EOF');
const pdf = new Uint8Array([...head, ...stream, ...tail, ...head, ...stream, ...tail]); // two streams: none skipped
assert.deepEqual(extractTextItems(pdf), Array(2).fill({ x: 366, y: 578.46, text: 'Th 6:00 PM - 9:00 PM/09-309(Cisco Lab 1)' }));
assert.throws(() => extractTextItems(new TextEncoder().encode('hello')), /not a PDF/);

console.log('schedule import checks passed');
