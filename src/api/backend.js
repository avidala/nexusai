// backend = the local NexusAI server (same origin in production; proxied in dev).
// REST for reads/writes, Server-Sent Events for live updates. No auth, no cloud.

const API = '/api';

async function req(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || `${res.status} ${res.statusText}`);
  }
  return res.status === 204 ? null : res.json();
}

// one shared SSE connection fans out to per-entity subscribers
const listeners = { AgentSession: new Set(), AgentMessage: new Set() };
let es;
function ensureStream() {
  if (es || typeof window === 'undefined') return;
  es = new EventSource(`${API}/events`);
  es.onmessage = (e) => {
    try {
      const ev = JSON.parse(e.data);
      listeners[ev.entity]?.forEach((cb) => cb(ev));
    } catch { /* keepalive / non-json */ }
  };
  // the browser auto-reconnects EventSource on error; nothing to do
}
function subscribe(entity, cb) {
  ensureStream();
  listeners[entity].add(cb);
  return () => listeners[entity].delete(cb);
}

export const backend = {
  entities: {
    AgentSession: {
      list: () => req('GET', '/sessions'),
      create: (data) => req('POST', '/sessions', data),
      update: (id, data) => req('PATCH', `/sessions/${id}`, data),
      delete: (id) => req('DELETE', `/sessions/${id}`),
      subscribe: (cb) => subscribe('AgentSession', cb),
    },
    AgentMessage: {
      // only used as filter({ session_id }) by the dashboard
      filter: (query) => req('GET', `/sessions/${query.session_id}/messages`),
      create: (data) => req('POST', '/messages', data),
      subscribe: (cb) => subscribe('AgentMessage', cb),
    },
  },
  // real local environment (folders + models) and the native folder picker
  getEnvironment: () => req('GET', '/environment'),
  browseFolder: () => req('POST', '/browse'),
};
