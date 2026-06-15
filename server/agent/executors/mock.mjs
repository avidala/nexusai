// mock executor — scripted agent output, no api key needed. lets you exercise
// the full dashboard ↔ runner ↔ db loop locally before wiring real claude.

// resolves after ms, or rejects immediately if the signal aborts
const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('aborted'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new Error('aborted')); }, { once: true });
  });

export function mockExecutor({ delayMs = 400 } = {}) {
  return {
    async *run(session, { isContinuation = false, userInput, signal } = {}) {
      if (isContinuation) {
        // a reply came in — acknowledge it and continue rather than restart
        yield { role: 'assistant', content: `Got it: "${userInput}". Continuing…` };
        await sleep(delayMs, signal);
        yield { role: 'tool', content: 'Bash: npm test' };
        await sleep(delayMs, signal);
        yield { role: 'assistant', content: 'Applied your feedback. Done.' };
        return { state: 'completed', activity: 'result: applied reply' };
      }
      yield { role: 'assistant', content: `Starting on: ${session.task}` };
      await sleep(delayMs, signal);
      yield { role: 'tool', content: 'Read package.json' };
      await sleep(delayMs, signal);
      yield { role: 'tool', content: 'Bash: npm test' };
      await sleep(delayMs, signal);
      // ask a question so the reply path is exercisable from the dashboard
      yield { role: 'question', content: 'Should I also add a CI workflow?' };
      return { state: 'needs_input', activity: 'awaiting your input' };
    },
  };
}
