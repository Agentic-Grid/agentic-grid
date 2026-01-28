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

---

## Work Documentation (Auto-Track in Kanban)

**IMPORTANT:** When receiving a feature request, bug fix, or enhancement, always document it in the Kanban board before starting work.

### Auto-Documentation Protocol

For any non-trivial work request:

1. **Create a work item** in the project's Kanban board
2. **Track progress** by updating task status as you work
3. **Log completion** when the work is done

### File-Based Task Creation

Create tasks directly in the file system at:

```
sandbox/{project-name}/plans/features/{FEAT-XXX-slug}/tasks/TASK-XXX.yaml
```

### Task YAML Template

```yaml
id: TASK-XXX
feature_id: FEAT-XXX
title: "Brief description of work"
agent: FRONTEND # DISCOVERY | DESIGNER | DATA | BACKEND | FRONTEND | DEVOPS | QA
status: pending # pending | in_progress | blocked | qa | completed
priority: medium # high | medium | low
type: implementation # design | implementation | validation | research
phase: 1

# What files will be modified
files:
  - path/to/file1.ts
  - path/to/file2.tsx

# Detailed instructions
instructions: |
  ## Objective
  What needs to be done

  ## Requirements
  - Requirement 1
  - Requirement 2

  ## Success Criteria
  - [ ] Criteria 1
  - [ ] Criteria 2

# Progress tracking
progress:
  - timestamp: "ISO-DATE"
    agent: FRONTEND
    action: created
    note: "Task created from user request"

created_at: "ISO-DATE"
updated_at: "ISO-DATE"
```

### When to Create Tasks

| Request Type          | Action                                    |
| --------------------- | ----------------------------------------- |
| New feature           | Create feature + task(s)                  |
| Bug fix               | Create feature (type: bugfix) + task      |
| Enhancement           | Create feature (type: enhancement) + task |
| Quick fix (< 5 lines) | Skip documentation                        |
| Research/exploration  | Skip documentation                        |

### Status Updates

Update task status as you work:

```yaml
# Starting work
status: in_progress
started_at: "ISO-DATE"

# Work complete
status: qa
# or
status: completed
completed_at: "ISO-DATE"
```

### Progress Log Entries

Add entries to the progress array:

```yaml
progress:
  - timestamp: "2026-01-14T12:00:00Z"
    agent: FRONTEND
    action: started
    note: "Beginning implementation"
  - timestamp: "2026-01-14T14:30:00Z"
    agent: FRONTEND
    action: completed
    note: "Implemented component with all states"
```

This ensures full paper trail and visibility in the Kanban board UI.

---

## YAML File Editing Rules (CRITICAL)

**When updating task YAML files, you MUST follow these rules to prevent format corruption:**

### Rule 1: Use Edit Tool with EXACT Matching

NEVER rewrite the entire file. Only change the specific fields that need updating.

```yaml
# WRONG - Rewriting entire file risks corruption
Write entire TASK-001.yaml with all fields

# CORRECT - Edit only the specific field
Edit old_string: "status: pending" new_string: "status: in_progress"
```

### Rule 2: Status Update Pattern

When updating task status, edit ONLY these fields:

```yaml
# For starting work - edit these 2 fields only:
status: in_progress
started_at: "2026-01-19T10:00:00Z"

# For completing work - edit these 2 fields only:
status: completed
completed_at: "2026-01-19T12:00:00Z"
```

### Rule 3: Progress Log Append Pattern

When adding progress entries, append to the EXISTING array - do NOT replace it:

```yaml
# WRONG - Replaces entire progress array
progress:
  - timestamp: "2026-01-19T12:00:00Z"
    agent: FRONTEND
    action: completed
    note: "Done"

# CORRECT - Append to existing array
# Find the last progress entry and add after it:
progress:
  - timestamp: "2026-01-19T10:00:00Z"
    agent: ORCHESTRATOR
    action: created
    note: "Task created"
  - timestamp: "2026-01-19T12:00:00Z"    # <-- New entry appended
    agent: FRONTEND
    action: completed
    note: "Done"
```

### Rule 4: Preserve Indentation

