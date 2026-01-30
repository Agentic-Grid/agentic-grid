# AgenticGrid

> **AI-Native Development Platform** — A web dashboard and multi-agent framework for managing software projects with Claude Code.

AgenticGrid is a complete development platform that combines:

1. **Web Dashboard** — Real-time project management UI with session control, Kanban boards, and resource marketplace
2. **Multi-Agent Framework** — Specialized AI agents (Designer, Frontend, Backend, Data, DevOps, QA) working in parallel
3. **Contract-First Architecture** — YAML-based contracts as the single source of truth between agents

---

## What is This?

AgenticGrid provides a **web-based control center** for AI-assisted software development. Instead of managing Claude Code sessions manually in separate terminals, you get:

- **Session Management** — Spawn, monitor, and control multiple Claude Code sessions from one dashboard
- **Project Kanban** — Track features and tasks across your projects with drag-and-drop boards
- **Parallel Execution** — Run multiple AI agents concurrently on different parts of your project
- **Real-Time Updates** — SSE-powered live updates as agents complete work
- **Resource Marketplace** — Discover and install MCP servers and development resources

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WEB DASHBOARD                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │   Sessions   │ │    Kanban    │ │  Resources   │ │   Config    │ │
│  │    Grid      │ │    Board     │ │  Marketplace │ │   Wizard    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
│                              │                                       │
│                     React 19 + Tailwind 4                           │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ SSE + REST
┌─────────────────────────────────┴───────────────────────────────────┐
│                        EXPRESS SERVER                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │   Session    │ │    Kanban    │ │  Orchestrator│ │  Resource   │ │
│  │   Spawner    │ │   Service    │ │   Service    │ │  Discovery  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────┴───────────────────────────────────┐
│                     CLAUDE CODE SESSIONS                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │   DESIGNER   │ │   FRONTEND   │ │   BACKEND    │ │    DATA     │ │
│  │    Agent     │ │    Agent     │ │    Agent     │ │   Agent     │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/Agentic-Grid/agentic-grid.git
cd agentic-grid/dashboard
npm install

# 2. Start the dashboard
npm run dev

# 3. Open in browser
open http://localhost:5173
```

The dashboard runs on port 5173 (Vite) with the API server on port 3100.

---

## Features

### Dashboard UI

- **Session Windows Grid** — View and control multiple Claude Code sessions simultaneously
- **Project Kanban Board** — Drag-and-drop task management with status columns
- **New Project Wizard** — Guided project setup with discovery chat
- **Resource Marketplace** — Browse and install MCP servers
- **Real-Time Notifications** — Live updates on session and task changes

### Multi-Agent System

The framework provides 9 specialized AI agents:

| Agent       | Purpose                                                 |
| ----------- | ------------------------------------------------------- |
| DISCOVERY   | Requirements gathering, user research, project scoping  |
| DESIGNER    | Design tokens, UI specs, component specifications       |
| FRONTEND    | React components, UI implementation                     |
| BACKEND     | Express APIs, business logic, TypeScript types          |
| DATA        | PostgreSQL schemas, migrations, query optimization      |
| DEVOPS      | Docker, CI/CD, deployment configuration                 |
| QA          | Validation, testing, security and accessibility checks  |
| PLANNER     | Architecture design, contract generation, task planning |
| TASK-MASTER | Task coordination and specification validation          |

### Contract-First Development

All agents share contracts as the source of truth:

| Contract File          | Purpose                         |
| ---------------------- | ------------------------------- |
| `design-tokens.yaml`   | Colors, typography, spacing     |
| `api-contracts.yaml`   | API endpoints, request/response |
| `database-contracts.yaml` | Tables, indexes, queries     |
| `infra-contracts.yaml` | Environment, deployment config  |

---

## Project Structure

```
agentgrid/
├── dashboard/                  # Web application
│   ├── src/                    # React frontend
│   │   ├── components/         # UI components
│   │   │   ├── Chat/           # Chat interface
│   │   │   ├── Dashboard/      # Session grid, Kanban widget
│   │   │   ├── Kanban/         # Board, cards, modals
│   │   │   ├── ProjectWizard/  # Setup wizard
│   │   │   ├── Resources/      # Marketplace UI
│   │   │   └── Notifications/  # Alert center
│   │   ├── contexts/           # React contexts
│   │   ├── services/           # API client
│   │   └── types/              # TypeScript types
│   │
│   └── server/                 # Express backend
│       ├── routes/             # API routes
│       │   ├── kanban.routes.ts
│       │   ├── project.routes.ts
│       │   └── resources.routes.ts
│       └── services/           # Business logic
│           ├── session-spawner.service.ts
│           ├── kanban.service.ts
│           ├── orchestrator.service.ts
│           └── marketplace.service.ts
│
├── .claude/                    # Claude Code configuration
│   ├── settings.json           # Permissions & hooks
│   ├── agents/                 # Agent specifications (9 agents)
│   ├── commands/               # Slash commands (15 commands)
│   └── skills/                 # Domain knowledge (10 skills)
│
├── contracts/                  # Source of truth
│   ├── design-tokens.yaml      # Premium design system
│   ├── api-contracts.yaml
│   ├── database-contracts.yaml
│   └── infra-contracts.yaml
│
├── plans/                      # Development tracking
│   ├── CURRENT.md              # Active work status
│   ├── features/               # Feature plans
│   └── tasks/                  # Task YAML files
│
├── templates/                  # Project scaffolding
│   ├── tasks/                  # Task templates
│   ├── features/               # Feature templates
│   ├── contracts/              # Contract templates
│   └── requirements/           # PRD templates
│
├── scripts/                    # Automation
│   ├── verify-contracts.sh
│   ├── check-workflow.sh
│   └── post-check.sh
│
└── resources/                  # Project requirements
    ├── requirements/           # Mandatory specs
    └── references/             # Visual inspiration
