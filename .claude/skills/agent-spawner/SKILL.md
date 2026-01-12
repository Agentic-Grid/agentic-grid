---
name: agent-spawner
description: Patterns for spawning multiple agents as parallel subagents using the Task tool. Enables true in-session parallelism.
allowed-tools: Task, Read
---

# Agent Spawner Patterns

## The Task Tool = Parallel Agents

Claude Code's **Task tool** spawns separate Claude instances that run concurrently.

```
┌─────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                          │
│                         │                                │
│    ┌────────────────────┼────────────────────┐          │
│    │                    │                    │          │
│    ▼                    ▼                    ▼          │
│ ┌──────┐           ┌──────┐           ┌──────┐         │
│ │ Task │           │ Task │           │ Task │         │
│ │  #1  │           │  #2  │           │  #3  │         │
│ │      │           │      │           │      │         │
│ │DESIGN│           │ DATA │           │DEVOPS│         │
│ └──┬───┘           └──┬───┘           └──┬───┘         │
│    │                  │                  │              │
│    │    (parallel)    │    (parallel)    │              │
│    │                  │                  │              │
│    └────────────────────────────────────────           │
│                         │                                │
│                    [All complete]                        │
│                         │                                │
│                    Merge results                         │
└─────────────────────────────────────────────────────────┘
```

## Key Insight: Multiple Task Calls = Parallel Execution

When you invoke multiple Task tools in a **single response**, Claude Code runs them concurrently:

```python
# This runs SEQUENTIALLY (bad for parallelism):
response_1 = task(agent_1_prompt)
response_2 = task(agent_2_prompt)  # Waits for response_1

# This runs IN PARALLEL (good!):
# Both tasks in same response block
<task>agent_1_prompt</task>
<task>agent_2_prompt</task>
# Claude Code executes both simultaneously
```

## Task Tool Syntax

```xml
<task>
<description>Brief description for logging</description>
<prompt>
Full prompt for the subagent including:
- Identity/role
- Context (must include everything needed)
- Specific task
- Expected output format
</prompt>
</task>
```

## Agent Task Templates

### DESIGNER Task

```xml
<task>
<description>DESIGNER: [Component/Feature] design specs</description>
<prompt>
# You are the DESIGNER agent

Your expertise: UI/UX design, design tokens, component specifications.

## Context

### Current Project State
```

[Paste content of plans/CURRENT.md]

````

### Existing Design Tokens
```yaml
[Paste content of contracts/design-tokens.yaml]
````

## Your Task

[Specific design task]

## Requirements

- Define all colors using the token scale (50-900)
- Specify spacing using the spacing scale
- Document all component states (default, hover, active, disabled, error)
- Include responsive behavior

## Expected Output

Return as structured output:

### 1. New/Updated Design Tokens

```yaml
# Paste-ready YAML for design-tokens.yaml
```

### 2. Component Specifications

```markdown
# Component specs with HTML structure, states, responsive behavior
```

</prompt>
</task>
```

### DATA Task

```xml
<task>
<description>DATA: [Feature] database schema</description>
<prompt>
# You are the DATA agent

Your expertise: Database design, Sequelize, PostgreSQL, query optimization.

## Context

### Current Project State
```

[Paste content of plans/CURRENT.md]

````

### Existing Database Schema
```yaml
[Paste content of contracts/database-contracts.yaml]
````

## Your Task

[Specific database task]

## Requirements

- Use UUID primary keys
- Include created_at/updated_at timestamps
- Add indexes on all foreign keys
- Document query patterns with indexes used
- Prevent N+1 queries

## Expected Output

### 1. Updated Database Contracts

```yaml
# Paste-ready YAML for database-contracts.yaml
```

### 2. Migration SQL

```sql
-- Ready-to-run migration
```

### 3. Sequelize Model

```typescript
// Model definition
```

</prompt>
</task>
```

### BACKEND Task

```xml
<task>
<description>BACKEND: [Feature] API endpoints</description>
<prompt>
# You are the BACKEND agent

Your expertise: Express APIs, TypeScript, Zod validation, REST design.

## Context

### Current Project State
```

[Paste content of plans/CURRENT.md]

````

### Database Schema (from DATA agent)
```yaml
[Paste database contracts or DATA agent output]
````

### Existing API Contracts

```yaml
[Paste content of contracts/api-contracts.yaml]
```

## Your Task

[Specific API task]

## Requirements

- RESTful endpoint design
- Zod validation on all inputs
- Consistent error format: { error, code, details? }
- Generate TypeScript types for frontend

## Expected Output

### 1. Updated API Contracts

```yaml
# Paste-ready YAML for api-contracts.yaml
```

### 2. Route Implementation

```typescript
// Express route handlers
```

### 3. TypeScript Types

```typescript
// Types for frontend consumption
```

</prompt>
</task>
```

### FRONTEND Task

```xml
<task>
<description>FRONTEND: [Feature] React components</description>
<prompt>
# You are the FRONTEND agent

Your expertise: React, TypeScript, Tailwind CSS, component architecture.

## Context

### Current Project State
```

[Paste content of plans/CURRENT.md]

````

### Design Tokens (from DESIGNER agent)
```yaml
[Paste design tokens or DESIGNER agent output]
````

### API Contracts (from BACKEND agent)

```yaml
[Paste API contracts or BACKEND agent output]
```

## Your Task

[Specific frontend task]

## Requirements

- Use design tokens (NEVER hardcode colors/spacing)
- Handle all states: loading, error, empty, success
- Full TypeScript types (no `any`)
- Accessible (ARIA labels, keyboard nav)

## Expected Output

### React Components

```tsx
// Full component implementation
```

</prompt>
</task>
```

