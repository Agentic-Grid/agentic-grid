# Multi-Agent Development Framework

> **Optimized for Claude Code** following Boris Cherny's guidelines
>
> A structured, contract-based development framework with **enforced agent workflows** that coordinates specialized AI agents to build full-stack applications.

---

## ⚠️ How This Framework Works

**This is not just guidance — it's an enforced workflow.**

1. **CLAUDE.md is a decision gate** — Claude must identify the agent and load context before ANY implementation
2. **Session state is tracked** — Every agent activation is logged in `.claude/state/session.md`
3. **Hooks verify compliance** — Pre/post tool hooks check workflow is followed
4. **QA is mandatory** — No work is complete without QA validation

**The workflow:**

```
User Request
    ↓
Read CLAUDE.md (decision gate)
    ↓
Identify required agent
    ↓
Update session state
    ↓
Load context (CURRENT.md, contracts)
    ↓
Execute agent workflow
    ↓
Update contracts
    ↓
Run QA validation
    ↓
Mark complete (only if QA passes)
```

---

## 🚀 Quick Start

```bash
# 1. Copy this template to your new project
cp -r base-project/ my-new-project/
cd my-new-project/

# 2. Initialize git
git init

# 3. Open Claude Code and run setup
/setup
```

---

## 📋 Full Project Lifecycle

This framework supports the **complete development lifecycle**, from idea to deployment:

```
┌─────────────────────────────────────────────────────────────┐
│                    PROJECT LIFECYCLE                         │
│                                                              │
│  PHASE 1: DISCOVERY (/setup or /discovery)                  │
│  ├─ Stakeholder interviews                                  │
│  ├─ Requirements gathering                                  │
│  ├─ User stories with acceptance criteria                   │
│  ├─ Feature specifications                                  │
│  └─ PRD (Product Requirements Document)                     │
│                         ↓                                    │
│  PHASE 2: DESIGN (/designer)                                │
│  ├─ Design tokens (colors, typography, spacing)             │
│  ├─ Component specifications                                │
│  └─ Responsive layouts                                      │
│                         ↓                                    │
│  PHASE 3: DATA MODELING (/data)                             │
│  ├─ Database schema design                                  │
│  ├─ Migrations                                              │
│  └─ Query patterns                                          │
│                         ↓                                    │
│  PHASE 4: BACKEND (/backend)                                │
│  ├─ API endpoints                                           │
│  ├─ Business logic                                          │
│  └─ TypeScript types for frontend                           │
│                         ↓                                    │
│  PHASE 5: FRONTEND (/frontend)                              │
│  ├─ React components                                        │
│  ├─ API integration                                         │
│  └─ State management                                        │
│                         ↓                                    │
│  PHASE 6: QA (/qa) — MANDATORY                              │
│  ├─ Validation against acceptance criteria                  │
│  ├─ Edge case testing                                       │
│  ├─ Security & accessibility checks                         │
│  └─ Pass/Fail verdict                                       │
│                         ↓                                    │
│  PHASE 7: DEPLOYMENT (/devops)                              │
│  ├─ Docker configuration                                    │
│  ├─ CI/CD pipelines                                         │
│  └─ Production deployment                                   │
└─────────────────────────────────────────────────────────────┘
```

### Requirements Documents Created in Discovery

| Document      | Location                                     | Purpose                               |
| ------------- | -------------------------------------------- | ------------------------------------- |
| PRD           | `/resources/requirements/PRD.md`             | Product requirements, personas, scope |
| User Stories  | `/resources/requirements/user-stories.md`    | Stories with acceptance criteria      |
| Feature Specs | `/resources/requirements/feature-specs/*.md` | Detailed feature specifications       |

### Templates Available

| Template     | Location                                           |
| ------------ | -------------------------------------------------- |
| PRD Template | `/templates/requirements/PRD-template.md`          |
| User Stories | `/templates/requirements/user-stories-template.md` |
| Feature Spec | `/templates/requirements/feature-spec-template.md` |
| Feature Plan | `/templates/plans/feature-template.md`             |

---

## 📁 Project Structure

