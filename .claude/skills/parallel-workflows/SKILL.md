---
name: parallel-workflows
description: Patterns for running multiple Claude Code sessions in parallel. Load when planning complex features or optimizing development speed.
allowed-tools: Read, Bash(git:*)
---

# Parallel Workflow Patterns

## The Fundamental Truth

**One Claude Code session = One agent at a time**

For parallel execution, you need:

1. Multiple terminal windows/tabs
2. Multiple git worktrees (to avoid conflicts)
3. Clear synchronization points

## Setup for Parallel Work

### Git Worktree Structure

```bash
# Main project
/projects/my-app/          # main branch

# Parallel worktrees
/projects/my-app-designer/ # designer-work branch
/projects/my-app-data/     # data-work branch
/projects/my-app-frontend/ # frontend-work branch
/projects/my-app-backend/  # backend-work branch
```

### Creating Worktrees

```bash
# From main project directory
cd /projects/my-app

# Create feature branch first
git checkout -b feature/user-profile

# Create worktrees for parallel work
git worktree add ../my-app-designer feature/user-profile-design
git worktree add ../my-app-data feature/user-profile-data

# Each worktree is a full working copy on its own branch
```

### Cleanup After Merge

```bash
# Remove worktrees when done
git worktree remove ../my-app-designer
git worktree remove ../my-app-data

# Prune stale worktree references
git worktree prune
```

## Agent Dependency Graph

```
┌─────────────────────────────────────────────────────────┐
│                    PARALLEL PHASE 1                      │
│  ┌──────────┐                         ┌──────────┐      │
│  │ DESIGNER │                         │   DATA   │      │
│  │          │                         │          │      │
│  │ - Tokens │                         │ - Schema │      │
│  │ - Specs  │                         │ - Migrate│      │
│  └────┬─────┘                         └────┬─────┘      │
│       │                                    │            │
└───────┼────────────────────────────────────┼────────────┘
        │         SYNC POINT: Merge          │
        └──────────────┬─────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────┐
│                 PARALLEL PHASE 2                         │
│       ┌──────────────┴───────────────┐                  │
│       │                              │                  │
│  ┌────┴─────┐                  ┌─────┴────┐            │
│  │  BACKEND │                  │ FRONTEND │            │
│  │          │                  │          │            │
│  │ - APIs   │                  │ - UI     │            │
│  │ - Types  │                  │ - Comps  │            │
│  └────┬─────┘                  └────┬─────┘            │
│       │                             │                   │
└───────┼─────────────────────────────┼───────────────────┘
        │      SYNC POINT: Merge      │
        └──────────────┬──────────────┘
                       │
               ┌───────┴───────┐
               │      QA       │
               │  (Sequential) │
               └───────────────┘
```

## Parallel Patterns by Feature Type

### Pattern 1: New Feature (Full Stack)

**Parallel Phase 1:** DESIGNER + DATA

- Designer: Create design tokens, component specs
- Data: Design schema, create migrations
- Duration: ~Same time, no dependencies

**Sync:** Merge design + data branches

**Parallel Phase 2:** BACK + FRONT

- Backend: Implement APIs using DATA's schema
- Frontend: Build components using DESIGNER's specs
- Note: Frontend can mock API responses initially

**Sync:** Merge backend + frontend branches

**Sequential:** QA → Deploy

### Pattern 2: API-Heavy Feature

**Sequential:** DATA → BACK (APIs depend heavily on schema)
**Then Parallel:** FRONT + QA-unit-tests
**Sequential:** QA-integration

### Pattern 3: UI-Heavy Feature

**Parallel:** DESIGNER + (DATA if needed)
**Sequential:** FRONT (needs design specs)
**Parallel:** BACK (if API needed) + QA-visual-tests
**Sequential:** QA-integration

## Session Coordination

### Terminal Setup (iTerm2/tmux)

```
┌─────────────────┬─────────────────┐
│   Session 1     │   Session 2     │
│   DESIGNER      │   DATA          │
│                 │                 │
│ cd ../app-des   │ cd ../app-data  │
│ claude          │ claude          │
│ /designer ...   │ /data ...       │
├─────────────────┼─────────────────┤
│   Session 3     │   Session 4     │
│   ORCHESTRATOR  │   (Available)   │
│                 │                 │
│ cd ../app       │                 │
│ # Monitor       │                 │
└─────────────────┴─────────────────┘
```

### Communication Between Sessions

Sessions communicate through:

1. **Contract files** - All agents read/write to shared contracts
2. **plans/CURRENT.md** - Status updates
3. **Git commits** - Work artifacts

### Sync Point Protocol

When parallel work completes:

```bash
# Session 1 completes
git add -A && git commit -m "feat: design tokens for user profile"
git push origin feature/user-profile-design

# Session 2 completes
git add -A && git commit -m "feat: user profile schema and migrations"
git push origin feature/user-profile-data

# Orchestrator session merges
git checkout feature/user-profile
git merge feature/user-profile-design
git merge feature/user-profile-data

# Resolve any contract conflicts
# Update plans/CURRENT.md
# Continue to next phase
```

## Contract Conflict Resolution

When parallel agents update the same contract:

### design-tokens.yaml

Usually additive - merge both additions

### api-contracts.yaml

May conflict if both add endpoints - merge manually

### database-contracts.yaml

Critical - ensure no conflicting column names/types

### Resolution Process

```bash
# After merge conflict
git status  # See conflicted files

# Open contract file
# Keep both agents' additions
# Ensure consistency

git add contracts/
git commit -m "merge: resolve contract conflicts"
```

## Parallel Execution Checklist

Before starting parallel work:

- [ ] Create git worktrees for each parallel session
- [ ] Identify sync points
- [ ] Ensure contracts are committed (clean starting point)
- [ ] Each session knows its scope (no overlap)

During parallel work:

- [ ] Each session updates only its relevant contracts
- [ ] Commit frequently with clear messages
- [ ] Don't modify files outside your scope

At sync points:

- [ ] All parallel sessions committed and pushed
- [ ] Merge branches in orchestrator session
- [ ] Resolve any conflicts
- [ ] Verify contracts are consistent
- [ ] Update plans/CURRENT.md
- [ ] Run /verify before continuing

## Anti-Patterns

❌ **Two sessions editing same file**

- Creates merge conflicts
- Risk of lost work

❌ **No sync points defined**

- Work diverges too far
- Painful integration

❌ **Skipping contract updates**

- Other sessions work against stale contracts
- Integration failures

❌ **Too many parallel sessions**

- Coordination overhead exceeds benefits
- 2-3 parallel sessions is usually optimal

## Optimal Parallelization

| Team Size | Recommended Parallel Sessions |
| --------- | ----------------------------- |
| Solo      | 2-3 (you switch between them) |
| Pair      | 2 (one each)                  |
| Team      | 1 per developer               |

**Boris's Setup:** 5 terminal sessions + 5-10 web sessions

- Handles multiple features simultaneously
- Each session is independent task
- Uses `&` to background sessions and check later
