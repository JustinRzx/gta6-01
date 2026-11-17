// Development helper: load a game scene in headless Chrome, print console messages and any
// uncaught errors, and wait for window.__shotReady (or a timeout), then optionally write a PNG.
// Usage: node tools/shot-check.mjs "?shot=chase&seed=11" [out.png] [timeoutMs]

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const query = process.argv[2] ?? '';
const outFile = process.argv[3] ?? null;
const timeoutMs = Number(process.argv[4] ?? 20000);

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--remote-debugging-port=9223',
  '--window-size=1280,720',
  'about:blank',
], { stdio: 'ignore' });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function getWsUrl() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch('http://127.0.0.1:9223/json');
      const list = await res.json();
      const page = list.find((p) => p.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('no chrome page');
}

const wsUrl = await getWsUrl();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
const events = [];

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  if (data.id && pending.has(data.id)) {
    pending.get(data.id)(data);
    pending.delete(data.id);
  } else {
    events.push(data);
  }
};

function send(method, params = {}) {
  const thisId = ++id;
  ws.send(JSON.stringify({ id: thisId, method, params }));
  return new Promise((res) => pending.set(thisId, res));
}

await send('Runtime.enable');
await send('Page.enable');

const consoleLogs = [];
for (let i = 0; i < events.length; i += 1) {
  const e = events[i];
  if (e.method === 'Runtime.consoleAPICalled') consoleLogs.push(e.params);
  if (e.method === 'Runtime.exceptionThrown') consoleLogs.push({ exception: e.params.exceptionDetails });
}
events.length = 0;

await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html${query}` });

const start = Date.now();
let ready = false;
let lastErrors = [];
while (Date.now() - start < timeoutMs) {
  await sleep(100);
  for (let i = 0; i < events.length; i += 1) {
    const e = events[i];
    if (e.method === 'Runtime.consoleAPICalled') {
      const text = (e.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      consoleLogs.push({ type: e.params.type, text });
    }
    if (e.method === 'Runtime.exceptionThrown') {
      const d = e.params.exceptionDetails;
      lastErrors.push(d.exception?.description || d.text || 'exception');
      consoleLogs.push({ type: 'error', text: d.exception?.description || d.text });
    }
  }
  events.length = 0;
  const r = await send('Runtime.evaluate', { expression: 'window.__shotReady === true', returnByValue: true });
  if (r.result?.result?.value === true) { ready = true; break; }
}

console.log('shotReady:', ready);
console.log('--- console ---');
for (const l of consoleLogs) console.log(`[${l.type}] ${l.text ?? ''}`);
if (lastErrors.length) { console.log('--- exceptions ---'); for (const e of lastErrors) console.log(e); }

if (outFile && ready) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(outFile, Buffer.from(shot.result.data, 'base64'));
  console.log('wrote', outFile);
}

ws.close();
chrome.kill();
process.exit(ready ? 0 : 1);
