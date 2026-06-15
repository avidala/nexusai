# NexusAI — architecture

NexusAI is a **local-first** app: a single Node process runs on your machine, serves a
React dashboard, stores data in local SQLite, and runs Claude Code agents. No cloud,
no auth, no external services.

```
  browser (React dashboard)
        │  REST + Server-Sent Events  (same origin)
        ▼
  server/  (one local process)
   ├─ store.mjs      SQLite via node:sqlite  → ~/.nexus/nexus.db
   ├─ events.mjs     SSE broadcaster (live updates to the dashboard)
   ├─ index.mjs      express: REST API, /api/events stream, serves the built UI
   └─ agent/
       ├─ run.mjs           orchestrates a session: pick executor, stream output
       │                    into the store + SSE, capture diffs, support stop
       ├─ executors/        claude-code (subscription) · claude (API key) · mock
       ├─ environment.mjs   scan real local folders + list models
       ├─ browse.mjs        native OS folder dialog (osascript on macOS)
       └─ changes.mjs       git baseline + diff → real per-session file changes
```

## Frontend

- `src/api/backend.js` — the only backend interface. REST for reads/writes, a single
  `EventSource` for live updates. No auth.
- `src/hooks/useAgentSessions.js` — sessions + messages, subscribes to SSE.
- `src/hooks/useRunnerEnvironment.js` — real folders + models from `/api/environment`.
- `src/hooks/useBrowseFolder.js` — calls `/api/browse` to open the native dialog.
- `src/pages/AgentView.jsx` + `src/components/agent-view/*` — the dashboard.

## Server / API

| Method | Path                          | Purpose                                  |
| ------ | ----------------------------- | ---------------------------------------- |
| GET    | `/api/environment`            | real local folders + available models    |
| GET    | `/api/sessions`               | list sessions                            |
| POST   | `/api/sessions`               | create a session (runs it if `working`)  |
| PATCH  | `/api/sessions/:id`           | update (state `working`→run, `stopped`→abort) |
| DELETE | `/api/sessions/:id`           | delete                                   |
| GET    | `/api/sessions/:id/messages`  | session messages                         |
| POST   | `/api/messages`               | append a message                         |
| POST   | `/api/browse`                 | open the native folder picker            |
| GET    | `/api/events`                 | SSE stream of `{entity,type,id,data}`    |

## Data model (SQLite)

- **sessions** — name, task, state (`working|needs_input|completed|failed|stopped`),
  pinned, activity, model, temperature, max_tokens, working_dir, tool_call_count,
  runner_session_ref (native agent session id, for resume), changed_files (JSON).
- **messages** — session_id, role (`user|assistant|tool|question`), content, ts.

## Agents

A dispatched session runs in-process via an **executor**:

- **claude-code** (default) — drives the local Claude Code CLI headlessly under your
  subscription. Honors the chosen model, resumes prior sessions on reply, opens no MCP
  servers. No API key.
- **claude** — a self-contained agentic loop via `@anthropic-ai/sdk` (`ANTHROPIC_API_KEY`).
- **mock** — scripted output, no credentials (for development).

After each turn the server computes the real git diff in the working dir and stores it
on the session, so the dashboard's Files tab shows actual changes.
