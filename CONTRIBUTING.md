# Contributing to NexusAI

Thanks for your interest! NexusAI is a **local-first** tool — it runs entirely on the
user's machine with no cloud, no auth, and no external services. Please keep changes
aligned with that principle.

## Prerequisites

- **Node.js ≥ 22.5** (uses the built-in `node:sqlite`)
- [Claude Code](https://docs.claude.com/claude-code) installed and logged in, or an
  `ANTHROPIC_API_KEY` (`NEXUS_EXECUTOR=claude`)

## Development setup

```sh
git clone https://github.com/avidala/nexusai.git
cd nexusai
npm install
```

Run it two ways:

```sh
# hot-reload dev — two terminals
npm run dev          # dashboard (vite) on :5173, proxies /api → :4317
npm run dev:server   # the local server/API on :4317

# or production-style (server serves the built UI, opens the browser)
npm run build && npm start
```

Tip: `NEXUS_EXECUTOR=mock` runs scripted agents with no credentials — handy for UI work.

## Project layout

```
server/                local Node server (the backend + agent host)
  index.mjs            express: REST API, SSE stream, serves the built UI
  store.mjs            SQLite store (node:sqlite)
  events.mjs           SSE broadcaster
  agent/
    run.mjs            orchestrates a session run
    executors/         claude-code · claude · mock
    environment.mjs    scans real local folders + lists models
    browse.mjs         native OS folder dialog
    changes.mjs        git diff capture
src/                   React dashboard (Vite)
  api/backend.js       the single backend interface (REST + SSE)
  hooks/               useAgentSessions, useRunnerEnvironment, useBrowseFolder
  components/agent-view, pages/AgentView.jsx
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full picture.

## Adding an agent executor

An executor is an object with an async-generator `run(session, opts)`:

- **yields** `{ role: 'assistant' | 'tool' | 'question', content }` for each step
- **returns** `{ state, activity, sessionRef? }` when the turn ends
- honors `opts.signal` (AbortSignal) so **Stop** works, and `opts.userInput` /
  `opts.resumeRef` so replies continue the conversation

Drop it in `server/agent/executors/`, wire it into `makeExecutor()` in
`server/agent/run.mjs`, and select it with `NEXUS_EXECUTOR`.

## Before you open a PR

- `npm run lint` is clean (`npm run lint:fix` to autofix)
- `npm run build` succeeds
- The app runs end-to-end (dispatch a task with `NEXUS_EXECUTOR=mock`)
- Keep PRs small and focused; comments lowercase and matching the surrounding style

## Guidelines

- **Stay local-first.** No required cloud services, accounts, or telemetry.
- Cross-platform is welcome — note that the native folder picker is macOS-only today
  (`server/agent/browse.mjs`); Windows/Linux support is a good first contribution.

## Reporting issues

Open an issue at https://github.com/avidala/nexusai/issues with your OS, Node version,
how you ran it, and steps to reproduce.

By contributing, you agree your contributions are licensed under the [MIT License](./LICENSE).