### QA Task

````xml
<task>
<description>QA: Validate [Feature]</description>
<prompt>
# You are the QA agent

Your expertise: Testing, validation, bug hunting, security, accessibility.

## Context

### Implementation to Validate
[Paste the code/contracts to validate]

### Contracts (Source of Truth)
```yaml
[Paste all relevant contracts]
````

## Your Task

Validate the implementation against contracts and quality standards.

## Validation Checklist

1. Contract Compliance
   - Does implementation match contracts?
2. Edge Cases
   - Empty inputs
   - Invalid inputs
   - Boundary conditions

3. Security
   - Input validation
   - Auth/authz
   - Injection prevention

4. Accessibility
   - ARIA labels
   - Keyboard navigation
   - Color contrast

## Expected Output

### Validation Report

**Verdict:** ✅ PASSED / ❌ FAILED

**Issues Found:**

| Severity    | Issue       | Location  | Fix           |
| ----------- | ----------- | --------- | ------------- |
| 🔴/🟠/🟡/🟢 | Description | File:line | Suggested fix |

</prompt>
</task>
```

## Parallel Execution Patterns

### Pattern 1: Foundation Phase (DESIGNER + DATA)

These agents have no dependencies and can always run in parallel:

```xml
<task>
<description>DESIGNER: Create design system for [feature]</description>
<prompt>...</prompt>
</task>

<task>
<description>DATA: Design schema for [feature]</description>
<prompt>...</prompt>
</task>
```

### Pattern 2: Implementation Phase (BACKEND + FRONTEND)

After foundation, these can run in parallel if:

- FRONTEND works from design specs (not final API)
- FRONTEND mocks API responses initially

```xml
<task>
<description>BACKEND: Implement APIs for [feature]</description>
<prompt>
[Include DATA agent's schema output]
...
</prompt>
</task>

<task>
<description>FRONTEND: Implement components for [feature]</description>
<prompt>
[Include DESIGNER agent's specs output]
[Include API contract - types only, mock responses]
...
</prompt>
</task>
```

### Pattern 3: Multi-Feature Parallel

Different features can be developed in parallel:

```xml
<task>
<description>Feature A: User profiles (full stack)</description>
<prompt>
Implement complete user profiles feature:
- Schema, API, UI
...
</prompt>
</task>

<task>
<description>Feature B: Activity feed (full stack)</description>
<prompt>
Implement complete activity feed feature:
- Schema, API, UI
...
</prompt>
</task>
```

### Pattern 4: Parallel QA

Different aspects can be validated in parallel:

```xml
<task>
<description>QA: Security validation</description>
<prompt>Focus on security aspects...</prompt>
</task>

<task>
<description>QA: Accessibility validation</description>
<prompt>Focus on accessibility...</prompt>
</task>

<task>
<description>QA: Performance validation</description>
<prompt>Focus on performance...</prompt>
</task>
```

## Context Passing Between Phases

**Critical:** Each Task is a separate Claude instance. It doesn't see other Tasks' outputs.

### Solution: Orchestrator Merges and Passes

```
Phase 1: DESIGNER + DATA (parallel)
    │
    ▼
Orchestrator collects outputs
    │
    ▼
Phase 2: BACKEND + FRONTEND (parallel)
         [Include Phase 1 outputs in prompts]
    │
    ▼
Orchestrator merges all outputs
    │
    ▼
Phase 3: QA
         [Include all outputs for validation]
```

### Example Flow

```python
# Phase 1
designer_output = task(designer_prompt)
data_output = task(data_prompt)
# (These run in parallel)

# Orchestrator merges Phase 1
# Updates contract files with outputs

# Phase 2 - include Phase 1 outputs
backend_prompt = f"""
## Schema from DATA agent:
{data_output}

## Your task: Implement APIs...
"""

frontend_prompt = f"""
## Design specs from DESIGNER agent:
{designer_output}

## Your task: Implement components...
"""

backend_output = task(backend_prompt)
frontend_output = task(frontend_prompt)
# (These run in parallel)
```

## Avoiding Conflicts

### Rule 1: Separate File Ownership

| Agent    | Owns These Files                                  |
| -------- | ------------------------------------------------- |
| DESIGNER | contracts/design-tokens.yaml                      |
| DATA     | contracts/database-contracts.yaml, migrations/    |
| BACKEND  | contracts/api-contracts.yaml, api/src/            |
| FRONTEND | app/src/components/, app/src/hooks/               |
| DEVOPS   | contracts/infra-contracts.yaml, docker/, .github/ |

### Rule 2: Contract-First

Agents update contracts, orchestrator applies to codebase.

### Rule 3: Explicit Boundaries

In task prompts, specify exactly what to output:

- "Update ONLY the profiles section of database contracts"
- "Create ONLY the ProfileCard component"

## Error Handling

If a parallel task fails:

1. Orchestrator receives error in task result
2. Log the failure
3. Either:
   - Retry the failed task
   - Fall back to sequential execution
   - Report to user and stop

```python
results = [task1_result, task2_result]

for result in results:
    if result.error:
        # Handle failure
        log_error(result)
        # Decide: retry, fallback, or stop
```

## Performance Expectations

| Approach            | Time for 4-Agent Feature |
| ------------------- | ------------------------ |
| Sequential          | ~4x single agent time    |
| Parallel (2 phases) | ~2x single agent time    |
| Parallel (max)      | ~1.5x single agent time  |

Parallel execution is ~2-3x faster for complex features.
