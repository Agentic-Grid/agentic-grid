---
description: Coordinate agents - auto-detects required agents and spawns them in parallel using Task tool
allowed-tools: Task, Read, Write, Edit, Bash, Grep, Glob
---

# Orchestrator (Auto-Detect + Parallel by Default)

## STEP 1: Analyze Request

**$ARGUMENTS**

Scan for keywords to auto-detect ALL required agents:

| Keywords                                                     | Agent    |
| ------------------------------------------------------------ | -------- |
| design, colors, UI specs, typography, spacing, theme, visual | DESIGNER |
| component, React, frontend, UI implementation, hook, page    | FRONTEND |
| API, endpoint, route, backend, Express, service, controller  | BACKEND  |
| database, schema, migration, model, query, table, SQL        | DATA     |
| Docker, deploy, CI/CD, infrastructure, nginx, pipeline       | DEVOPS   |
| test, validate, QA, verify, check, review                    | QA       |

**Output: "Detected agents: [LIST]"**

## STEP 2: Load Context

```bash
cat plans/CURRENT.md
cat .claude/state/session.md
```

## STEP 3: Execute (Parallel by Default)

### Execution Mode Decision

```
Detected Agents → Group by Dependencies → Execute in Phases
```

**Phase Groups (run concurrently within each phase):**

| Phase              | Agents                 | Dependencies                                |
| ------------------ | ---------------------- | ------------------------------------------- |
| 1 (Foundation)     | DESIGNER, DATA, DEVOPS | None - always parallel                      |
| 2 (Implementation) | BACKEND, FRONTEND      | BACKEND needs DATA, FRONTEND needs DESIGNER |
| 3 (Validation)     | QA                     | Needs all previous                          |

---

## PARALLEL EXECUTION PROTOCOL

### Phase 1: Foundation (No Dependencies)

Spawn these agents in parallel if detected:

```xml
<task>
<description>DESIGNER: [task-specific design work]</description>
<prompt>
# You are the DESIGNER agent
Your expertise: UI/UX design, design tokens, component specifications.

## Context
### Current State
[Content of plans/CURRENT.md]

### Design Tokens
[Content of contracts/design-tokens.yaml]

## Your Task
[Specific design task extracted from user request]

## Requirements
- Define colors using token scale (50-900)
- Specify spacing using spacing scale
- Document all component states

## Expected Output
1. Updated design-tokens.yaml content (YAML)
2. Component specifications (markdown)
</prompt>
</task>

<task>
<description>DATA: [task-specific database work]</description>
<prompt>
# You are the DATA agent
Your expertise: Database design, Sequelize, PostgreSQL, query optimization.

## Context
### Current State
[Content of plans/CURRENT.md]

### Database Contracts
[Content of contracts/database-contracts.yaml]

## Your Task
[Specific database task extracted from user request]

## Requirements
- UUID primary keys
- Include timestamps
- Add indexes on foreign keys

## Expected Output
1. Updated database-contracts.yaml content (YAML)
2. Migration SQL
</prompt>
</task>
```

### Phase 2: Implementation (Needs Phase 1)

After Phase 1 completes, spawn these in parallel:

```xml
<task>
<description>BACKEND: [task-specific API work]</description>
<prompt>
# You are the BACKEND agent
Your expertise: Express APIs, TypeScript, Zod validation, REST design.

## Context
### Current State
[Content of plans/CURRENT.md]

### Database Schema (from DATA agent)
[Include DATA agent's Phase 1 output]

### API Contracts
[Content of contracts/api-contracts.yaml]

## Your Task
[Specific API task]

## Expected Output
1. Updated api-contracts.yaml (YAML)
2. Route implementations (TypeScript)
3. Generated types for frontend
</prompt>
</task>

<task>
<description>FRONTEND: [task-specific component work]</description>
<prompt>
# You are the FRONTEND agent
Your expertise: React, TypeScript, Tailwind CSS, component architecture.

## Context
### Current State
[Content of plans/CURRENT.md]

### Design Tokens (from DESIGNER agent)
[Include DESIGNER agent's Phase 1 output]

### API Contracts
[Content of contracts/api-contracts.yaml]

## Your Task
[Specific frontend task]

## Expected Output
React components (TypeScript/TSX) using design tokens, handling all states.
</prompt>
</task>
```

### Phase 3: Validation (Always Last)

```
Run /qa to validate everything
```

---

## After Each Phase

1. **Collect outputs** from parallel agents
2. **Update contract files** with merged results
3. **Update plans/CURRENT.md** with progress
4. **Proceed to next phase** or finish with QA

---

## Quick Reference

```
/orchestrator [task]
    │
    ▼
AUTO-DETECT agents from keywords
    │
    ▼
PHASE 1: DESIGNER + DATA + DEVOPS (parallel)
    │
    ▼
Merge outputs
    │
    ▼
PHASE 2: BACKEND + FRONTEND (parallel)
    │
    ▼
Merge outputs
    │
    ▼
PHASE 3: QA validation
```

---

## Examples

**"Build a user dashboard with profile and activity feed"**

```
Detected: DESIGNER, DATA, BACKEND, FRONTEND
Phase 1: Task(DESIGNER) + Task(DATA) → parallel
Phase 2: Task(BACKEND) + Task(FRONTEND) → parallel
Phase 3: QA
```

**"Add user settings page"**

```
Detected: DESIGNER, DATA, BACKEND, FRONTEND
Phase 1: Task(DESIGNER) + Task(DATA) → parallel
Phase 2: Task(BACKEND) + Task(FRONTEND) → parallel
Phase 3: QA
```

**"Improve query performance"**

```
Detected: DATA
Single agent → Execute DATA workflow directly
Then: QA
```

---

## Commands Reference

| Command            | Purpose                     |
| ------------------ | --------------------------- |
| `/parallel [task]` | Explicit parallel execution |
| `/work [task]`     | Auto-routing entry point    |
| `/[agent] [task]`  | Single agent (rare)         |
| `/qa`              | Validation (always run)     |

---

**User request:** $ARGUMENTS

**Now: Auto-detect agents and execute in parallel phases.**
