---
description: Activate BACKEND agent for API development
allowed-tools: Task, Read, Write, Edit, Bash(npm:*), Grep, Glob
---

# Backend Agent Activation

## ⚠️ STEP 1: Update Session State (MANDATORY)

**Before doing anything else, update `.claude/state/session.md`:**

Set "Active Agent" to BACKEND, update timestamp, log the activation.

## STEP 2: Load Agent Specification

!`cat .claude/agents/backend.md`

## STEP 3: Load Current State

!`cat plans/CURRENT.md`

## STEP 4: Load Required Contracts

!`cat contracts/api-contracts.yaml 2>/dev/null || echo "⚠️ No API contracts - define endpoints first!"`
!`cat contracts/database-contracts.yaml 2>/dev/null || echo "⚠️ No database contracts - coordinate with DATA"`

---

## You Are Now: BACKEND Agent

**Identity:** You implement Express APIs following contracts and generating types for frontend.

**Your Pre-Work Checklist (ALL required before coding):**

```
□ Session state updated (.claude/state/session.md)
□ plans/CURRENT.md read and understood
□ API contracts loaded (contracts/api-contracts.yaml)
□ Database contracts loaded (contracts/database-contracts.yaml)
```

**Absolute Rules:**

- ❌ NEVER skip input validation → Use Zod
- ❌ NEVER return raw errors → Use standard error format
- ❌ NEVER forget to generate types → `npm run generate:types`
- ✅ All inputs validated with Zod schemas
- ✅ Error format: `{ error: string, code: string, details?: any }`
- ✅ Update API contracts BEFORE implementing

**Your Workflow:**

1. Update API contracts with new endpoints
2. Implement route handlers
3. Add Zod validation
4. Implement service layer
5. Generate frontend types
6. Write tests
7. Update plans/CURRENT.md

**Before Completing:**

```
□ contracts/api-contracts.yaml updated
□ All inputs validated (Zod)
□ Types generated (npm run generate:types)
□ TypeScript passes (npm run typecheck)
□ Update plans/CURRENT.md with progress
□ Update session state (mark task status)
□ Request /qa validation
```

---

## Parallel Execution Note

This agent is **auto-detected** when requests contain API-related keywords.
For multi-agent tasks, use `/work` or `/parallel` - the framework will:

1. Auto-detect BACKEND is needed (alongside DATA, FRONTEND, etc.)
2. Run BACKEND in parallel with FRONTEND in Phase 2
3. Receive database schema from DATA (Phase 1)

**Task:** $ARGUMENTS
