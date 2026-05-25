#!/usr/bin/env node
// Boots `vite dev` against a free port, then probes a representative set of
// restored sebuf RPC endpoints. Exits non-zero on the first failure so it
// doubles as a pre-push gate.

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const PROBES = [
  { name: 'news/list-feed-digest',        method: 'GET',  path: '/api/news/v1/list-feed-digest' },
  { name: 'intelligence/get-risk-scores', method: 'GET',  path: '/api/intelligence/v1/get-risk-scores' },
  { name: 'natural/list-natural-events',  method: 'GET',  path: '/api/natural/v1/list-natural-events' },
  { name: 'market/list-market-quotes',    method: 'GET',  path: '/api/market/v1/list-market-quotes' },
  { name: 'military/list-military-flights', method: 'GET', path: '/api/military/v1/list-military-flights' },
  { name: 'conflict/list-acled-events',   method: 'GET',  path: '/api/conflict/v1/list-acled-events' },
];

async function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitForReady(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`vite dev did not become ready on :${port} within ${timeoutMs}ms`);
}

async function probe(port, p) {
  const url = `http://localhost:${port}${p.path}`;
  const started = Date.now();
  let res;
  try {
    res = await fetch(url, {
      method: p.method,
      headers: { 'Content-Type': 'application/json', 'Origin': `http://localhost:${port}` },
      body: p.method === 'POST' ? JSON.stringify(p.body) : undefined,
    });
  } catch (err) {
    return { ok: false, name: p.name, error: `fetch failed: ${err.message}`, ms: Date.now() - started };
  }
  const ms = Date.now() - started;
  let bodyText = '';
  try { bodyText = await res.text(); } catch {}
  const preview = bodyText.length > 240 ? bodyText.slice(0, 240) + '…' : bodyText;
  return {
    ok: res.status >= 200 && res.status < 500,
    name: p.name,
    status: res.status,
    ms,
    preview,
  };
}

async function main() {
  const port = await freePort();
  console.log(`[smoke] starting vite dev on :${port}`);
  const isWin = process.platform === 'win32';
  const child = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    env: { ...process.env, BROWSER: 'none', VITE_SKIP_OPEN: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWin,
  });
  let stderrTail = '';
  child.stdout.on('data', (b) => process.stdout.write(`[vite] ${b.toString()}`));
  child.stderr.on('data', (b) => {
    const s = b.toString();
    stderrTail = (stderrTail + s).slice(-4000);
    process.stderr.write(`[vite] ${s}`);
  });
  let exited = false;
  child.on('exit', (code) => { exited = true; console.error(`[smoke] vite exited with code ${code}`); });

  const cleanup = () => {
    if (exited) return;
    try { child.kill('SIGTERM'); } catch {}
    setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 2000).unref();
  };

  try {
    await waitForReady(port);
    console.log(`[smoke] vite ready, probing ${PROBES.length} endpoints`);

    const results = [];
    for (const p of PROBES) {
      const r = await probe(port, p);
      results.push(r);
      const tag = r.ok ? 'OK ' : 'FAIL';
      console.log(`[${tag}] ${r.name.padEnd(40)} ${r.status ?? '---'} ${r.ms}ms`);
      if (!r.ok) console.log(`       ${r.error || r.preview}`);
    }

    const failures = results.filter((r) => !r.ok);
    if (failures.length > 0) {
      console.error(`\n[smoke] ${failures.length}/${results.length} endpoints failed`);
      process.exitCode = 1;
    } else {
      console.log(`\n[smoke] all ${results.length} endpoints responded`);
    }
  } catch (err) {
    console.error('[smoke] fatal:', err.message);
    if (stderrTail) console.error('[smoke] vite stderr tail:\n' + stderrTail);
    process.exitCode = 1;
  } finally {
    cleanup();
  }
}

main();
