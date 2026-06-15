# Claude Agents — Mission Control Dashboard

A dark, real-time mission control UI for monitoring, directing, and debugging Claude agent sessions.

## Features

- **Real-time session list** — See all running, waiting, completed, and stopped agent sessions at a glance
- **Live activity feed** — Every tool call, bash command, and file edit streamed in real time
- **Reply & unblock** — Respond directly to agents that need human input
- **Stop & Resume** — Pause any running session and pick back up where it left off
- **File Diff Viewer** — VS Code-style side-by-side diff for every changed file in a session
- **Full observability** — Model, temperature, token count, working directory, tool call count per session
- **Multi-agent dispatch** — Launch many parallel agent sessions from the command bar
- **Configurable defaults** — Set model, working directory, temperature, and concurrency limits globally

## Tech Stack

- **Frontend** — React + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend** — REST API + real-time subscriptions + auth
- **Auth** — Email/password + Google OAuth

## Getting Started

1. Clone the repo
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`

## Architecture

```
src/
├── pages/
│   ├── Landing.jsx          # Public landing page
│   ├── AgentView.jsx        # Main dashboard (protected)
│   ├── Login.jsx
│   ├── Register.jsx
│   └── ...
├── components/agent-view/
│   ├── AgentHeader          # Top nav bar with stats
│   ├── AgentSidebar         # Filter sidebar
│   ├── AgentSessionList     # Session grid
│   ├── AgentDetailPanel     # Right-side detail panel
│   ├── FileDiffViewer       # Side-by-side diff view
│   ├── DispatchBar          # Command input bar
│   └── ...
├── hooks/
│   └── useAgentSessions.js  # Data layer & real-time sync
└── entities/
    ├── AgentSession.json    # Session schema
    └── AgentMessage.json    # Message schema
```

## Data Model

### AgentSession
| Field | Type | Description |
|-------|------|-------------|
| name | string | Short session name |
| task | string | Full task prompt |
| state | enum | working / needs_input / completed / failed / stopped |
| model | string | LLM model used |
| tool_call_count | integer | Number of tool calls made |
| working_dir | string | Agent's working directory |
| started_at | datetime | Session start time |

### AgentMessage
| Field | Type | Description |
|-------|------|-------------|
| session_id | string | Parent session ID |
| role | enum | user / assistant / tool / question |
| content | string | Message text |
| ts | datetime | Message timestamp |

## License

MIT