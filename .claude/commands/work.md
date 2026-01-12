---
description: REQUIRED entry point for all implementation work. Routes to correct agent with proper context loading.
allowed-tools: Read, Write, Edit, Bash(./scripts/*), Task
---

# Work Router (Mandatory Entry Point)

## Step 1: Analyze Request

Read the user's request: **$ARGUMENTS**

## Step 2: Route to Agent

Based on the request, determine the agent:

| Request Pattern | Agent | Next Step |
|-----------------|-------|-----------|
| Design, UI specs, colors, typography, spacing | DESIGNER | Load designer context |
| React component, frontend, UI implementation | FRONTEND | Load frontend context |
| API endpoint, Express route, backend logic | BACKEND | Load backend context |
| Database, migration, model, query | DATA | Load data context |
| Docker, deployment, CI/CD, infrastructure | DEVOPS | Load devops context |
| Test, validate, QA, verify, check | QA | Load QA context |
| Planning, multiple agents needed | ORCHESTRATOR | Load orchestrator context |

## Step 3: Update Session State

**IMMEDIATELY update `.claude/state/session.md`:**

```markdown
**Active Agent:** [AGENT_NAME]
**Activated At:** [CURRENT_TIMESTAMP]
**Task:** [BRIEF_DESCRIPTION]
```

And add to the Activation Log table.

## Step 4: Load Required Context

Execute these reads IN ORDER:

```bash
cat plans/CURRENT.md
cat .claude/agents/[agent-name].md
cat contracts/[relevant-contract].yaml
```

For each agent, the relevant contracts are:
- DESIGNER: design-tokens.yaml
- FRONTEND: design-tokens.yaml, api-contracts.yaml
- BACKEND: api-contracts.yaml, database-contracts.yaml
- DATA: database-contracts.yaml
- DEVOPS: infra-contracts.yaml
- QA: all contracts

## Step 5: Execute Agent Workflow

Follow the loaded agent's workflow EXACTLY as specified in its `.claude/agents/[name].md` file.

## Step 6: Post-Work Checklist

Before marking complete:
- [ ] Contracts updated (if interfaces changed)
- [ ] plans/CURRENT.md updated with progress
- [ ] Session state updated (mark task complete in log)
- [ ] /qa run if implementation work was done

---

## Why This Command Exists

This command enforces the agent-based workflow by:

1. **Forcing agent selection** — Cannot proceed without choosing an agent
2. **Automatically loading context** — Reads required files before work
3. **Updating session state** — Creates paper trail of agent activation
4. **Following agent workflow** — Uses the agent's defined process

**All implementation work should go through this command.**

Instead of: "Create a login form"
Use: `/work Create a login form`

The router will:
1. Identify FRONTEND agent is needed
2. Update session state
3. Load CURRENT.md, frontend agent spec, design tokens, API contracts
4. Execute using frontend agent's workflow
5. Remind about contract updates and QA