YAML is indentation-sensitive. Always match existing indentation:

- Top-level fields: no indentation
- Nested under `context:`: 2 spaces
- Nested under `task:`: 4 spaces
- Array items under `progress:`: 2 spaces with `- ` prefix

### Rule 5: Preserve Multi-line Strings

Multi-line strings use `|` and require exact indentation:

```yaml
# CORRECT format - preserve the pipe and indentation
context:
  project: |
    Line 1 of project description.
    Line 2 of project description.

# WRONG - broken format
context:
  project: Line 1 of project description.
Line 2 of project description.
```

### Rule 6: Quote Strings with Special Characters

Always quote strings containing: `:`, `#`, `[`, `]`, `{`, `}`, `&`, `*`, `!`, `|`, `>`, `'`, `"`, `%`, `@`, `` ` ``

```yaml
# CORRECT
title: "Design character builder: wizard flow"
note: "Fixed bug #123"

# WRONG - will break YAML
title: Design character builder: wizard flow
note: Fixed bug #123
```

### Rule 7: NEVER Use Nested Lists (Critical for Creation)

YAML does not allow list items directly nested under other list items:

```yaml
# WRONG - Will cause "block sequence may not be used as implicit map key"
components:
  - Features section:
    - Feature 1
    - Feature 2

# CORRECT - Flatten into single quoted string
components:
  - "Features section: Feature 1, Feature 2"

# CORRECT - Use pipe block for complex hierarchical content
components: |
  - Features section:
    - Feature 1
    - Feature 2
```

### Rule 8: NEVER Use Dashes for Formatting in Text

The ` - ` pattern (space-dash-space) inside text will be parsed as a YAML list separator:

```yaml
# WRONG - Dash treated as list start
- Title: "Welcome back" - 2xl font
- Button: Click here - primary style

# CORRECT - Use parentheses instead
- "Title: Welcome back (2xl font)"
- "Button: Click here (primary style)"
```

### Rule 9: NEVER Add Text After Quoted Strings

Text after a quoted string is invalid YAML:

```yaml
# WRONG - Causes "Unexpected scalar at node end"
- success: "Password updated" then redirect to login
- divider: "or" with horizontal lines
- gridColumns: "1fr 1fr" (desktop)

# CORRECT - Quote the entire value
- "success: Password updated, then redirect to login"
- "divider: or (with horizontal lines)"
- gridColumns: '"1fr 1fr" (desktop)'
```

### Rule 10: Use Pipe Blocks for Complex Specifications

When describing hierarchical UI structures, behaviors, or multi-step content:

```yaml
# WRONG - Nested lists will fail
structure:
  - Header
    - Logo
    - Nav links
  - Content
    - Main area

# CORRECT - Use pipe block
structure: |
  - Header
    - Logo
    - Nav links
  - Content
    - Main area

# Also CORRECT - Flatten to single-line descriptions
structure:
  - "Header: Logo (left), Nav links (right)"
  - "Content: Main area"
```

### Example: Safe Status Update

To update a task from `pending` to `in_progress`:

```
1. Read the task file first
2. Use Edit tool:
   old_string: "status: pending"
   new_string: "status: in_progress"
3. Use Edit tool:
   old_string: "started_at: null"
   new_string: "started_at: \"2026-01-19T10:00:00Z\""
4. Append to progress array (find last entry, add new one after)
```

### Example: Safe Completion Update

To mark a task as `completed`:

```
1. Read the task file first
2. Use Edit tool:
   old_string: "status: in_progress"
   new_string: "status: completed"
3. Use Edit tool:
   old_string: "completed_at: null"
   new_string: "completed_at: \"2026-01-19T12:00:00Z\""
4. Use Edit tool:
   old_string: "actual_minutes: null"
   new_string: "actual_minutes: 45"
5. Append completion entry to progress array
```

### NEVER Do These

- NEVER use Write tool to overwrite entire task YAML files
- NEVER change fields you weren't asked to change
- NEVER remove existing progress entries
- NEVER modify the `context:` section (it's read-only reference)
- NEVER change `id:`, `feature_id:`, or `expected_results:` fields