```
├── CLAUDE.md                   # ⛔ MANDATORY decision gate (read first!)
├── CLAUDE.local.md             # Personal overrides (gitignored)
├── PROJECT.md                  # Project-specific info
├── .mcp.json                   # MCP server configuration
│
├── .claude/
│   ├── settings.json           # Permissions & enforcement hooks
│   ├── state/
│   │   └── session.md          # 📍 Tracks active agent (MUST update)
│   ├── commands/               # Slash commands
│   │   ├── work.md             # Routes to correct agent
│   │   ├── setup.md            # Full project setup with discovery
│   │   ├── discovery.md        # Requirements gathering
│   │   ├── designer.md         # Design agent
│   │   ├── frontend.md         # Frontend agent
│   │   ├── backend.md          # Backend agent
│   │   ├── data.md             # Database agent
│   │   ├── devops.md           # Infrastructure agent
│   │   ├── qa.md               # QA agent (mandatory gate)
│   │   ├── orchestrator.md     # Coordination mode
│   │   ├── parallel-execute.md # Run agents in parallel
│   │   ├── commit-push-pr.md   # Git workflow
│   │   ├── status.md           # Progress overview
│   │   └── verify.md           # Contract verification
│   ├── agents/                 # Subagent specifications
│   │   ├── discovery.md        # Requirements gathering
│   │   ├── designer.md
│   │   ├── frontend.md
│   │   ├── backend.md
│   │   ├── data.md
│   │   ├── devops.md
│   │   └── qa.md
│   └── skills/                 # Auto-loaded domain knowledge
│       ├── design-system/
│       ├── api-patterns/
│       ├── database-patterns/
│       ├── devops-patterns/
│       ├── testing-patterns/
│       ├── qa-validation/
│       ├── parallel-workflows/
│       ├── agent-spawner/      # Parallel agent execution
│       └── agent-routing/      # Enforces agent selection
│
├── contracts/                  # Source of truth for interfaces
│   ├── api-contracts.yaml      # API endpoints & types
│   ├── design-tokens.yaml      # Colors, spacing, typography
│   ├── database-contracts.yaml # Schema & queries
│   └── infra-contracts.yaml    # Environment & deployment
│
├── plans/
│   ├── CURRENT.md              # Active work (READ BEFORE ANYTHING)
│   ├── features/               # Feature plans
│   ├── tasks/                  # Task plans
│   └── changes/                # Refactor plans
│
├── resources/
│   ├── requirements/           # Mandatory specs (MUST follow)
│   └── references/             # Visual inspiration (MAY influence)
│
├── scripts/
│   ├── verify-contracts.sh     # Contract verification
│   ├── check-workflow.sh       # Pre-implementation check
│   └── post-check.sh           # Post-implementation check
│
├── templates/
│   └── plans/                  # Plan templates
│
└── .github/
    └── workflows/
        └── ci.yml              # GitHub Actions CI
```

---

## 🤖 Using the Agent System

### Available Commands

| Command             | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| `/setup`            | **Start here** — Full project setup with discovery phase |
| `/discovery`        | Requirements gathering and project scoping               |
| `/work [task]`      | Routes to correct agent automatically                    |
| `/designer`         | Activate design agent                                    |
| `/frontend`         | Activate frontend agent                                  |
| `/backend`          | Activate backend agent                                   |
| `/data`             | Activate database agent                                  |
| `/devops`           | Activate infrastructure agent                            |
| `/qa`               | **MANDATORY** - Validate before completion               |
| `/orchestrator`     | Return to coordination mode                              |
| `/parallel-execute` | Run multiple agents in parallel                          |
| `/status`           | Show current project state and progress                  |
| `/verify`           | Check contracts match implementation                     |
| `/commit-push-pr`   | Commit, push, and create PR                              |

### Full Project Workflow

```
/setup
   ↓
[Discovery Phase - gather requirements]
   ↓
/designer [create design system]
   ↓
/data [design database schema]
   ↓
/backend [implement APIs]
   ↓
/frontend [build UI components]
   ↓
/qa [validate everything]
   ↓
/devops [deploy]
```

### Typical Workflow (Single Session)

1. **Check status first:**

   ```
   /status
   ```

2. **Work on a feature:**

   ```
   Create a user profile page
   ```

   Claude automatically coordinates agents: DESIGNER → DATA → BACK → FRONT → **QA**

3. **Or invoke specific agent:**

   ```
   /designer Create profile card component
   /backend Implement profile API endpoint
   ```

4. **QA validates (mandatory):**

   ```
   /qa Validate the profile feature
   ```

5. **Verify and commit (only after QA passes):**
   ```
   /verify
   /commit-push-pr
   ```

> ⚠️ **Important:** No feature is complete until `/qa` has passed!

---

## ⚡ Parallel Execution (Multiple Sessions)

For faster development, run multiple agents simultaneously across separate Claude Code sessions.

### Agent Dependency Graph

```
┌─────────────────────────────────────┐
│        PARALLEL PHASE 1             │
│   DESIGNER    ←─────→    DATA       │
│   (tokens)              (schema)    │
└────────┬────────────────────┬───────┘
         └──────── SYNC ──────┘
                   ↓
┌─────────────────────────────────────┐
│        PARALLEL PHASE 2             │
│   FRONTEND    ←─────→   BACKEND     │
│   (components)          (APIs)      │
└────────┬────────────────────┬───────┘
         └──────── SYNC ──────┘
                   ↓
         ┌─────────────────┐
         │       QA        │
         │  (sequential)   │
         └─────────────────┘
```

### Setup Parallel Work

```bash
# 1. Plan the parallel execution
/parallel Create user profile feature

# 2. Create git worktrees
git worktree add ../project-designer feature/profile-design
git worktree add ../project-data feature/profile-data

# 3. Open separate terminals for each worktree
# Terminal 1:
cd ../project-designer && claude
/designer Create profile card specs

# Terminal 2:
cd ../project-data && claude
/data Design profile schema

# 4. At sync point, merge in main session
git merge feature/profile-design
git merge feature/profile-data

# 5. Continue with next parallel phase or QA
```

