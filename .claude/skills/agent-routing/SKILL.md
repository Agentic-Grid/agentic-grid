---
name: agent-routing
description: CRITICAL - Auto-detects required agents and enforces parallel execution by default
allowed-tools: Read, Task
---

# Agent Routing System (Auto-Detect + Parallel)

## Core Principle

```
REQUEST → PLANNER (if new feature) → AUTO-DETECT AGENTS → PARALLEL EXECUTION → QA
```

**Contracts-first. Parallel execution. Premium UI mandatory.**

## The Planning Gate

### When PLANNER Runs First (Phase 0):

- New features without specifications
- Architecture changes
- Multi-component implementations
- Unclear requirements

### When to Skip PLANNER:

- Task already has YAML specification
- Bug fix with clear scope
- Single-file modifications
- Implementation of existing spec

```python
def should_plan_first(request):
    # Check if specs exist
    if task_yaml_exists(request):
        return False  # Skip to execution
    if is_bug_fix(request):
        return False
    if is_new_feature(request):
        return True   # PLANNER first
    return False
```

## Auto-Detection Algorithm

```python
def route_request(request):
    # Phase 0: Plan if needed
    if should_plan_first(request):
        run_planner(request)  # Creates contracts + tasks

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

## Agent Registry

| Agent     | Purpose                              | Contracts Owned                     |
| --------- | ------------------------------------ | ----------------------------------- |
| DISCOVERY | Requirements gathering               | QUESTIONS.yaml                      |
| PLANNER   | Architecture + specs + tasks         | All contracts, task specs           |
| DESIGNER  | Premium UI/UX design                 | ui-flows.yaml, design-tokens        |
| FRONTEND  | React components, pages              | (consumes design and api contracts) |
| BACKEND   | APIs, services, business logic       | api-contracts.yaml                  |
| DATA      | Database schema, queries             | data-model.yaml                     |
| DEVOPS    | Infrastructure, CI/CD, env setup     | infra-contracts.yaml, .env          |
| QA        | Validation + premium UI verification | QA reports                          |

## Task Status Values

| Status                | Description                     | Next Action                         |
| --------------------- | ------------------------------- | ----------------------------------- |
| `pending`             | Task not started                | Agent picks up task                 |
| `in_progress`         | Agent actively working          | Wait for completion                 |
| `blocked`             | Depends on another task         | Complete dependency first           |
| `awaiting_user_input` | Needs external credentials/info | User provides input, then `/resume` |
| `qa`                  | Implementation done, needs QA   | QA agent validates                  |
| `completed`           | All done and validated          | Archive                             |

### `awaiting_user_input` Status (CRITICAL)

When a task requires external credentials (API keys, OAuth secrets, etc.):

1. **DEVOPS/Agent marks task** as `awaiting_user_input`
2. **Specifies required variables** with instructions on how to obtain them
3. **User provides credentials** in `.env` file
4. **User runs `/resume TASK-XXX`** to continue
5. **Task resumes** and continues execution

```yaml
# Task marked as awaiting_user_input
status: awaiting_user_input
awaiting_input:
  reason: "External API credentials required"
  required_variables:
    - name: STRIPE_SECRET_KEY
      description: "Stripe API secret key"
      how_to_get: "https://dashboard.stripe.com/apikeys"
  instructions: "Add keys to .env, then run /resume TASK-XXX"
```

**Auto-generated variables (DEVOPS handles):** JWT_SECRET, POSTGRES_PASSWORD, SESSION_SECRET, ports, internal URLs

**User-provided variables (mark `awaiting_user_input`):** External API keys, OAuth credentials, payment gateways, email services

## Keyword Detection

| Keywords                                                                              | Agent    |
| ------------------------------------------------------------------------------------- | -------- |
| plan, architecture, specification, feature design, design document                    | PLANNER  |
| design, colors, UI specs, typography, spacing, theme, visual, style, branding, layout | DESIGNER |
| component, React, frontend, UI implementation, hook, page, JSX, TSX, Tailwind         | FRONTEND |
| API, endpoint, route, backend, Express, service, controller, middleware, auth         | BACKEND  |
| database, schema, migration, model, query, SQL, table, column, index, Sequelize       | DATA     |
| Docker, deploy, CI/CD, infrastructure, nginx, pipeline, server, environment           | DEVOPS   |
| test, validate, QA, verify, check, review, quality                                    | QA       |

**Multiple keywords = Multiple agents = Parallel execution**

## Execution Phases

### Phase 0: Planning (If Needed)

PLANNER creates executable specifications:

- Collaborates with DATA → data-model.yaml
- Collaborates with BACKEND → api-contracts.yaml
- Collaborates with DESIGNER → ui-flows.yaml (with premium mandate)

### Phase 1: Foundation (Parallel)

Agents with NO dependencies on other agents:

- DESIGNER - Creates design tokens, premium UI specs
- DATA - Creates database schema
- DEVOPS - Creates infrastructure config

**These always run in parallel.**

### Phase 2: Implementation (Parallel)

Agents that NEED Phase 1 outputs:

- BACKEND - Needs DATA's schema for APIs
- FRONTEND - Needs DESIGNER's tokens for premium components

**These run in parallel AFTER Phase 1 completes.**

### Phase 3: Validation (Sequential)

- QA - Validates everything INCLUDING premium UI requirements

**Always runs last.**

## DESIGNER Agent: Premium UI Mandate

When routing to DESIGNER, ALWAYS include:

```markdown
## MANDATORY REQUIREMENTS

