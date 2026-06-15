// orchestrates a session run in-process: pick an executor, stream its output into
// the local store + broadcast over SSE, capture file diffs, support stop. No claim/
// poll loop — single local process, so a session just runs when it's dispatched.
import { store } from '../store.mjs';
import { broadcast } from '../events.mjs';
import { gitBaseline, collectChangedFiles } from './changes.mjs';
import { claudeCodeExecutor } from './executors/claude-code.mjs';
import { claudeExecutor } from './executors/claude.mjs';
import { mockExecutor } from './executors/mock.mjs';

const running = new Map(); // sessionId -> AbortController

function makeExecutor() {
  const choice = process.env.NEXUS_EXECUTOR || (process.env.ANTHROPIC_API_KEY ? 'claude' : 'claude-code');
  if (choice === 'mock') return mockExecutor();
  if (choice === 'claude') return claudeExecutor();
  return claudeCodeExecutor();
}
const executor = makeExecutor();
export const executorName = process.env.NEXUS_EXECUTOR || (process.env.ANTHROPIC_API_KEY ? 'claude' : 'claude-code');

function pushSession(id) {
  broadcast({ entity: 'AgentSession', type: 'update', id, data: store.getSession(id) });
}

export function abortSession(id) {
  running.get(id)?.abort();
}

export async function runSession(id) {
  if (running.has(id)) return; // already running — don't double-start
  const session = store.getSession(id);
  if (!session) return;

  const history = store.listMessages(id);
  const isContinuation = history.some((m) => m.role === 'assistant' || m.role === 'tool');
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  const userInput = lastUser?.content ?? session.task;
  const baseline = await gitBaseline(session.working_dir);

  const ac = new AbortController();
  running.set(id, ac);
  let toolCount = session.tool_call_count ?? 0;
  let result = { state: 'completed', activity: 'done' };
  let gen;
  try {
    gen = executor.run(session, {
      history, isContinuation, userInput,
      resumeRef: session.runner_session_ref ?? null,
      signal: ac.signal,
    });
    for (;;) {
      const { value, done } = await gen.next();
      if (done) { if (value) result = value; break; }
      if (ac.signal.aborted) break;
      const msg = store.createMessage({ session_id: id, role: value.role, content: value.content });
      broadcast({ entity: 'AgentMessage', type: 'create', id: msg.id, data: msg });
      if (value.role === 'tool') toolCount += 1;
      store.updateSession(id, { activity: String(value.content).slice(0, 120), tool_call_count: toolCount });
      pushSession(id);
    }
  } catch (err) {
    if (!ac.signal.aborted) result = { state: 'failed', activity: `error: ${err.message}` };
  } finally {
    running.delete(id);
    await gen?.return?.();
  }

  if (ac.signal.aborted) {
    // stop already set state='stopped' via the PATCH; just note it and finish
    store.updateSession(id, { activity: 'stopped by user', tool_call_count: toolCount });
    pushSession(id);
    return;
  }

  const patch = {
    state: result.state ?? 'completed',
    activity: result.activity ?? 'done',
    tool_call_count: toolCount,
  };
  if (result.sessionRef) patch.runner_session_ref = result.sessionRef;
  try { patch.changed_files = await collectChangedFiles(session.working_dir, baseline); } catch { /* best effort */ }
  store.updateSession(id, patch);
  pushSession(id);
}