### When to Use Parallel Execution

| Scenario               | Parallel? | Why                              |
| ---------------------- | --------- | -------------------------------- |
| New full-stack feature | ✅ Yes    | DESIGNER + DATA can run together |
| Quick bug fix          | ❌ No     | Overhead not worth it            |
| Large refactor         | ✅ Yes    | Split by domain                  |
| API-only change        | ❌ No     | Sequential DATA → BACK           |

---

## 📐 Contract System

Contracts are the **single source of truth** for interfaces between agents.

### Contract Files

| File                      | Owner    | Purpose                                 |
| ------------------------- | -------- | --------------------------------------- |
| `api-contracts.yaml`      | BACKEND  | API endpoints, request/response schemas |
| `design-tokens.yaml`      | DESIGNER | Colors, typography, spacing             |
| `database-contracts.yaml` | DATA     | Tables, indexes, query patterns         |
| `infra-contracts.yaml`    | DEVOPS   | Environment variables, deployment       |

### Key Principle

**Update contracts BEFORE implementation:**

1. DESIGNER updates `design-tokens.yaml` before creating specs
2. DATA updates `database-contracts.yaml` before migrations
3. BACK updates `api-contracts.yaml` before implementing endpoints
4. FRONT reads contracts to ensure consistent integration

---

## ✅ Quality Gates

Every agent follows quality checklists. Work is **not complete** until:

- [ ] Relevant contract files updated
- [ ] TypeScript types generated/updated
- [ ] Tests passing
- [ ] No hardcoded values (colors, spacing)
- [ ] All states handled (loading, error, success)
- [ ] `plans/CURRENT.md` updated
- [ ] **QA agent has validated and approved** ✅

---

## 🔍 QA Agent (Mandatory Gate)

The QA agent is the **final quality gate** for all implementations:

```
/qa Validate the login feature
```

### What QA Validates:

- ✅ Contract compliance (API, design tokens, database)
- ✅ Automated tests passing with 80%+ coverage
- ✅ Edge case handling (null, empty, special chars)
- ✅ Security (injection, XSS, auth bypass)
- ✅ Accessibility (WCAG 2.1 AA)
- ✅ Performance (response times, N+1 queries)

### QA Verdicts:

- **✅ PASSED** - Ready for deployment
- **❌ FAILED** - Blocking issues listed, must fix and re-validate

### Issue Severity:

| Level       | Meaning                  | Blocks Deployment   |
| ----------- | ------------------------ | ------------------- |
| 🔴 Critical | Security hole, data loss | Yes                 |
| 🟠 High     | Major feature broken     | Yes                 |
| 🟡 Medium   | Works but has issues     | No (but should fix) |
| 🟢 Low      | Polish, minor issues     | No                  |

**No PR should be created until QA passes.**

---

## 🎨 Design System

Design tokens in `contracts/design-tokens.yaml` ensure visual consistency.

### Never Hardcode Values

❌ **Bad:**

```tsx
<div style={{ color: '#3b82f6', padding: '16px' }}>
```

✅ **Good:**

```tsx
<div className="text-primary-500 p-4">
// Or
import { colors, spacing } from '@/design-tokens';
<div style={{ color: colors.primary[500], padding: spacing[4] }}>
```

---

## 🔧 Customization

### Adding Your Stack

Edit `CLAUDE.md` to specify your tech stack:

```markdown
## Stack

Python 3.12 · FastAPI · PostgreSQL · React · Tailwind CSS
```

### Adding Custom Skills

Create `.claude/skills/your-skill/SKILL.md`:

```markdown
---
name: your-skill
description: When to load this skill
allowed-tools: Read, Grep
---

# Your Skill

[Domain knowledge here]
```

### Adding Custom Commands

Create `.claude/commands/your-command.md`:

```markdown
---
description: What this command does
allowed-tools: Bash, Read, Write
---

# Your Command

[Command instructions]

User input: $ARGUMENTS
```

---

## 📚 Best Practices

Based on **Boris Cherny's guidelines** (creator of Claude Code):

1. **Keep CLAUDE.md focused** (~2500 tokens)
   - What Claude gets wrong repeatedly
   - Project-specific conventions
   - Verification commands

2. **Use verification loops**
   - Give Claude ways to check its work
   - Improves quality 2-3x

3. **Contract-first development**
   - Update contracts before implementation
   - Prevents frontend/backend mismatches

4. **Compound learning**
   - Every mistake becomes a rule in CLAUDE.md
   - Framework improves over time

5. **Parallel execution**
   - Use multiple Claude sessions for different tasks
   - Each in separate git worktree

---

## 🛠️ Setup Checklist

When starting a new project:

- [ ] Copy this template
- [ ] Update `CLAUDE.md` with your stack
- [ ] Update `PROJECT.md` with project details
- [ ] Configure `.mcp.json` for your tools
- [ ] Add resources to `resources/requirements/`
- [ ] Run `/setup` to initialize

---

## 📄 License

MIT

---

**Ready to build? Run `/setup` and let's get started!** 🚀
