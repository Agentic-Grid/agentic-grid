---
description: Show current project status, progress, and next steps
allowed-tools: Read, Bash(find:*), Bash(git:*), Bash(wc:*)
---

# Project Status Report

## Gather and display:

### 1. Current Focus
!`cat plans/CURRENT.md 2>/dev/null || echo "No CURRENT.md found"`

### 2. Git Status
!`git status --short 2>/dev/null || echo "Not a git repository"`

### 3. Recent Activity
!`git log --oneline -5 2>/dev/null || echo "No commits yet"`

### 4. Open Plans
!`find plans/features plans/tasks plans/changes -name "*.md" -type f 2>/dev/null | head -10`

### 5. Contract Status
!`ls -la contracts/*.yaml 2>/dev/null || echo "No contracts found"`

## Your task

1. Read `plans/CURRENT.md` and summarize the current state
2. List any blockers or pending decisions
3. Identify the next logical steps
4. Suggest which agent should be activated next
5. Note any contracts that may need updating

## Output format

Provide a concise status report:
- **Current Focus:** What we're working on now
- **Progress:** What's been completed recently  
- **Blockers:** Any issues preventing progress
- **Next Steps:** Recommended actions (prioritized)
- **Agent Needed:** Which specialized agent should work next

Additional context: $ARGUMENTS
