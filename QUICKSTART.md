# Quick Start Guide

Get the Claude Project Manager dashboard running in under 5 minutes.

---

## Prerequisites

- Node.js 22+
- npm or pnpm
- Claude Code CLI installed

---

## Step 1: Install Dependencies

```bash
cd dashboard
npm install
```

---

## Step 2: Start the Dashboard

```bash
npm run dev
```

This starts two servers concurrently:
- **Vite** (React frontend): http://localhost:5173
- **Express** (API server): http://localhost:3100

---

## Step 3: Open the Dashboard

Open your browser to http://localhost:5173

You'll see the Sessions view with any existing Claude Code sessions.

---

## Dashboard Views

### Sessions (Default View)

The main dashboard shows all Claude Code sessions:
- **Session Grid** — View multiple sessions at once
- **Spawn Session** — Start a new Claude Code session for a project
- **Session Controls** — Kill, delete, or rename sessions

### Kanban Board

Navigate to the Kanban view to manage project tasks:
- View tasks across status columns (Pending, In Progress, QA, Completed)
- Click task cards to see full details
- Use "Execute All" for parallel agent execution

### Resources

Browse and manage MCP servers and development resources.

### Project Wizard

Create new projects with guided setup:
1. Business context questions
2. Feature identification
3. Architecture and contract generation

---

## Using Claude Code with the Framework

### In a Project Directory

When working in a project using this framework, these commands are available:

```bash
# Start working on a task (auto-detects agents)
/work Create user authentication

# Check current status
/status

# Run QA validation
/qa

# Commit and create PR
/commit-push-pr
```

### Key Files to Know

| File                 | Purpose                          |
| -------------------- | -------------------------------- |
| `plans/CURRENT.md`   | Current work status (read first) |
| `contracts/*.yaml`   | Interface contracts              |
| `.claude/agents/*.md`| Agent specifications             |

---

## Common Commands

### Dashboard Server

```bash
# Development mode (frontend + backend)
npm run dev

# Frontend only
npm run dev:client

# Backend only
npm run dev:server

# Production build
npm run build
```

### Project Commands (in Claude Code)

```bash
/work [task]      # Auto-detect agents and execute
/parallel [task]  # Run agents in parallel
/onboard          # Start project setup
/status           # Check progress
/qa               # Validate work
```

---

## Troubleshooting

### Port Already in Use

If port 3100 or 5173 is busy:
```bash
# Kill existing processes
lsof -ti:3100 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Sessions Not Loading

Ensure the Claude Code CLI is installed and sessions exist in `~/.claude/projects/`.

### Real-Time Updates Not Working

Check that SSE endpoints are accessible at `/api/stream/*`.

---

## Next Steps

1. **Explore the dashboard** — Try all views (Sessions, Kanban, Resources)
2. **Create a project** — Use the Project Wizard
3. **Read the docs** — See README.md for full documentation
4. **Customize agents** — Edit `.claude/agents/*.md` for your workflow

---

## File Structure Quick Reference

```
dashboard/
├── src/                    # React frontend
│   ├── App.tsx             # Main component
│   ├── components/         # UI components
│   └── services/api.ts     # API client
│
└── server/                 # Express backend
    ├── index.ts            # Server entry
    ├── routes/             # API routes
    └── services/           # Business logic
```

---

Need help? See the full documentation in README.md.
