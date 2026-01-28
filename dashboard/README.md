# Dashboard Application

Web-based control center for Claude Project Manager.

## Overview

The dashboard provides a visual interface for:

- **Session Management** — Spawn, monitor, and control Claude Code sessions
- **Kanban Board** — Track features and tasks across projects
- **Resource Marketplace** — Discover and install MCP servers
- **Project Wizard** — Guided project setup with discovery chat

## Quick Start

```bash
npm install
npm run dev
```

Opens:
- **Frontend**: http://localhost:5173 (Vite)
- **API Server**: http://localhost:3100 (Express)

## Architecture

```
dashboard/
├── src/                        # React frontend
│   ├── App.tsx                 # Main component (1600+ lines)
│   ├── main.tsx                # Entry point
│   ├── index.css               # Global styles with design tokens
│   │
│   ├── components/
│   │   ├── Chat/               # Chat interface
│   │   │   ├── ChatView.tsx    # Main chat view
│   │   │   ├── ChatInput.tsx   # Message input
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MarkdownContent.tsx
│   │   │   ├── CommandPicker.tsx
│   │   │   ├── ToolCallCard.tsx
│   │   │   └── TodoList.tsx
│   │   │
│   │   ├── Dashboard/          # Session management
│   │   │   ├── SessionWindowsGrid.tsx (70KB)
│   │   │   ├── MiniSessionWindow.tsx
│   │   │   ├── KanbanQuickView.tsx
│   │   │   └── FloatingSessionsToggle.tsx
│   │   │
│   │   ├── Kanban/             # Task board
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   └── TaskDetailModal.tsx
│   │   │
│   │   ├── ProjectWizard/      # Setup wizard
│   │   ├── ProjectConfig/      # Configuration views
│   │   ├── Resources/          # Marketplace
│   │   └── Notifications/      # Alert center
│   │
│   ├── contexts/               # React contexts
│   │   ├── KanbanDataContext.tsx
│   │   ├── SessionStatusContext.tsx
│   │   ├── NotificationContext.tsx
│   │   └── SlashCommandsContext.tsx
│   │
│   ├── services/               # API client
│   │   └── api.ts              # REST API calls
│   │
│   └── types/                  # TypeScript types
│       ├── index.ts
│       ├── kanban.ts
│       └── notifications.ts
│
└── server/                     # Express backend
    ├── index.ts                # Server entry (3900+ lines)
    │
    ├── routes/
    │   ├── kanban.routes.ts    # Kanban API (45KB)
    │   ├── project.routes.ts   # Project management
    │   └── resources.routes.ts # Marketplace API
    │
    ├── services/
    │   ├── kanban.service.ts           # Board logic
    │   ├── session-spawner.service.ts  # Spawn sessions
    │   ├── orchestrator.service.ts     # Coordinate agents
    │   ├── project.service.ts          # Project operations
    │   ├── onboard.service.ts          # Onboarding flow
    │   ├── state.service.ts            # State persistence
    │   ├── yaml-task-writer.service.ts # YAML generation
    │   └── marketplace.service.ts      # Resource marketplace
    │
    └── types/                  # TypeScript types
```

## Tech Stack

| Technology     | Version | Purpose                    |
| -------------- | ------- | -------------------------- |
| React          | 19.2    | UI framework               |
| TypeScript     | 5.9     | Type safety                |
| Tailwind CSS   | 4.1     | Styling                    |
| Vite           | 7.2     | Build tool                 |
| Express        | 5.1     | API server                 |
| chokidar       | 4.0     | File watching              |
| react-markdown | 10.1    | Markdown rendering         |

## API Routes

### Sessions

| Route                      | Method | Description              |
| -------------------------- | ------ | ------------------------ |
| `/api/sessions`            | GET    | List all sessions        |
| `/api/sessions/:id`        | GET    | Get session details      |
| `/api/sessions/:id/kill`   | POST   | Kill a session           |
| `/api/sessions/:id`        | DELETE | Delete a session         |
| `/api/sessions/spawn`      | POST   | Spawn new session        |

### Kanban

| Route                                | Method | Description          |
| ------------------------------------ | ------ | -------------------- |
| `/api/kanban/:project/board`         | GET    | Get board state      |
| `/api/kanban/:project/tasks`         | GET    | List tasks           |
| `/api/kanban/:project/tasks`         | POST   | Create task          |
| `/api/kanban/:project/tasks/:id`     | PUT    | Update task          |
| `/api/kanban/:project/execute`       | POST   | Execute parallel     |

### Projects

| Route                                | Method | Description          |
| ------------------------------------ | ------ | -------------------- |
| `/api/projects`                      | GET    | List projects        |
| `/api/projects/create`               | POST   | Create project       |
| `/api/projects/:name/init`           | POST   | Initialize project   |
| `/api/projects/:name/features`       | GET    | List features        |

### Resources

| Route                          | Method | Description             |
| ------------------------------ | ------ | ----------------------- |
| `/api/resources/registry`      | GET    | Get MCP server registry |
| `/api/resources/marketplace`   | GET    | Browse marketplace      |
| `/api/resources/install`       | POST   | Install resource        |

### Streaming

| Route                      | Method | Description              |
| -------------------------- | ------ | ------------------------ |
| `/api/stream/sessions`     | GET    | SSE session updates      |
| `/api/stream/kanban`       | GET    | SSE kanban updates       |

## Development

### Scripts

```bash
npm run dev           # Start both frontend and backend
npm run dev:client    # Frontend only
npm run dev:server    # Backend only
npm run build         # Production build
npm run lint          # Run ESLint
```

### Environment

The server uses these directories:

```
~/.claude/projects/       # Claude Code sessions
~/.claude/session-names.json
~/.claude/session-order.json
~/.claude/project-order.json
```

### File Watching

The server watches for file changes in project directories:

- `plans/CURRENT.md` — Current work status
- `plans/features/` — Feature plans
- `plans/tasks/` — Task YAML files
- `QUESTIONS.yaml` — Onboarding questions

Changes trigger SSE updates to connected clients.

## Views

### Sessions View

The default view showing all Claude Code sessions:

- **Session Grid** — Displays session windows in a grid layout
- **Session Controls** — Spawn, kill, delete, rename sessions
- **Real-time Output** — Streams session output via SSE
- **Project Grouping** — Sessions grouped by project

### Kanban View

Task management board:

- **Columns** — Pending, In Progress, Blocked, QA, Completed
- **Task Cards** — Draggable with status indicators
- **Detail Modal** — Full task specifications
- **Execute All** — Trigger parallel agent execution

### Resources View

MCP server marketplace:

- **Registry** — Installed MCP servers
- **Marketplace** — Available resources
- **Installation** — One-click resource setup

### Project Wizard

Guided project setup:

- **Business Context** — Project name, description, goals
- **Feature Discovery** — Identify main features
- **Architecture** — Generate contracts and specs

## Design System

Styles use design tokens from `contracts/design-tokens.yaml`:

```css
/* Example usage in index.css */
:root {
  --color-primary-500: #3b82f6;
  --spacing-4: 1rem;
  --font-sans: 'Inter', sans-serif;
}
```

Components use Tailwind utilities mapped to these tokens.

## Contexts

### KanbanDataContext

Provides kanban board state and operations.

### SessionStatusContext

Tracks session statuses (running, stopped, etc.).

### NotificationContext

Manages application notifications.

### SlashCommandsContext

Provides available slash commands for autocomplete.

## Notes

- Sessions are discovered from `~/.claude/projects/`
- Real-time updates use Server-Sent Events (SSE)
- File operations use the `chokidar` library for watching
- The API proxies to port 3100 via Vite config
