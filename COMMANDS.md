# Slash Commands Reference

Complete reference for all slash commands available in Claude Project Manager.

---

## Quick Reference

| Command           | Purpose                                          |
| ----------------- | ------------------------------------------------ |
| `/work [task]`    | **Default** — Auto-detect agents and execute     |
| `/parallel [task]`| Run agents concurrently via Task tool            |
| `/onboard`        | Project setup with discovery questions           |
| `/status`         | Show current project state and progress          |
| `/qa`             | **Mandatory** — Validate before completion       |
| `/verify`         | Check contracts match implementation             |
| `/commit-push-pr` | Commit, push, and create PR                      |
| `/designer`       | Activate design agent                            |
| `/frontend`       | Activate frontend agent                          |
| `/backend`        | Activate backend agent                           |
| `/data`           | Activate database agent                          |
| `/devops`         | Activate infrastructure agent                    |
| `/orchestrator`   | Return to auto-coordination mode                 |
| `/planner`        | Generate architecture and specifications         |
| `/task-master`    | Validate task specifications with ULTRATHINK     |

---

## Workflow Commands

### `/work [task]`

**The default entry point for all implementation work.**

Automatically:
1. Analyzes your request for keywords
2. Detects which agents are needed
3. Groups agents by dependencies
4. Executes in parallel where possible
5. Runs QA validation at the end

**Examples:**

```
/work Create user profile page
→ Detects: DESIGNER, DATA, BACKEND, FRONTEND
→ Phase 1: DESIGNER + DATA (parallel)
→ Phase 2: BACKEND + FRONTEND (parallel)
→ Phase 3: QA

/work Add index to users table
→ Detects: DATA
→ Direct routing to DATA agent
→ QA validation
```

---

### `/parallel [task]`

**Explicitly run multiple agents concurrently.**

Same as `/work` but emphasizes parallel execution. Uses the Task tool to spawn agents as subprocesses.

```
/parallel Build user dashboard with activity feed
```

---

### `/onboard`

**Business-first project initialization.**

Guides you through a structured question flow:
- Phase 1: Business context (project name, description, target users)
- Phase 2: Feature-specific clarifications
- Phase 3: Architecture and contract generation (via PLANNER agent)

Outputs:
- `PROJECT.md` with summaries
- `contracts/*.yaml` (data-model, api, ui-flows)
- `plans/ARCHITECTURE.md`
- Feature specifications with tasks

---

### `/status`

**Show current project state.**

Displays:
- Active plan and feature
- Progress summary (completed/in-progress/pending)
- Agent status table
- Blockers
- Next suggested steps

---

### `/qa`

**Mandatory validation before completion.**

The QA agent validates:
- Contract compliance
- Test coverage (80%+ target)
- Edge case handling
- Security (injection, XSS, auth)
- Accessibility (WCAG 2.1 AA)
- Performance (response times, N+1 queries)

**Verdicts:**
- **PASSED** — Ready for deployment
- **FAILED** — Blocking issues listed, must fix

**No PR should be created until QA passes.**

---

### `/verify`

**Check contracts match implementation.**

Runs verification scripts:
- Hardcoded colors (should use design tokens)
- Hardcoded API URLs (should use env vars)
- Exposed secrets in code
- Missing contract updates
- Contract consistency

---

### `/commit-push-pr`

**Git workflow automation.**

1. Stages all changes
2. Creates commit with descriptive message
3. Pushes to remote
4. Opens a pull request

---

## Agent Commands

These commands explicitly activate a specific agent, bypassing auto-detection.

### `/designer`

**Design agent for UI/UX work.**

- Design tokens (colors, typography, spacing)
- Component specifications
- Responsive layouts
- Visual identity

Updates: `contracts/design-tokens.yaml`

---

### `/frontend`

**Frontend agent for React development.**

- React components
- API integration
- State management
- Responsive UI

Reads: `design-tokens.yaml`, `api-contracts.yaml`

---

### `/backend`

**Backend agent for API development.**

- Express endpoints
- Business logic
- TypeScript types
- API documentation

Updates: `contracts/api-contracts.yaml`

---

### `/data`

**Database agent for data modeling.**

- PostgreSQL schemas
- Migrations
- Sequelize models
- Query optimization

Updates: `contracts/database-contracts.yaml`

---

### `/devops`

**Infrastructure agent for deployment.**

- Docker configuration
- Nginx setup
- CI/CD pipelines
- Environment variables

Updates: `contracts/infra-contracts.yaml`

---

### `/orchestrator`

**Return to auto-coordination mode.**

After using an explicit agent command, use this to return to automatic agent detection and routing.

---

## Planning Commands

### `/planner`

**Architecture and specification generation.**

The PLANNER agent:
- Creates system architecture
- Generates all contracts
- Defines integration points
- Creates feature specifications
- Generates implementation tasks

---

### `/task-master`

**Task specification validation.**

Uses ULTRATHINK analysis to ensure task specifications are complete and unambiguous before implementation begins.

---

## Keyword Detection

The `/work` command detects agents based on keywords:

| Keywords                                         | Agent    |
| ------------------------------------------------ | -------- |
| design, colors, UI specs, typography, spacing    | DESIGNER |
| component, React, frontend, UI implementation    | FRONTEND |
| API, endpoint, route, backend, Express           | BACKEND  |
| database, schema, migration, model, query        | DATA     |
| Docker, deploy, CI/CD, infrastructure, nginx     | DEVOPS   |
| test, validate, QA, verify, check                | QA       |

**Multi-keyword = Multi-agent = Parallel execution**

---

## Command Files Location

All commands are implemented in:

```
.claude/commands/
├── work.md            # Auto-detect and route
├── parallel.md        # Parallel execution
├── onboard.md         # Project setup
├── status.md          # Status display
├── qa.md              # QA validation
├── verify.md          # Contract verification
├── commit-push-pr.md  # Git workflow
├── designer.md        # Design agent
├── frontend.md        # Frontend agent
├── backend.md         # Backend agent
├── data.md            # Data agent
├── devops.md          # DevOps agent
├── orchestrator.md    # Coordination mode
├── planner.md         # Architecture planning
└── task-master.md     # Task validation
```

---

## Best Practices

### Use Auto-Detection (Default)

```
# Preferred - let the framework decide
/work Create user authentication

# Explicit agent only when necessary
/backend Fix the auth middleware bug
```

### Always Run QA

```
# After implementation
/qa

# Only after QA passes
/commit-push-pr
```

### Check Status Regularly

```
/status
```

### Verify Before Committing

```
/verify
/commit-push-pr
```