```

---

## Tech Stack

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| Backend  | Node.js 22, Express 5, TypeScript    |
| Build    | Vite 7, ESLint, Prettier             |
| Runtime  | Concurrent dev servers (Vite + Express) |

---

## Slash Commands

When working in Claude Code, these commands are available:

| Command           | Purpose                                       |
| ----------------- | --------------------------------------------- |
| `/work [task]`    | Auto-detect agents and execute (default)      |
| `/parallel`       | Run multiple agents concurrently              |
| `/onboard`        | Project setup with discovery questions        |
| `/designer`       | Activate design agent                         |
| `/frontend`       | Activate frontend agent                       |
| `/backend`        | Activate backend agent                        |
| `/data`           | Activate database agent                       |
| `/devops`         | Activate infrastructure agent                 |
| `/qa`             | Validate implementation (mandatory)           |
| `/status`         | Show current project state                    |
| `/verify`         | Check contracts match implementation          |
| `/commit-push-pr` | Commit, push, and create PR                   |
| `/planner`        | Generate architecture and specifications      |
| `/task-master`    | Validate task specifications                  |

---

## Auto-Detect + Parallel Execution

The framework automatically detects which agents are needed and runs them in parallel:

```
USER REQUEST: "Create user profile page"
    │
    ▼
DETECT AGENTS: DESIGNER, DATA, BACKEND, FRONTEND
    │
    ▼
PHASE 1 (parallel):  DESIGNER + DATA
    │
    ▼
PHASE 2 (parallel):  BACKEND + FRONTEND
    │
    ▼
