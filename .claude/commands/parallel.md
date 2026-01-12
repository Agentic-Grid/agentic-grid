---
description: Plan and coordinate parallel agent work across multiple Claude Code sessions
allowed-tools: Bash(git:*), Read, Write, Edit
---

# Parallel Workflow Planning

## Understanding Parallel Execution

**Claude Code runs one agent at a time per session.**

For true parallelism, you need **multiple Claude Code sessions**, each in a separate git worktree.

## Your Task

Analyze the requested work and create a parallel execution plan.

### 1. Identify Parallelizable Work

Agents that can run simultaneously (no dependencies):

| Parallel Group     | Agents             | Why Parallel                                                 |
| ------------------ | ------------------ | ------------------------------------------------------------ |
| **Foundation**     | DESIGNER + DATA    | Design tokens and database schema don't depend on each other |
| **Implementation** | FRONT + BACK       | Can implement against contracts simultaneously               |
| **Validation**     | Multiple QA checks | Different test suites can run in parallel                    |

Agents that must be sequential:

- BACK needs DATA's schema before implementing
- FRONT needs BACK's types before integrating
- QA needs implementation complete before validating

### 2. Create Git Worktrees

```bash
# Create worktrees for parallel work
git worktree add ../project-designer designer-work
git worktree add ../project-data data-work
git worktree add ../project-frontend frontend-work
git worktree add ../project-backend backend-work
```

### 3. Generate Session Instructions

Create specific instructions for each parallel session:

**Session 1 (Designer):**

```
cd ../project-designer
# Run Claude Code here
/designer [specific task]
```

**Session 2 (Data):**

```
cd ../project-data
# Run Claude Code here
/data [specific task]
```

### 4. Synchronization Points

After parallel work completes, merge and continue:

```bash
# Merge parallel branches
git checkout main
git merge designer-work
git merge data-work

# Continue with sequential work
/backend [uses merged contracts]
```

## Output

Generate a parallel execution plan:

```markdown
# Parallel Execution Plan: [Feature Name]

## Phase 1: Parallel Foundation

Run simultaneously in separate sessions:

### Session A: Designer

- Worktree: `../project-designer`
- Branch: `feature/[name]-design`
- Task: [specific design work]
- Output: Updated design-tokens.yaml

### Session B: Data

- Worktree: `../project-data`
- Branch: `feature/[name]-data`
- Task: [specific database work]
- Output: Updated database-contracts.yaml, migrations

**Sync Point:** Merge both branches before Phase 2

## Phase 2: Parallel Implementation

Run simultaneously after Phase 1 merges:

### Session A: Backend

- Branch: `feature/[name]-backend`
- Task: [API implementation]
- Output: API endpoints, types

### Session B: Frontend

- Branch: `feature/[name]-frontend`
- Task: [UI implementation against contracts]
- Output: React components

**Sync Point:** Merge both branches before Phase 3

## Phase 3: Sequential Finalization

- Integration testing
- QA validation
- Final merge to main
```

Feature to parallelize: $ARGUMENTS
