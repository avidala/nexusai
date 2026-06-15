// claude-code executor — drives the locally-installed Claude Code CLI headlessly
// (`claude -p --output-format stream-json`). Runs under the user's existing Claude
// Code login (e.g. a Pro/Max/Team subscription), so it needs NO API key, and the
// agent gets Claude Code's full toolset (read/edit/bash/grep/…), not just bash.
//
// ⚠️ uses --dangerously-skip-permissions so the agent runs tools without prompting.
// scope it to throwaway / trusted repos on your own machine. see runner/README.md.
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';

function resolveDir(dir) {
  if (!dir || dir === '~') return homedir();
  if (dir.startsWith('~/')) return dir.replace(/^~/, homedir());
  return dir;
}

export function claudeCodeExecutor({ model, bin = 'claude' } = {}) {
  return {
    async *run(session, { resumeRef = null, userInput, signal } = {}) {
      const cwd = resolveDir(session.working_dir);
      const prompt = userInput || session.task;
      // on a reply, resume the same Claude Code session so it continues with full
      // context instead of restarting the task from scratch
      const args = resumeRef
        ? ['--resume', resumeRef, '-p', prompt]
        : ['-p', prompt];
      args.push('--output-format', 'stream-json', '--verbose', '--dangerously-skip-permissions');
      // don't load the user's MCP servers (e.g. Serena, which pops a dashboard tab
      // on every run) — the agent works via built-in tools. strict + empty config.
      args.push('--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}');
      // honor the model chosen for this session (falls back to the constructor model)
      const chosen = session.model || model;
      if (chosen) args.push('--model', chosen);

      // use the subscription login, not an API key — drop any (here, invalid) key
      const env = { ...process.env };
      delete env.ANTHROPIC_API_KEY;

      const child = spawn(bin, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });

      // a dashboard "stop" aborts the signal — kill the Claude Code process
      const onAbort = () => { try { child.kill('SIGTERM'); } catch { /* already gone */ } };
      if (signal) {
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
      }

      // bridge the child's newline-delimited JSON stdout into this async generator
      const queue = [];
      let resolveWait = null;
      const wake = () => { const r = resolveWait; resolveWait = null; if (r) r(); };
      let buf = '';
      let finished = false;
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        buf += chunk.toString();
        let idx;
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line) continue;
          try { queue.push(JSON.parse(line)); } catch { /* skip non-json */ }
        }
        wake();
      });
      child.stderr.on('data', (d) => { stderr += d.toString(); });
      child.on('close', () => { finished = true; wake(); });
      child.on('error', (e) => { stderr += `\nspawn error: ${e.message}`; finished = true; wake(); });

      let finalResult = null;
      let sessionRef = resumeRef; // claude code's session_id, for resuming on a reply
      for (;;) {
        if (queue.length === 0) {
          if (finished) break;
          await new Promise((r) => { resolveWait = r; if (queue.length || finished) wake(); });
          continue;
        }
        const ev = queue.shift();
        if (ev.session_id) sessionRef = ev.session_id;
        if (ev.type === 'assistant' && ev.message?.content) {
          for (const b of ev.message.content) {
            if (b.type === 'text' && b.text?.trim()) {
              yield { role: 'assistant', content: b.text.trim() };
            } else if (b.type === 'tool_use') {
              const detail = JSON.stringify(b.input ?? {}).slice(0, 120);
              yield { role: 'tool', content: `${b.name}: ${detail}` };
            }
          }
        } else if (ev.type === 'result') {
          finalResult = ev;
        }
      }

      if (finalResult) {
        const ok = !finalResult.is_error && finalResult.subtype === 'success';
        const text = String(finalResult.result || '').replace(/\s+/g, ' ').slice(0, 100);
        return ok
          ? { state: 'completed', activity: `result: ${text}`, sessionRef }
          : { state: 'failed', activity: `error: ${text || stderr.slice(0, 100)}`, sessionRef };
      }
      return {
        state: 'failed',
        activity: `error: claude exited without a result${stderr ? `: ${stderr.slice(0, 120)}` : ''}`,
        sessionRef,
      };
    },
  };
}