PHASE 3 (sequential): QA validation
```

Keywords in your request determine which agents activate:

| Keywords                                    | Agent    |
| ------------------------------------------- | -------- |
| design, colors, UI specs, typography        | DESIGNER |
| component, React, frontend, page            | FRONTEND |
| API, endpoint, route, backend, Express      | BACKEND  |
| database, schema, migration, model          | DATA     |
| Docker, deploy, CI/CD, infrastructure       | DEVOPS   |
| test, validate, QA, verify                  | QA       |

---

## Dashboard Views

### Sessions View

Monitor and control Claude Code sessions across projects:
- Spawn new sessions
- View session output in real-time
- Kill or delete sessions
- Rename sessions for organization

### Kanban Board

Project task management:
- Columns: Pending, In Progress, Blocked, QA, Completed
- Drag-and-drop task cards
- Task detail modals with full specifications
- Parallel execution controls

### Resources Marketplace

Discover and install development resources:
- MCP server registry
- Resource installation workflow
- Configuration management

### Project Wizard

Guided project setup:
- Business context questions
- Feature-specific clarifications
- Architecture and contract generation

---

## Development

### Running the Dashboard

```bash
cd dashboard
npm install
npm run dev
```

This runs both servers concurrently:
- **Vite** (frontend): http://localhost:5173
- **Express** (API): http://localhost:3100

### API Routes

| Route                    | Purpose                     |
| ------------------------ | --------------------------- |
| `/api/kanban/*`          | Kanban board operations     |
| `/api/projects/*`        | Project management          |
| `/api/resources/*`       | Resource marketplace        |
| `/api/sessions/*`        | Session management          |
| `/api/stream/*`          | SSE real-time updates       |

---

## Configuration Files

| File                      | Purpose                            |
| ------------------------- | ---------------------------------- |
| `CLAUDE.md`               | Core agent configuration           |
| `CLAUDE.local.md`         | Personal overrides (gitignored)    |
| `.claude/settings.json`   | Permissions and hooks              |
| `contracts/*.yaml`        | Interface contracts                |
| `plans/CURRENT.md`        | Active work status                 |

---

## Goals and Ambitions

**Current Focus:**
- Provide a visual control center for AI-assisted development
- Enable parallel agent execution for faster development
- Maintain contracts as the single source of truth
- Track all work in a Kanban-style board

**Future Direction:**
- Multi-project orchestration
- Team collaboration features
- Advanced resource marketplace
- Custom agent creation UI
- Integration with more AI providers

---

## Open Source & Contributing

AgenticGrid is an **open source project** and everyone is welcome to collaborate, contribute, and help evolve it.

### How to Contribute

1. **Fork the repository** and create your feature branch
2. **Make your changes** following the project conventions
3. **Test your changes** — run the dashboard and verify functionality
4. **Submit a Pull Request** with a clear description of what you've done

### Contribution Ideas

- **New Agents** — Create specialized agents for specific domains
- **New Skills** — Add domain knowledge packs for frameworks/technologies
- **Dashboard Features** — Improve the UI/UX, add new views
- **Bug Fixes** — Found something broken? Fix it!
- **Documentation** — Help improve guides and examples
- **Templates** — Create templates for common project types

### Code Guidelines

- Use TypeScript with strict mode
- Follow existing code patterns and conventions
- Keep components focused and reusable
- Update contracts when adding new interfaces
- Add comments for complex logic

### Reporting Issues

- Use GitHub Issues for bug reports and feature requests
- Include steps to reproduce for bugs
- Describe expected vs actual behavior
- Add screenshots for UI issues

---

## Creating Custom Resources

AgenticGrid is designed to be extensible. You can create new agents, skills, and commands.

### Creating a New Agent

Agents are specialized AI personas with specific workflows. Create a new agent in `.claude/agents/`:

```markdown
<!-- .claude/agents/my-agent.md -->

# MY-AGENT

> Description of what this agent does

## Role
Define the agent's responsibilities and expertise.

## Workflow
1. Step one
2. Step two
3. Step three

## Inputs
- What this agent needs to start work

## Outputs
- What this agent produces

## Quality Checklist
- [ ] Validation criteria
- [ ] Quality gates
```

**Agent conventions:**
- Name in UPPERCASE (e.g., DESIGNER, FRONTEND)
- Clear workflow with numbered steps
- Defined inputs and outputs
- Quality checklist for validation

### Creating a New Skill

Skills are domain knowledge packs that get loaded when relevant. Create a new skill in `.claude/skills/`:

```
.claude/skills/my-skill/
├── SKILL.md           # Main skill file (required)
└── examples/          # Optional examples
    └── example.ts
```

**SKILL.md format:**

```markdown
---
name: my-skill
description: When to load this skill (triggers auto-loading)
allowed-tools: Read, Write, Edit, Bash
---

# My Skill

## Overview
What this skill provides.

## Patterns

### Pattern 1: Name
Description and code example.

### Pattern 2: Name
Description and code example.

## Best Practices
- Practice 1
- Practice 2

## Anti-Patterns
- What to avoid
```

**Skill conventions:**
- Frontmatter with name, description, and allowed-tools
- Description should include keywords that trigger auto-loading
- Include practical patterns with code examples
- Document best practices and anti-patterns

### Creating a New Command

Commands are slash commands that users invoke directly. Create a new command in `.claude/commands/`:

```markdown
<!-- .claude/commands/my-command.md -->

---
description: What this command does
allowed-tools: Read, Write, Edit, Bash
---

# /my-command

## Purpose
What this command accomplishes.

## Usage
```
/my-command [arguments]
```

## Workflow
1. What happens when invoked
2. Steps the command takes
3. Expected output

## Arguments
- `arg1` — Description
- `arg2` — Description

User input: $ARGUMENTS
```

**Command conventions:**
- Frontmatter with description and allowed-tools
- Clear usage example
- Documented workflow
- Use `$ARGUMENTS` to access user input

### Creating Contract Templates

Contracts define interfaces between agents. Create templates in `templates/contracts/`:

```yaml
# templates/contracts/my-contract.yaml

# Description of what this contract defines
version: "1.0"

# Define your schema
entities:
  MyEntity:
    fields:
      id: string
      name: string
      created_at: timestamp

# Define endpoints, patterns, etc.
```

### Directory Structure for Custom Resources

```
.claude/
├── agents/
│   ├── designer.md          # Built-in agent
│   ├── frontend.md          # Built-in agent
│   └── my-custom-agent.md   # Your custom agent
│
├── commands/
│   ├── work.md              # Built-in command
│   ├── qa.md                # Built-in command
│   └── my-command.md        # Your custom command
│
└── skills/
    ├── design-system/       # Built-in skill
    ├── api-patterns/        # Built-in skill
    └── my-skill/            # Your custom skill
        └── SKILL.md
```

### Testing Custom Resources

1. **Agents** — Invoke directly with `/my-agent` and verify workflow
2. **Skills** — Check auto-loading by using related keywords
3. **Commands** — Run the command and verify expected behavior

### Sharing Resources

Consider contributing useful resources back to the project:
- Agents for specific tech stacks (Rails, Django, etc.)
- Skills for frameworks (Next.js, Prisma, etc.)
- Commands for common workflows

---

## License

MIT — Use it, modify it, share it.
