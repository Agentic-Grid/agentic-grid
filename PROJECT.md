# Claude Project Manager

> AI-Native Development Platform — Web dashboard and multi-agent framework for managing software projects with Claude Code.

## Overview

Claude Project Manager is a development platform that provides:

1. **Web Dashboard** — Real-time project management UI
2. **Multi-Agent Framework** — Specialized AI agents working in parallel
3. **Contract-First Architecture** — YAML contracts as source of truth

## Tech Stack

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| Backend  | Node.js 22, Express 5, TypeScript    |
| Build    | Vite 7, ESLint, Prettier             |
| Runtime  | Concurrent dev servers               |

## Quick Start

```bash
# Install and run
cd dashboard
npm install
npm run dev

# Open dashboard
open http://localhost:5173
```

## Project Structure

```
├── dashboard/                  # Web application
│   ├── src/                    # React frontend
│   └── server/                 # Express backend
│
├── .claude/                    # Claude Code configuration
│   ├── agents/                 # Agent specifications
│   ├── commands/               # Slash commands
│   └── skills/                 # Domain knowledge
│
├── contracts/                  # Interface contracts
├── plans/                      # Development tracking
├── templates/                  # Project scaffolding
├── scripts/                    # Automation
└── resources/                  # Requirements & references
```

## Key Features

### Dashboard Views
- **Sessions** — Monitor and control Claude Code sessions
- **Kanban** — Track tasks with drag-and-drop boards
- **Resources** — MCP server marketplace
- **Project Wizard** — Guided project setup

### Agent System
- DISCOVERY — Requirements gathering
- DESIGNER — Design tokens and UI specs
- FRONTEND — React components
- BACKEND — Express APIs
- DATA — Database schemas
- DEVOPS — Deployment configuration
- QA — Validation (mandatory)
- PLANNER — Architecture generation
- TASK-MASTER — Specification validation

### Commands
- `/work [task]` — Auto-detect agents and execute
- `/parallel` — Run agents concurrently
- `/onboard` — Project setup
- `/status` — Check progress
- `/qa` — Validate work

## Development Workflow

1. **Describe what you want** — Framework detects required agents
2. **Agents run in parallel** — Phase 1: DESIGNER + DATA, Phase 2: BACKEND + FRONTEND
3. **QA validates** — Mandatory before completion
4. **Commit and push** — `/commit-push-pr`

## Configuration

- `CLAUDE.md` — Core agent configuration
- `CLAUDE.local.md` — Personal overrides (gitignored)
- `.claude/settings.json` — Permissions and hooks
- `contracts/*.yaml` — Interface contracts
- `plans/CURRENT.md` — Active work status

## Links

- [Full Documentation](README.md)
- [Quick Start](QUICKSTART.md)
- [Commands Reference](COMMANDS.md)

---

_This project uses the Multi-Agent Development Framework. See README.md for details._
