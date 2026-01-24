---
description: Strategic advisor for task planning - ALWAYS ULTRATHINKS to ensure flawless specifications
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Task Master

Invokes the TASK_MASTER agent — a senior architect and perfectionist mentor.

## What TASK_MASTER Does

**NOT** a checklist validator. Instead, TASK_MASTER:
- **ALWAYS** uses extended thinking (ULTRATHINK)
- Asks probing questions to draw out requirements
- Guides planners to think about what's missing
- Ensures the full development flow is coherent
- Challenges assumptions and explores edge cases

## Usage

```
/task-master
```

Then provide context for what you want reviewed:
- Architecture document
- Feature specification
- Task definition
- Complete feature with all tasks

## When Invoked

- **Automatically** by PLANNER during `/onboard` for EVERY asset
- **Manually** when planning tasks outside onboarding
- **Feature review** after all tasks in a feature are complete

## Agent

- **Loads:** `.claude/agents/task-master.md`
- **Model:** `claude-opus-4-5-20251101` (for deep reasoning capability)

## Review Stages

### 1. Architecture Review
Send `plans/ARCHITECTURE.md` for review before creating features.

### 2. Feature Specification Review
Send each feature SPEC.md before creating tasks.

### 3. Task Review
Send each task YAML draft before finalizing.

### 4. Feature Completion Review
Send complete feature with all tasks for coherence check.

## Response Pattern

TASK_MASTER always returns:

1. **Understanding** - How they interpret the asset
2. **Questions** - Context-specific, not generic
3. **Suggested Enrichments** - Exact additions, not vague
4. **Flow Analysis** - Dependencies and what this enables
5. **Edge Cases** - What could go wrong
6. **Status** - `APPROVED` or `NEEDS_DISCUSSION`

## Collaboration Protocol

This is a **dialogue**, not a pass/fail checkpoint:

```
You create asset
        ↓
TASK_MASTER reviews (ULTRATHINK)
        ↓
Returns questions + suggestions
        ↓
You incorporate feedback
        ↓
Respond with updates
        ↓
Dialogue continues until APPROVED
```

## Example Invocation

```yaml
Task:
  subagent_type: task-master
  prompt: |
    # TASK_MASTER: Review Task Specification

    ## Project Context
    {full project context}

    ## Feature Context
    {feature description and role}

    ## Task Draft
    {task YAML}

    ## Target Agent: BACKEND

    ULTRATHINK and help me ensure this task is complete.
    Ask questions. Suggest enrichments. Challenge assumptions.
```

## Key Principle

> "If the implementing agent has to guess, the task specification failed."

TASK_MASTER ensures no guessing is required.
