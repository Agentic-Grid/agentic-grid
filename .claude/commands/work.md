---
description: REQUIRED entry point for all implementation work. Routes to correct agent with proper context loading.
allowed-tools: Read, Write, Edit, Bash(./scripts/*), Task
---

# Work Router (Auto-Select + Parallel by Default)

## Step 1: Analyze Request

Parse the user's request: **$ARGUMENTS**

**Detect ALL agents required by scanning for keywords:**

| Keywords                                                     | Agent    |
| ------------------------------------------------------------ | -------- |
| design, colors, UI specs, typography, spacing, theme, visual | DESIGNER |
| component, React, frontend, UI implementation, hook, page    | FRONTEND |
| API, endpoint, route, backend, Express, service, controller  | BACKEND  |
| database, schema, migration, model, query, table, SQL        | DATA     |
| Docker, deploy, CI/CD, infrastructure, nginx, pipeline       | DEVOPS   |
| test, validate, QA, verify, check, review                    | QA       |

**List all detected agents before proceeding.**

## Step 2: Determine Execution Mode

### Multi-Agent Detected (2+ agents) → PARALLEL EXECUTION

**Use Task tool to spawn agents concurrently.**

```
PHASE 1 (Parallel - no dependencies):
├── DESIGNER (if detected)
├── DATA (if detected)
└── DEVOPS (if detected)

PHASE 2 (Parallel - needs Phase 1):
├── BACKEND (needs DATA output)
└── FRONTEND (needs DESIGNER output)

PHASE 3 (Sequential - always last):
└── QA (validates everything)
```

**Execute Phase 1 agents in parallel:**

```xml
<task>
<description>DESIGNER: [task-specific]</description>
<prompt>
You are the DESIGNER agent.
[Include plans/CURRENT.md]
[Include contracts/design-tokens.yaml]
Task: [specific design work]
Output: Updated design tokens and component specs.
</prompt>
</task>

<task>
<description>DATA: [task-specific]</description>
<prompt>
You are the DATA agent.
[Include plans/CURRENT.md]
[Include contracts/database-contracts.yaml]
Task: [specific database work]
Output: Updated database contracts and migration SQL.
</prompt>
</task>
```

**After Phase 1 completes, execute Phase 2 in parallel** (include Phase 1 outputs).

**After Phase 2 completes, run QA.**

### Single Agent Detected → DIRECT ROUTING

Route directly to the agent's command:

| Agent    | Load Context                                                  | Execute                             |
| -------- | ------------------------------------------------------------- | ----------------------------------- |
| DESIGNER | plans/CURRENT.md, design-tokens.yaml                          | .claude/agents/designer.md workflow |
| FRONTEND | plans/CURRENT.md, design-tokens.yaml, api-contracts.yaml      | .claude/agents/frontend.md workflow |
| BACKEND  | plans/CURRENT.md, api-contracts.yaml, database-contracts.yaml | .claude/agents/backend.md workflow  |
| DATA     | plans/CURRENT.md, database-contracts.yaml                     | .claude/agents/data.md workflow     |
| DEVOPS   | plans/CURRENT.md, infra-contracts.yaml                        | .claude/agents/devops.md workflow   |
| QA       | plans/CURRENT.md, all contracts                               | .claude/agents/qa.md workflow       |

## Step 3: Load Context (For All Modes)

```bash
cat plans/CURRENT.md                    # Always read first
cat contracts/[relevant-contracts].yaml # Based on agents detected
cat .claude/agents/[agent].md           # For single-agent mode
```

## Step 4: Execute

### Parallel Mode:

1. Spawn Phase 1 agents via Task tool (single response with multiple tasks)
2. Collect outputs, update contracts
3. Spawn Phase 2 agents via Task tool (include Phase 1 outputs)
4. Collect outputs, update code
5. Run QA validation

### Single-Agent Mode:

1. Follow agent's workflow from `.claude/agents/[name].md`
2. Update contracts if changed
3. Run QA validation

## Step 5: Post-Work

- [ ] All contracts updated
- [ ] plans/CURRENT.md updated with progress
- [ ] QA passed

---

## Quick Reference

```
/work [anything]
    │
    ▼
ANALYZE: What agents are needed?
    │
    ├── Multiple agents? → PARALLEL (Task tool)
    │   Phase 1: DESIGNER + DATA + DEVOPS (parallel)
    │   Phase 2: BACKEND + FRONTEND (parallel)
    │   Phase 3: QA
    │
    └── Single agent? → DIRECT ROUTE
        Load context → Follow workflow → QA
```

## Examples

**"Create user profile page"**
→ Detected: DESIGNER, DATA, BACKEND, FRONTEND
→ Mode: PARALLEL
→ Phase 1: Task(DESIGNER) + Task(DATA)
→ Phase 2: Task(BACKEND) + Task(FRONTEND)
→ Phase 3: QA

**"Add index to users table"**
→ Detected: DATA
→ Mode: SINGLE-AGENT
→ Load DATA context → Execute workflow → QA

**"Style the navbar"**
→ Detected: DESIGNER, FRONTEND
→ Mode: PARALLEL
→ Phase 1: Task(DESIGNER)
→ Phase 2: Task(FRONTEND)
→ Phase 3: QA

---

**User request:** $ARGUMENTS

**Now: Analyze the request, detect agents, and execute (parallel or single-agent).**
