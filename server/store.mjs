// local SQLite store (node:sqlite, no native deps). single-user, on this laptop.
// field names mirror what the dashboard reads (snake_case) so the UI is unchanged.
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';

const DB_PATH = process.env.NEXUS_DB || join(homedir(), '.nexus', 'nexus.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

const SCHEMA = `
  create table if not exists sessions (
    id text primary key,
    created_date text not null,
    updated_date text not null,
    name text not null,
    task text not null,
    state text not null default 'working',
    pinned integer not null default 0,
    activity text,
    model text,
    temperature real,
    max_tokens integer,
    working_dir text,
    tool_call_count integer not null default 0,
    pr_number integer,
    started_at text,
    runner_session_ref text,
    changed_files text not null default '[]'
  );
  create table if not exists messages (
    id text primary key,
    created_date text not null,
    session_id text not null,
    role text not null,
    content text not null,
    ts text
  );
  create index if not exists messages_session_idx on messages (session_id, created_date);
`;
// run each DDL statement (node:sqlite prepare/run handles DDL)
for (const stmt of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) db.prepare(stmt).run();

const now = () => new Date().toISOString();

// sqlite stores booleans as 0/1 and json as text — (de)serialize at the boundary
function rowToSession(r) {
  if (!r) return null;
  return { ...r, pinned: !!r.pinned, changed_files: JSON.parse(r.changed_files || '[]') };
}

const SESSION_FIELDS = [
  'name', 'task', 'state', 'pinned', 'activity', 'model', 'temperature',
  'max_tokens', 'working_dir', 'tool_call_count', 'pr_number', 'started_at',
  'runner_session_ref', 'changed_files',
];

function encode(key, value) {
  if (key === 'pinned') return value ? 1 : 0;
  if (key === 'changed_files') return JSON.stringify(value ?? []);
  return value;
}

export const store = {
  listSessions() {
    return db.prepare('select * from sessions order by created_date desc').all().map(rowToSession);
  },
  getSession(id) {
    return rowToSession(db.prepare('select * from sessions where id = ?').get(id));
  },
  createSession(data) {
    const id = randomUUID();
    const ts = now();
    const row = {
      id, created_date: ts, updated_date: ts,
      name: data.name, task: data.task,
      state: data.state ?? 'working',
      pinned: data.pinned ? 1 : 0,
      activity: data.activity ?? null,
      model: data.model ?? null,
      temperature: data.temperature ?? null,
      max_tokens: data.max_tokens ?? null,
      working_dir: data.working_dir ?? null,
      tool_call_count: data.tool_call_count ?? 0,
      pr_number: data.pr_number ?? null,
      started_at: data.started_at ?? null,
      runner_session_ref: data.runner_session_ref ?? null,
      changed_files: JSON.stringify(data.changed_files ?? []),
    };
    const cols = Object.keys(row);
    db.prepare(`insert into sessions (${cols.join(',')}) values (${cols.map(() => '?').join(',')})`)
      .run(...cols.map((c) => row[c]));
    return this.getSession(id);
  },
  updateSession(id, patch) {
    const keys = Object.keys(patch).filter((k) => SESSION_FIELDS.includes(k));
    if (keys.length) {
      const set = [...keys, 'updated_date'].map((k) => `${k} = ?`).join(', ');
      const vals = [...keys.map((k) => encode(k, patch[k])), now(), id];
      db.prepare(`update sessions set ${set} where id = ?`).run(...vals);
    }
    return this.getSession(id);
  },
  deleteSession(id) {
    db.prepare('delete from messages where session_id = ?').run(id);
    db.prepare('delete from sessions where id = ?').run(id);
    return { id };
  },
  listMessages(sessionId) {
    return db.prepare('select * from messages where session_id = ? order by created_date asc').all(sessionId);
  },
  createMessage(data) {
    const id = randomUUID();
    const row = {
      id, created_date: now(),
      session_id: data.session_id, role: data.role, content: data.content,
      ts: data.ts ?? now(),
    };
    const cols = Object.keys(row);
    db.prepare(`insert into messages (${cols.join(',')}) values (${cols.map(() => '?').join(',')})`)
      .run(...cols.map((c) => row[c]));
    return row;
  },
};

export const dbPath = DB_PATH;
