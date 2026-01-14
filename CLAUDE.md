# CLAUDE.md

## HONESTY > EVERYTHING

- Say "I don't know" — never invent
- Ask when unclear — never assume
- Admit limits — never fake competence
- Raw truth — never satisfying narrative

---

## DEFAULT MODE: Auto-Select + Parallel Execution

**Every request is automatically analyzed to:**

1. **Detect required agents** — Parse task to identify all agents needed
2. **Run in parallel** — Execute independent agents concurrently via Task tool
3. **Sequence dependencies** — Only run sequentially when output is needed as input

```
USER REQUEST
    │
    ▼
┌─────────────────────────────────────┐
│  ANALYZE: What agents are needed?   │
│  • Keywords → Agent mapping          │
│  • Dependencies → Execution order    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  PARALLEL PHASE 1 (if applicable)   │
│  DESIGNER ──┬── DATA ──┬── DEVOPS   │
│  (no deps)  │ (no deps)│ (no deps)  │
└─────────────┴──────────┴────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  PARALLEL PHASE 2 (needs Phase 1)   │
│  BACKEND ────────┬──── FRONTEND     │
│  (needs DATA)    │ (needs DESIGNER) │
└──────────────────┴──────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  QA VALIDATION (always last)        │
└─────────────────────────────────────┘
```

## Auto-Detection Rules

| Keywords in Request                           | Agent(s) Detected |
| --------------------------------------------- | ----------------- |
| design, colors, UI specs, typography, spacing | DESIGNER          |
| component, React, frontend, UI implementation | FRONTEND          |
| API, endpoint, route, backend, Express        | BACKEND           |
| database, schema, migration, model, query     | DATA              |
| Docker, deploy, CI/CD, infrastructure         | DEVOPS            |
| test, validate, QA, check, verify             | QA                |

**Multi-keyword = Multi-agent = Parallel execution**

Examples:

- "Create user profile page" → DESIGNER + DATA (parallel) → BACKEND + FRONTEND (parallel) → QA
- "Add login API endpoint" → DATA → BACKEND → QA
- "Style the dashboard" → DESIGNER → FRONTEND → QA

## Execution Protocol

### For ANY Request:

```
1. ANALYZE request → List all agents needed
2. IDENTIFY dependencies → Which agents need others' output?
3. GROUP into phases → Independent agents = same phase (parallel)
4. EXECUTE phases → Use Task tool for parallel, sequential for deps
5. QA VALIDATE → Always run QA at the end
```

### Single Agent Tasks:

- Route directly to agent via `/[agent]` command
- Follow that agent's workflow

### Multi-Agent Tasks (DEFAULT):

- Use `/parallel [task]` or invoke Task tool directly
- Spawn independent agents concurrently
- Merge outputs between phases

## Parallel Execution Patterns

| Request Type | Phase 1 (Parallel) | Phase 2 (Parallel) | Phase 3 |
| ------------ | ------------------ | ------------------ | ------- |
| Full feature | DESIGNER + DATA    | BACKEND + FRONTEND | QA      |
| New page     | DESIGNER + DATA    | FRONTEND + BACKEND | QA      |
| API feature  | DATA               | BACKEND            | QA      |
| UI-only      | DESIGNER           | FRONTEND           | QA      |
| Infra change | DEVOPS             | -                  | QA      |

## Rules

- **Auto-select agents** — Never ask "which agent?" — detect from keywords
- **Parallel by default** — Use Task tool for concurrent execution
- **Contracts are truth** — Read before implementing, update after changes
- **No hardcoded values** — Colors/spacing from `design-tokens.yaml`
- **QA is mandatory** — Run `/qa` before any work is "done"

## Agent Commands (for single-agent tasks)

| Agent        | Command      | Use When                        |
| ------------ | ------------ | ------------------------------- |
| DISCOVERY    | `/discovery` | Requirements gathering only     |
| DESIGNER     | `/designer`  | Design-only task                |
| FRONTEND     | `/frontend`  | Frontend-only task              |
| BACKEND      | `/backend`   | Backend-only task               |
| DATA         | `/data`      | Database-only task              |
| DEVOPS       | `/devops`    | Infrastructure-only task        |
| QA           | `/qa`        | Validation (always run)         |
| **PARALLEL** | `/parallel`  | **Multi-agent tasks (DEFAULT)** |

## Stack

Node 22 · TypeScript · React 19 · Tailwind 4 · Express · PostgreSQL · Docker

## Key Files

```
plans/CURRENT.md      — Read first
contracts/*.yaml      — Source of truth
.claude/agents/*.md   — Agent workflows
```

## Quick Reference

```
User says anything → Auto-detect agents → Run in parallel → QA
```

**No manual agent selection needed. Framework handles routing automatically.**
