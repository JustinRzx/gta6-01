// Capture the four screenshot scenes at 1280x720 into screenshots/, by driving headless Chrome
// over the local static server and waiting for window.__shotReady in each scene.
// Usage: node tools/capture-shots.mjs

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const SCENES = [
  { name: '1-chase.jpg', query: '?shot=chase&seed=11' },
  { name: '2-drive.jpg', query: '?shot=drive&seed=11' },
  { name: '3-foot.jpg', query: '?shot=foot&seed=11' },
  { name: '4-mission.jpg', query: '?shot=mission&seed=11' },
];

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--remote-debugging-port=9225',
  '--window-size=1280,720',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const list = await (await fetch('http://127.0.0.1:9225/json')).json();
      const page = list.find((p) => p.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('no chrome page');
}

const ws = new WebSocket(await getWsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
};
const send = (method, params = {}) => {
  const i = ++id;
  ws.send(JSON.stringify({ id: i, method, params }));
  return new Promise((r) => pending.set(i, r));
};

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

for (const scene of SCENES) {
  await send('Page.navigate', { url: `http://127.0.0.1:8899/index.html${scene.query}` });
  let ready = false;
  for (let i = 0; i < 200; i += 1) {
    await sleep(100);
    const r = await send('Runtime.evaluate', { expression: 'window.__shotReady === true', returnByValue: true });
    if (r.result?.result?.value === true) { ready = true; break; }
  }
  if (!ready) throw new Error(`scene ${scene.name} did not become ready`);
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  writeFileSync(new URL(`../screenshots/${scene.name}`, import.meta.url), Buffer.from(shot.result.data, 'base64'));
  console.log('captured', scene.name);
}

ws.close();
chrome.kill();
console.log('done');
process.exit(0);