The UI MUST be:

- **PREMIUM** - High-end, polished, worthy of a luxury brand
- **SOPHISTICATED** - Elegant, refined, never cluttered or cheap
- **ADDICTIVE** - Satisfying micro-interactions
- **DELIGHTFUL** - Unexpected moments of joy through animation

Reference apps: Linear, Stripe, Vercel, Notion, Raycast

MANDATORY for every component:

- ALL states defined (loading, error, empty, success)
- ALL animations specified (hover, click, transitions)
- ALL micro-interactions documented
- Premium visual details (gradients, shadows, polish)
- Dark mode variant
```

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
<description>DESIGNER: Design premium [component]</description>
<prompt>
You are DESIGNER agent. Create premium, sophisticated UI specs.
MANDATORY: animations, loading states, micro-interactions, dark mode.
Reference: Linear, Stripe, Vercel for quality standard.
...
</prompt>
</task>

<task>
<description>DATA: Create [entity] schema</description>
<prompt>...</prompt>
</task>
```

**Both run concurrently. Results merge after completion.**

## Common Patterns

### Full Feature (e.g., "Create user profile page")

```
Phase 0: PLANNER (creates specs if missing)
Phase 1: Task(DESIGNER) + Task(DATA) → parallel
Phase 2: Task(BACKEND) + Task(FRONTEND) → parallel
Phase 3: QA (including premium UI validation)
```

### New Project (e.g., "Build a task management app")

```
Phase 0: DISCOVERY → PLANNER
  - PLANNER collaborates with DATA, BACKEND, DESIGNER
  - Creates all contracts
Phase 1-3: Execute feature by feature
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
Phase 1: Task(DESIGNER) → Premium specs with animations
Phase 2: Task(FRONTEND) → Implement with all animations
Phase 3: QA → Validate premium UI checklist
```

## Enforcement Rules

### ALWAYS:

- Check for contracts before implementing
- Auto-detect agents from keywords
- Use parallel execution for 2+ agents
- Include premium UI mandate for DESIGNER
- Run QA at the end (with premium UI validation)

### NEVER:

- Ask user "which agent?" - detect automatically
- Run agents sequentially when they can be parallel
- Skip QA validation
- Implement without reading contracts first
- Create static/lifeless UI without animations

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

### 3. Skipping Planning

```
❌ "Let me just start coding..."
✅ Check if contracts exist → PLANNER first if not
```

### 4. Generic UI

```
❌ "Here's a basic form component"
✅ Premium form with animations, loading states, feedback
```

### 5. Skipping QA

```
❌ "Done! What's next?"
✅ "Running QA validation including premium UI checks..."
```

## Context Loading (Per Agent)

| Agent    | Required Context                                                        |
| -------- | ----------------------------------------------------------------------- |
| PLANNER  | QUESTIONS.yaml, existing contracts, PROJECT.md                          |
| DESIGNER | plans/CURRENT.md, design-tokens.yaml, **Premium UI mandate**            |
| FRONTEND | plans/CURRENT.md, design-tokens.yaml, api-contracts.yaml, ui-flows.yaml |
| BACKEND  | plans/CURRENT.md, api-contracts.yaml, data-model.yaml                   |
| DATA     | plans/CURRENT.md, data-model.yaml                                       |
| DEVOPS   | plans/CURRENT.md, infra-contracts.yaml                                  |
| QA       | plans/CURRENT.md, ALL contracts, **Premium UI checklist**               |

**Each Task prompt MUST include relevant context.**

## QA Premium UI Validation

QA agent MUST verify:

```markdown
□ All animations present (hover, click, transitions)
□ All loading states implemented (skeleton, spinner)
□ All user feedback working (success, error, validation)
□ Design tokens used (no hardcoded values)
□ Dark mode functional
□ UI feels premium and polished (not template-like)
```

## Summary

```
User Request
    │
    ▼
Check Contracts Exist?
    │
    ├── No → PLANNER (Phase 0)
    │        Collaborates with DATA, BACKEND, DESIGNER
    │        Creates all specs
    │
    ▼
Auto-Detect Agents (from keywords)
    │
    ▼
Group into Phases (by dependencies)
    │
    ▼
Execute Phase 1 (parallel via Task)
    - DESIGNER: Premium UI specs
    - DATA: Schema design
    │
    ▼
Execute Phase 2 (parallel via Task)
    - BACKEND: API implementation
    - FRONTEND: Premium UI implementation
    │
    ▼
QA Validation (Premium UI mandatory)
    │
    ▼
Complete
```

**Contracts-first. Parallel execution. Premium UI mandatory.**
