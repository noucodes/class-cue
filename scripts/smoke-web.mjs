// Web smoke test: opens each main screen in headless Chrome/Edge with sample data and checks it renders
// without errors. Start the web dev server first (`npx expo start --web`), then run `npm run smoke:web`.
// Options: SMOKE_URL (default http://localhost:8081), CHROME_PATH (browser executable),
// SMOKE_SCREENSHOTS=<folder> to save a phone-sized PNG of each page, SMOKE_VERBOSE=1 for full error output.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = (process.env.SMOKE_URL ?? 'http://localhost:8081').replace(/\/$/, '');
const TIMEOUT_MS = 30_000;
const SHOTS = process.env.SMOKE_SCREENSHOTS;

const BROWSERS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

// ---------- sample data (same shape the app persists to localStorage) ----------

const pad = (n) => String(n).padStart(2, '0');
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const now = new Date();
const today = now.getDay();
const tomorrow = (today + 1) % 7;
const stamp = now.toISOString();

const data = {
  version: 2,
  state: {
    settings: { userName: 'Smoke', theme: 'light', notificationsEnabled: false, defaultReminderMinutes: 60 },
    classes: [
      {
        id: 'net',
        subjectName: 'Computer Networks',
        subjectCode: 'CpE 313',
        teacher: 'Ben Reyes',
        color: '#3B82F6',
        reminderEnabled: false,
        sessions: [
          { days: [today], startTime: '07:00', endTime: '08:30', room: '09-303(ICT Lab 3)', mode: 'f2f' },
          { days: [tomorrow], startTime: '18:00', endTime: '21:00', mode: 'online' },
        ],
      },
    ],
    events: [
      { id: 'a1', title: 'Subnetting worksheet', type: 'assignment', subjectId: 'net', date: key(now), completed: false, reminderEnabled: false, createdAt: stamp, updatedAt: stamp },
      { id: 'r1', title: 'OSI model report', type: 'report', subjectId: 'net', date: key(now), startTime: '07:00', priority: 'high', completed: false, reminderEnabled: false, createdAt: stamp, updatedAt: stamp },
    ],
  },
};

/** Route → text that must appear once it has rendered. */
const PAGES = [
  ['/', 'Computer Networks'],
  ['/', 'OSI model report'],
  ['/calendar', 'Computer Networks'],
  ['/tasks', 'Subnetting worksheet'],
  ['/classes', 'Computer Networks'],
  ['/class/net', 'Schedule 2'],
  ['/class/edit?id=net', 'Add another schedule'],
  ['/event/edit?type=report&subjectId=net', 'Set to the next class of this subject.'],
  ['/class/import', 'Import your class schedule'],
  ['/more', 'Export data'],
  ['/stats', 'Reports'],
  ['/search', 'Search'],
];

// ---------- minimal Chrome DevTools Protocol client ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, what, ms = TIMEOUT_MS) {
  const end = Date.now() + ms;
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {
      // not ready yet
    }
    if (Date.now() > end) throw new Error(`Timed out waiting for ${what}`);
    await sleep(250);
  }
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = ({ data: raw }) => {
    const msg = JSON.parse(raw);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else listeners.forEach((l) => l(msg));
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve({ send, on: (l) => listeners.push(l), close: () => ws.close() });
    ws.onerror = () => reject(new Error('Could not connect to the browser'));
  });
}

// ---------- run ----------

const browser = BROWSERS.find((p) => existsSync(p));
if (!browser) {
  console.error('No Chrome or Edge found. Set CHROME_PATH to a Chromium-based browser.');
  process.exit(1);
}

try {
  await waitFor(() => fetch(BASE).then((r) => r.ok), `the app at ${BASE}`, 5_000);
} catch {
  console.error(`Nothing is serving ${BASE}. Start it with \`npx expo start --web\` (or set SMOKE_URL).`);
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), 'classcue-smoke-'));
// Port 0 lets the browser pick a free port; it writes the choice to DevToolsActivePort in the profile.
const chrome = spawn(browser, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--window-size=412,915', 'about:blank'], { stdio: 'ignore' });

let failures = 0;
try {
  const port = await waitFor(() => readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0], 'the browser to start');
  const target = await waitFor(
    () => fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === 'page')),
    'the browser tab',
  );
  const cdp = await connect(target.webSocketDebuggerUrl);
  const errors = [];
  cdp.on(({ method, params }) => {
    if (method === 'Runtime.exceptionThrown') errors.push(params.exceptionDetails.exception?.description ?? params.exceptionDetails.text);
    if (method === 'Runtime.consoleAPICalled' && params.type === 'error') {
      // React logs printf-style ("In HTML, %s cannot be a descendant of <%s>"); fill the placeholders in.
      const [fmt, ...rest] = params.args.map((a) => String(a.value ?? a.description));
      errors.push(fmt.replace(/%[sdo]/g, () => rest.shift() ?? '') + (rest.length ? ` ${rest.join(' ')}` : ''));
    }
  });
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  const evaluate = async (expression) => (await cdp.send('Runtime.evaluate', { expression, returnByValue: true })).result.value;

  // Seed storage on the app's origin, then every navigation below starts from that data.
  await cdp.send('Page.navigate', { url: BASE });
  // The first load waits for Metro to build the bundle, which can take a while on a cold start.
  await waitFor(() => evaluate('document.readyState === "complete"'), 'the first page load', 180_000);
  await evaluate(`localStorage.setItem('classcue-data', ${JSON.stringify(JSON.stringify(data))})`);

  for (const [path, text] of PAGES) {
    errors.length = 0;
    const started = Date.now();
    await cdp.send('Page.navigate', { url: BASE + path });
    try {
      await waitFor(() => evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`), `"${text}"`);
      await sleep(300); // let late render errors surface
      if (errors.length) throw new Error(process.env.SMOKE_VERBOSE ? errors[0] : errors[0].split('\n')[0]);
      console.log(`  ok    ${path.padEnd(42)} ${Date.now() - started} ms`);
      if (SHOTS) {
        mkdirSync(SHOTS, { recursive: true });
        const { data: png } = await cdp.send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(SHOTS, `${path.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}.png`), Buffer.from(png, 'base64'));
      }
    } catch (e) {
      failures++;
      console.log(`  FAIL  ${path.padEnd(42)} ${e.message}`);
    }
  }
  cdp.close();
} finally {
  chrome.kill();
  await sleep(1000);
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  } catch {
    // Windows can keep the profile locked briefly after exit; it's only a temp folder.
  }
}

console.log(failures ? `\n${failures} page check(s) failed` : '\nAll page checks passed');
process.exit(failures ? 1 : 0);
