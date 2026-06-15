// claude executor — a real agentic loop on the user's machine using the official
// Anthropic SDK and the client-side `bash` tool. Claude emits shell commands; the
// runner executes them in the session's working_dir and feeds results back, so the
// agent can read, edit, run tests, and use git against the user's actual repo.
//
// ⚠️ this runs model-chosen shell commands on the host. it only activates when the
// user sets ANTHROPIC_API_KEY, runs on the user's own machine against their own
// repos, and is scoped to working_dir. treat the machine as the trust boundary.
import Anthropic from '@anthropic-ai/sdk';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';

const pexecFile = promisify(execFile);
const MODEL = 'claude-opus-4-8';
const MAX_STEPS = 40;

// expand a leading ~ and fall back to the user's home directory
function resolveDir(dir) {
  if (!dir || dir === '~') return homedir();
  if (dir.startsWith('~/')) return dir.replace(/^~/, homedir());
  return dir;
}

// run a model-chosen command string in a shell, but pass it as a single argv to
// `bash -lc` rather than interpolating it into a shell string ourselves.
async function runBash(command, cwd) {
  try {
    const { stdout, stderr } = await pexecFile('bash', ['-lc', command], {
      cwd,
      timeout: 120000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return (stdout || '') + (stderr ? `\n[stderr]\n${stderr}` : '');
  } catch (err) {
    return `command failed: ${err.message}\n${err.stdout || ''}${err.stderr || ''}`;
  }
}

export function claudeExecutor({ apiKey = process.env.ANTHROPIC_API_KEY } = {}) {
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required for the claude executor');
  const client = new Anthropic({ apiKey });

  return {
    async *run(session, { history = [], isContinuation = false, userInput, signal } = {}) {
      const cwd = resolveDir(session.working_dir);
      const system =
        `You are a coding agent working on the user's machine in ${cwd}. ` +
        `Use the bash tool to inspect and modify the repository, run tests, and use git. ` +
        `Work autonomously toward the task; when it is done, stop and summarize what you changed.`;

      // this executor is stateless across runs, so on a reply we replay the prior
      // conversation as context and lead with the user's latest message
      const messages = [
        {
          role: 'user',
          content:
            `Task: ${session.task}\n\n` +
            (history.length
              ? `Prior conversation:\n${history.map((m) => `${m.role}: ${m.content}`).join('\n')}\n\n`
              : '') +
            (isContinuation ? `The user just replied: "${userInput}". Continue from here.` : ''),
        },
      ];

      const tools = [{ type: 'bash_20250124', name: 'bash' }];

      const model = session.model || MODEL; // honor the per-session model
      for (let step = 0; step < MAX_STEPS; step += 1) {
        if (signal?.aborted) return { state: 'stopped', activity: 'stopped by user' };
        const res = await client.messages.create(
          {
            model,
            max_tokens: 16000,
            thinking: { type: 'adaptive' },
            output_config: { effort: 'high' },
            system,
            tools,
            messages,
          },
          { signal },
        );

        // surface assistant text to the dashboard
        for (const block of res.content) {
          if (block.type === 'text' && block.text.trim()) {
            yield { role: 'assistant', content: block.text.trim() };
          }
        }
        // preserve the full assistant turn (incl. thinking + tool_use) for the next request
        messages.push({ role: 'assistant', content: res.content });

        if (res.stop_reason !== 'tool_use') {
          const summary =
            res.content.find((b) => b.type === 'text')?.text?.trim() || 'Task complete.';
          return { state: 'completed', activity: `result: ${summary.slice(0, 100)}` };
        }

        // execute each requested bash command in the working dir
        const toolResults = [];
        for (const block of res.content) {
          if (block.type !== 'tool_use' || block.name !== 'bash') continue;
          const command = block.input?.command ?? '';
          yield { role: 'tool', content: `Bash: ${command}` };
          const output = await runBash(command, cwd);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: output.slice(0, 30000) || '(no output)',
          });
        }
        messages.push({ role: 'user', content: toolResults });
      }

      return { state: 'needs_input', activity: 'paused: hit step limit, awaiting guidance' };
    },
  };
}
