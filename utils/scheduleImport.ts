// Reads a class schedule out of a registration PDF, fully offline.
// Built for text-based PDFs such as USTP's Certificate of Registration (JasperReports/iText):
// each piece of text sits at an x/y position, so rows are rebuilt from coordinates.
// Pure logic (fflate is the only import) so `npm run check` can test it against a real file.
import { unzlibSync } from 'fflate';

export interface TextItem {
  x: number;
  y: number;
  text: string;
}

// Mirrors ClassSession in types/ (kept local so this file stays import-free for `npm run check`).
export interface SessionDraft {
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  startTime: string;
  endTime: string;
  room?: string;
  mode: 'f2f' | 'online';
}

export interface ClassDraft {
  subjectCode?: string;
  subjectName: string;
  teacher?: string;
  /** Every meeting pattern listed for this subject, merged by subject name. */
  sessions: SessionDraft[];
}

export interface ScheduleImportResult {
  classes: ClassDraft[];
  /** Subjects found without a usable schedule (e.g. "TBA"). */
  skipped: string[];
}

// ---------- PDF text extraction ----------

const latin1 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return s;
};

/** Decodes a PDF literal string body: \( \) \\ \n and octal escapes. */
function unescapePdfString(s: string): string {
  return s.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, e: string) => {
    if (/^[0-7]/.test(e)) return String.fromCharCode(parseInt(e, 8));
    return ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' } as Record<string, string>)[e] ?? e;
  });
}

// ponytail: handles literal-string Tj/TJ with WinAnsi fonts (what JasperReports/iText emit).
// Hex strings and CID fonts (ToUnicode maps) aren't decoded; such PDFs fall back to "no schedule found".
export function extractTextItems(pdf: Uint8Array): TextItem[] {
  const raw = latin1(pdf);
  if (!raw.startsWith('%PDF')) throw new Error('That file is not a PDF.');
  if (raw.includes('/Encrypt')) throw new Error('This PDF is password-protected. Remove the password and try again.');

  const items: TextItem[] = [];
  const streamRe = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = streamRe.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) break;
    streamRe.lastIndex = end + 'endstream'.length; // don't re-match the "stream" inside "endstream"
    let content: string;
    try {
      content = latin1(unzlibSync(pdf.subarray(start, end)));
    } catch {
      continue; // not Flate-compressed text (images, fonts…)
    }
    for (const block of content.split(/\bBT\b/).slice(1)) {
      const body = block.split(/\bET\b/)[0];
      let x = 0;
      let y = 0;
      const ops = /([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+Tm|([-\d.]+)\s+([-\d.]+)\s+T[dD]|\(((?:\\.|[^\\)])*)\)\s*Tj|\[((?:\\.|[^\]])*)\]\s*TJ/g;
      let op: RegExpExecArray | null;
      while ((op = ops.exec(body))) {
        if (op[5] !== undefined) {
          x = Number(op[5]);
          y = Number(op[6]);
        } else if (op[7] !== undefined) {
          x += Number(op[7]);
          y += Number(op[8]);
        } else {
          const str = op[9] ?? [...op[10].matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map((p) => p[1]).join('');
          const text = unescapePdfString(str).replace(/\s+/g, ' ').trim();
          if (text) items.push({ x, y, text });
        }
      }
    }
  }
  return items;
}

// ---------- schedule parsing ----------

const DAY_TOKENS: Record<string, number> = { Su: 0, Sun: 0, M: 1, Mon: 1, T: 2, Tu: 2, Tue: 2, W: 3, Wed: 3, Th: 4, Thu: 4, F: 5, Fri: 5, S: 6, Sa: 6, Sat: 6 };
const TIME = String.raw`(\d{1,2}):(\d{2})\s*([AP])\.?M\.?`;
const SCHEDULE_RE = new RegExp(String.raw`^([A-Za-z]+)\s+${TIME}\s*-\s*${TIME}\s*(?:/\s*(.+))?$`, 'i');
const CODE_RE = /^[A-Za-z]{2,6}\s?\d{2,4}[A-Za-z]?$/;

/** "TTh" → [2, 4]; "MWF" → [1, 3, 5]; returns null if any part isn't a day. */
export function parseDays(s: string): number[] | null {
  const tokens = s.match(/Sun|Mon|Tue|Wed|Thu|Fri|Sat|Th|Tu|Su|Sa|M|T|W|F|S/g);
  if (!tokens || tokens.join('') !== s) return null;
  return [...new Set(tokens.map((t) => DAY_TOKENS[t]))];
}

