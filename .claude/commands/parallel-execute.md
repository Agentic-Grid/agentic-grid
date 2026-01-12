---
description: Execute multiple agents in parallel using Task tool subagents
allowed-tools: Task, Read, Write, Edit, Bash(./scripts/*)
---

# Parallel Agent Executor

This command spawns multiple agents as **parallel subagents** using the Task tool.

## How It Works

The Task tool creates separate Claude instances that run concurrently:

```
ORCHESTRATOR (you)
    │
    ├──→ Task: DESIGNER agent ──→ (runs in parallel)
    │
    ├──→ Task: DATA agent ──────→ (runs in parallel)
    │
    └──→ (waits for all to complete)
            │
            ↓
    Merge results & continue
```

## Step 1: Parse Request

Analyze: **$ARGUMENTS**

Determine which agents can run in parallel (no dependencies between them).

## Step 2: Prepare Parallel Tasks

For each parallel agent, create a Task call with:

1. **Agent context** - Load the agent's specification
2. **Current state** - Include plans/CURRENT.md
3. **Contracts** - Include relevant contract files
4. **Specific task** - What this agent should do
5. **Output requirements** - What to return

## Step 3: Execute in Parallel

**CRITICAL: Invoke multiple Task tools in a SINGLE response block.**

Claude Code processes multiple Task calls concurrently when they appear together:

```
<task>
<description>DESIGNER: Create design tokens for user profile</description>
<prompt>
You are the DESIGNER agent.

Context:
[paste plans/CURRENT.md]
[paste contracts/design-tokens.yaml]

Your task: Create design tokens for the user profile feature.

Requirements:
- Define color tokens for profile components
- Define spacing for profile layout
- Document component specifications

Output: Updated design-tokens.yaml content and component specs.
</prompt>
</task>

<task>
<description>DATA: Design user profile schema</description>
<prompt>
You are the DATA agent.

Context:
[paste plans/CURRENT.md]
[paste contracts/database-contracts.yaml]

Your task: Design database schema for user profiles.

Requirements:
- Define profiles table structure
- Add necessary indexes
- Document query patterns

Output: Updated database-contracts.yaml content and migration SQL.
</prompt>
</task>
```

## Step 4: Merge Results

After parallel tasks complete:

1. Collect outputs from each agent
2. Check for conflicts (unlikely if properly scoped)
3. Apply updates to contract files
4. Update plans/CURRENT.md with progress
5. Update .claude/state/session.md

## Step 5: Continue or Validate

After parallel phase completes:

- If more agents needed → run next parallel batch
- If implementation done → run /qa

---

## Parallel Execution Patterns

### Pattern: Full Feature (Fastest)

**Phase 1 (Parallel):**

```
Task: DESIGNER (design tokens, component specs)
Task: DATA (schema, migrations)
```

**Phase 2 (Parallel, after Phase 1):**

```
Task: BACKEND (APIs using DATA's schema)
Task: FRONTEND (components using DESIGNER's specs)
```

**Phase 3 (Sequential):**

```
QA validation
```

### Pattern: API + UI Feature

**Parallel:**

```
Task: DATA (schema)
Task: DESIGNER (UI specs)
```

**Sequential:**

```
BACKEND (needs schema)
FRONTEND (needs both)
QA
```

---

## Task Tool Syntax

Each Task call should include:

```markdown
<task>
<description>[AGENT]: [Brief task description]</description>
<prompt>
# Agent Identity
You are the [AGENT] agent. [Core responsibility].

# Context

## Current State

[Content of plans/CURRENT.md]

## Relevant Contracts

[Content of relevant contract files]

# Your Task

[Specific task description]

# Requirements

- [Requirement 1]
- [Requirement 2]

# Expected Output

Return the following:

1. [Output 1]
2. [Output 2]

# Rules

- Follow agent workflow from .claude/agents/[agent].md
- Update contracts, don't just describe changes
- Be specific and complete
  </prompt>
  </task>
```

---

## Example: Parallel Feature Development

User request: "Create a user dashboard with profile and activity feed"

**Execute Phase 1:**

```xml
<task>
<description>DESIGNER: Dashboard design system</description>
<prompt>
You are the DESIGNER agent specializing in UI/UX.

## Current State
[plans/CURRENT.md content]

## Existing Design Tokens
[contracts/design-tokens.yaml content]

## Task
Design the user dashboard with:
1. Profile card component
2. Activity feed component
3. Dashboard layout

## Output Required
1. New design tokens (YAML format)
2. Component specifications (structure, states)
3. Responsive breakpoint behavior
</prompt>
</task>

<task>
<description>DATA: Dashboard data model</description>
<prompt>
You are the DATA agent specializing in database design.

## Current State
[plans/CURRENT.md content]

## Existing Schema
[contracts/database-contracts.yaml content]

## Task
Design data model for:
1. User profiles table
2. Activity/events table
3. Efficient query patterns for feed

## Output Required
1. Updated database contracts (YAML)
2. Migration SQL
3. Index strategy
</prompt>
</task>
```

**After Phase 1 completes, execute Phase 2:**

```xml
<task>
<description>BACKEND: Dashboard APIs</description>
<prompt>
You are the BACKEND agent.

## Context
[Include Phase 1 outputs - schema from DATA]

## Task
Implement APIs for:
1. GET /api/profile
2. GET /api/activity-feed
3. PATCH /api/profile

## Output Required
1. Updated API contracts
2. Route implementations
3. Generated TypeScript types
</prompt>
</task>

<task>
<description>FRONTEND: Dashboard components</description>
<prompt>
You are the FRONTEND agent.

## Context
[Include Phase 1 outputs - design tokens from DESIGNER]

## Task
Implement:
1. ProfileCard component
2. ActivityFeed component
3. DashboardLayout component

## Output Required
1. React component code
2. All states (loading, error, empty, success)
3. Using design tokens (no hardcoded values)
</prompt>
</task>
```

---

## Important Notes

1. **Task tools run as separate Claude instances** - They don't see each other's work during execution
2. **Scope tasks carefully** - Avoid overlapping file modifications
3. **Include full context in each Task** - They don't inherit parent context
4. **Results need merging** - Orchestrator must apply outputs to files
5. **Contracts prevent conflicts** - Each agent works on different contracts

---

## Your Parallel Execution

Request: $ARGUMENTS

Now analyze the request and spawn parallel Task calls for agents that can work simultaneously.
