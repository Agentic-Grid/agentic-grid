---
name: agent-routing
description: CRITICAL - Auto-detects required agents and enforces parallel execution by default
allowed-tools: Read, Task
---

# Agent Routing System (Auto-Detect + Parallel)

## Core Principle

```
EVERY REQUEST → AUTO-DETECT AGENTS → PARALLEL EXECUTION → QA
```

**No manual agent selection. Framework handles routing automatically.**

## Auto-Detection Algorithm

```python
def route_request(request):
    # Step 1: Detect ALL required agents
    agents = detect_agents(request)

    # Step 2: Group by dependencies
    phase_1 = [a for a in agents if a in ['DESIGNER', 'DATA', 'DEVOPS']]
    phase_2 = [a for a in agents if a in ['BACKEND', 'FRONTEND']]

    # Step 3: Execute
    if len(agents) > 1:
        # PARALLEL MODE (default for multi-agent)
        execute_parallel(phase_1)  # via Task tool
        execute_parallel(phase_2)  # via Task tool
    else:
        # SINGLE AGENT MODE
        execute_single(agents[0])

    # Step 4: Always validate
    run_qa()
```

## Keyword Detection

| Keywords                                                                              | Agent    |
| ------------------------------------------------------------------------------------- | -------- |
| design, colors, UI specs, typography, spacing, theme, visual, style, branding, layout | DESIGNER |
| component, React, frontend, UI implementation, hook, page, JSX, TSX, Tailwind         | FRONTEND |
| API, endpoint, route, backend, Express, service, controller, middleware, auth         | BACKEND  |
| database, schema, migration, model, query, SQL, table, column, index, Sequelize       | DATA     |
| Docker, deploy, CI/CD, infrastructure, nginx, pipeline, server, environment           | DEVOPS   |
| test, validate, QA, verify, check, review, quality                                    | QA       |

**Multiple keywords = Multiple agents = Parallel execution**

## Execution Phases

### Phase 1: Foundation (Parallel)

Agents with NO dependencies on other agents:

- DESIGNER - Creates design tokens, specs
- DATA - Creates database schema
- DEVOPS - Creates infrastructure config

**These always run in parallel.**

### Phase 2: Implementation (Parallel)

Agents that NEED Phase 1 outputs:

- BACKEND - Needs DATA's schema for APIs
- FRONTEND - Needs DESIGNER's tokens for components

**These run in parallel AFTER Phase 1 completes.**

### Phase 3: Validation (Sequential)

- QA - Validates everything

**Always runs last.**

## Parallel vs Sequential

| Scenario                     | Execution                  |
| ---------------------------- | -------------------------- |
| 2+ agents detected           | PARALLEL (via Task tool)   |
| 1 agent detected             | SINGLE (direct routing)    |
| Agent needs another's output | Sequential between phases  |
| Independent agents           | Parallel within same phase |

## Task Tool Usage (Parallel)

When multiple agents detected, spawn via Task tool in SINGLE response:

```xml
<task>
<description>DESIGNER: [task]</description>
<prompt>...</prompt>
</task>

<task>
<description>DATA: [task]</description>
<prompt>...</prompt>
</task>
```

**Both run concurrently. Results merge after completion.**

## Common Patterns

### Full Feature (e.g., "Create user profile page")

```
Detected: DESIGNER, DATA, BACKEND, FRONTEND
Phase 1: Task(DESIGNER) + Task(DATA) → parallel
Phase 2: Task(BACKEND) + Task(FRONTEND) → parallel
Phase 3: QA
```

### API Feature (e.g., "Add login endpoint")

```
Detected: DATA, BACKEND
Phase 1: Task(DATA)
Phase 2: Task(BACKEND)
Phase 3: QA
```

### UI Feature (e.g., "Style the dashboard")

```
Detected: DESIGNER, FRONTEND
Phase 1: Task(DESIGNER)
Phase 2: Task(FRONTEND)
Phase 3: QA
```

### Single Agent (e.g., "Add index to users table")

```
Detected: DATA
Execute DATA workflow directly
Then: QA
```

## Enforcement Rules

### ALWAYS:

- Auto-detect agents from keywords
- Use parallel execution for 2+ agents
- Run QA at the end

### NEVER:

- Ask user "which agent?" - detect automatically
- Run agents sequentially when they can be parallel
- Skip QA validation
- Implement without reading contracts first

## Anti-Patterns (FORBIDDEN)

### 1. Manual Agent Selection

```
❌ "Which agent should I use?"
✅ Auto-detect from keywords → Execute
```

### 2. Sequential When Parallel Possible

```
❌ Run DESIGNER, wait, then run DATA
✅ Run DESIGNER + DATA in parallel (both Phase 1)
```

### 3. Skipping Agents

```
❌ "I'll just implement the frontend"
✅ Detect ALL required agents, including DATA if data is involved
```

### 4. Ignoring QA

```
❌ "Done! What's next?"
✅ "Running QA validation before marking complete..."
```

## Verification Checklist

Before ANY implementation:

```
□ Keywords analyzed for ALL required agents?
□ Agents grouped into correct phases?
□ Phase 1 agents spawned in parallel?
□ Phase 2 agents spawned in parallel (after Phase 1)?
□ QA scheduled for end?
```

## Context Loading (Per Agent)

| Agent    | Required Context                                              |
| -------- | ------------------------------------------------------------- |
| DESIGNER | plans/CURRENT.md, design-tokens.yaml                          |
| FRONTEND | plans/CURRENT.md, design-tokens.yaml, api-contracts.yaml      |
| BACKEND  | plans/CURRENT.md, api-contracts.yaml, database-contracts.yaml |
| DATA     | plans/CURRENT.md, database-contracts.yaml                     |
| DEVOPS   | plans/CURRENT.md, infra-contracts.yaml                        |
| QA       | plans/CURRENT.md, ALL contracts                               |

**Each Task prompt MUST include relevant context.**

## Summary

```
User Request
    │
    ▼
Auto-Detect Agents (from keywords)
    │
    ▼
Group into Phases (by dependencies)
    │
    ▼
Execute Phase 1 (parallel via Task)
    │
    ▼
Execute Phase 2 (parallel via Task)
    │
    ▼
QA Validation
    │
    ▼
Complete
```

**Parallel is the default. Manual routing is deprecated.**