const to24h = (h: string, m: string, ap: string) => {
  const hour = (Number(h) % 12) + (ap.toUpperCase() === 'P' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${m}`;
};

/**
 * "Th 6:00 PM - 9:00 PM/09-309(Cisco Lab 1)" → Thursday 18:00–21:00 in 09-309(Cisco Lab 1).
 * On the registration form a room with a parenthesised name is a physical room, so a "(" means
 * face-to-face; a bare code or no room at all means the meeting is online.
 */
export function parseScheduleLine(text: string): SessionDraft | null {
  const m = SCHEDULE_RE.exec(text);
  if (!m) return null;
  const days = parseDays(m[1]);
  if (!days) return null;
  const room = m[8]?.trim() || undefined;
  return {
    days,
    startTime: to24h(m[2], m[3], m[4]),
    endTime: to24h(m[5], m[6], m[7]),
    room,
    mode: room?.includes('(') ? 'f2f' : 'online',
  };
}

const ROW_TOLERANCE = 2;

export function parseSchedule(items: TextItem[]): ScheduleImportResult {
  // Limit to the subject table when its header is present.
  const header = items.find((i) => /^CODE$/i.test(i.text));
  const titleHeader = items.find((i) => /SUBJECT\s*TITLE|DESCRIPTION/i.test(i.text));
  const total = items.find((i) => /^Total Unit/i.test(i.text));
  const top = header?.y ?? Infinity;
  const bottom = total && total.y < top ? total.y : -Infinity;
  const table = items.filter((i) => i.y < top - ROW_TOLERANCE && i.y > bottom + ROW_TOLERANCE);

  const codeMaxX = titleHeader ? titleHeader.x : Infinity;
  const codes = table
    .filter((i) => CODE_RE.test(i.text) && i.x < codeMaxX)
    .sort((a, b) => a.x - b.x) // leftmost column wins if a row has two matches
    .filter((c, idx, all) => all.findIndex((o) => Math.abs(o.y - c.y) < ROW_TOLERANCE) === idx);
  const schedules = table
    .map((i) => ({ item: i, parsed: parseScheduleLine(i.text) }))
    .filter((s): s is { item: TextItem; parsed: NonNullable<ReturnType<typeof parseScheduleLine>> } => s.parsed !== null);
  if (!codes.length || !schedules.length) return { classes: [], skipped: [] };

  const scheduleX = Math.min(...schedules.map((s) => s.item.x));
  const isNumeric = (t: string) => /^[\d.,]+$/.test(t);
  const titleFor = (code: TextItem) =>
    table
      .filter((i) => Math.abs(i.y - code.y) < ROW_TOLERANCE && i.x > code.x && i.x < scheduleX - 60 && !isNumeric(i.text) && !i.text.includes('_'))
      .sort((a, b) => a.x - b.x)[0]
      ?.text.replace(/\s*\*+$/, '');

  const drafts: (Omit<ClassDraft, 'sessions'> & { session: SessionDraft })[] = [];
  const scheduled = new Set<TextItem>();
  for (const { item, parsed } of schedules) {
    // A schedule belongs to the nearest subject row at or above it (continuation lines have no code).
    const owner = codes
      .filter((c) => c.y >= item.y - ROW_TOLERANCE)
      .sort((a, b) => a.y - b.y)[0];
    if (!owner) continue;
    scheduled.add(owner);
    const teacher = table
      .filter((i) => Math.abs(i.y - item.y) <= ROW_TOLERANCE && i.x > item.x && !parseScheduleLine(i.text) && !i.text.includes('_'))
      .sort((a, b) => Math.abs(a.y - item.y) - Math.abs(b.y - item.y))[0]?.text;
    drafts.push({
      subjectCode: owner.text,
      subjectName: titleFor(owner) ?? owner.text,
      teacher,
      session: parsed,
    });
  }

  return {
    classes: mergeDrafts(drafts),
    skipped: codes.filter((c) => !scheduled.has(c)).map((c) => titleFor(c) ?? c.text),
  };
}

/**
 * Rows with the same subject name become one class with several sessions.
 * Within a class, sessions at the same time, room and mode on different days are joined ("M" + "W" → "MW").
 */
function mergeDrafts(drafts: (Omit<ClassDraft, 'sessions'> & { session: SessionDraft })[]): ClassDraft[] {
  const out: ClassDraft[] = [];
  const key = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
  for (const { session, ...d } of drafts) {
    let cls = out.find((o) => key(o.subjectName) === key(d.subjectName));
    if (!cls) out.push((cls = { ...d, sessions: [] }));
    cls.teacher ??= d.teacher;
    const same = cls.sessions.find(
      (s) => s.startTime === session.startTime && s.endTime === session.endTime && s.room === session.room && s.mode === session.mode,
    );
    if (same) same.days = [...new Set([...same.days, ...session.days])];
    else cls.sessions.push({ ...session, days: [...session.days] });
  }
  return out;
}

export function parseSchedulePdf(pdf: Uint8Array): ScheduleImportResult {
  return parseSchedule(extractTextItems(pdf));
}
