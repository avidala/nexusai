#!/usr/bin/env node
// NexusAI local server — one process that serves the dashboard, stores everything in
// a local SQLite file, runs Claude Code agents on this machine, and streams updates
// to the browser. No cloud, no auth, no Docker.
import express from 'express';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { hostname } from 'node:os';
import { store, dbPath } from './store.mjs';
import { addClient, broadcast } from './events.mjs';
import { runSession, abortSession, executorName } from './agent/run.mjs';
import { detectFolders, AVAILABLE_MODELS } from './agent/environment.mjs';
import { chooseFolderNative } from './agent/browse.mjs';

const PORT = Number(process.env.PORT || 4317);
const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist');

const app = express();
app.use(express.json({ limit: '8mb' }));

// --- environment (real local folders + models) ---
app.get('/api/environment', (req, res) => {
  const roots = process.env.NEXUS_FOLDER_ROOTS?.split(':');
  res.json({ folders: detectFolders(roots), models: AVAILABLE_MODELS, hostname: hostname(), online: true });
});

// --- sessions ---
app.get('/api/sessions', (req, res) => res.json(store.listSessions()));
app.post('/api/sessions', (req, res) => {
  const s = store.createSession(req.body);
  broadcast({ entity: 'AgentSession', type: 'create', id: s.id, data: s });
  if (s.state === 'working') runSession(s.id);
  res.json(s);
});
app.patch('/api/sessions/:id', (req, res) => {
  const s = store.updateSession(req.params.id, req.body);
  broadcast({ entity: 'AgentSession', type: 'update', id: s.id, data: s });
  if (req.body.state === 'working') runSession(s.id);
  else if (req.body.state === 'stopped') abortSession(s.id);
  res.json(s);
});
app.delete('/api/sessions/:id', (req, res) => {
  store.deleteSession(req.params.id);
  broadcast({ entity: 'AgentSession', type: 'delete', id: req.params.id });
  res.json({ ok: true });
});

// --- messages ---
app.get('/api/sessions/:id/messages', (req, res) => res.json(store.listMessages(req.params.id)));
app.post('/api/messages', (req, res) => {
  const m = store.createMessage(req.body);
  broadcast({ entity: 'AgentMessage', type: 'create', id: m.id, data: m });
  res.json(m);
});

// --- native folder picker ---
app.post('/api/browse', async (req, res) => {
  try {
    res.json({ path: await chooseFolderNative() });
  } catch (e) {
    if (/cancel/i.test(e.message)) res.json({ path: null });
    else res.status(500).json({ error: e.message });
  }
});

// --- live updates (SSE) ---
app.get('/api/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders?.();
  res.write(': connected\n\n');
  addClient(res);
});

// --- static dashboard (built UI) ---
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/.*/, (req, res) => res.sendFile(join(dist, 'index.html')));
}

function openBrowser(url) {
  if (process.env.NEXUS_NO_OPEN) return;
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try { spawn(cmd, [url], { stdio: 'ignore', detached: true, shell: process.platform === 'win32' }).unref(); } catch { /* ignore */ }
}

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  NexusAI running → ${url}`);
  console.log(`  executor: ${executorName}  ·  db: ${dbPath}\n`);
  if (existsSync(dist)) openBrowser(url);
  else console.log('  (dev: run `npm run dev` for the UI with hot reload)\n');
});
