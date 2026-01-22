---
description: Invoke PLANNER agent for architecture and specification generation
allowed-tools: Read, Write, Edit, Glob, Grep, Task, WebFetch
---

# /planner Command

Invokes the PLANNER agent to create architecture, contracts, and executable specifications.

## When to Use

- After `/onboard` completes discovery questions
- When starting a new feature that needs full specification
- When refactoring architecture of existing features
- Before any major implementation work

## Execution

```
/planner [project-path]
```

If no path provided, uses current directory.

---

## Prerequisites Check

Before running PLANNER, verify:

```yaml
Required Files:
  - QUESTIONS.yaml with status: complete
  OR
  - PROJECT.md with project definition
  - User requirements documented

Output Directory:
  - plans/ (will be created if missing)
  - contracts/ (will be created if missing)
```

---

## PLANNER Agent Invocation

Use the Task tool to spawn the PLANNER agent:

```
Task:
  subagent_type: Plan
  prompt: |
    You are the PLANNER agent. Read .claude/agents/planner.md for your full instructions.

    Your job is to create executable specifications that any agent can implement
    without guessing. Follow ALL 5 phases:

    1. Architecture Design - Create plans/ARCHITECTURE.md
    2. Create Contracts - Generate contracts/*.yaml files
    3. Feature Specifications - Create SPEC.md for each feature
    4. Generate Tasks - Create detailed task YAML files
    5. Integration Validation - Create plans/INTEGRATION_MATRIX.md

    Read the existing project files to understand the context:
    - QUESTIONS.yaml or PROJECT.md for requirements
    - Any existing contracts/ files
    - Any existing plans/ files

    Create specifications so detailed that agents know EXACTLY what to build.
    Every task must include:
    - WHAT to build (exact specifications)
    - HOW it connects (integration points)
    - WHY it exists (business context)
    - Expected results for validation

    Start by reading the project context, then execute all 5 phases.
```

---

## Expected Outputs

After PLANNER completes, these files should exist:

```
contracts/
├── data-model.yaml       # All entities, fields, relationships
├── api-contracts.yaml    # All endpoints with request/response specs
├── ui-flows.yaml         # All screens, states, interactions
└── design-tokens.yaml    # Design system (if new project)

plans/
├── ARCHITECTURE.md       # System overview and component diagram
├── INTEGRATION_MATRIX.md # Cross-component validation
├── CURRENT.md           # Updated with next actions
└── features/
    └── FEAT-XXX-{slug}/
        ├── feature.yaml  # Feature metadata
        ├── SPEC.md       # Full feature specification
        └── tasks/
            ├── TASK-001.yaml  # With full specification section
            ├── TASK-002.yaml
            └── ...
```

---

## Validation

After PLANNER completes, verify:

### Contracts Complete

- [ ] data-model.yaml has all entities with complete field definitions
- [ ] api-contracts.yaml has all endpoints with request/response specs
- [ ] ui-flows.yaml has all screens with states and interactions
- [ ] TypeScript types are included in each contract

### Specifications Complete

- [ ] Each feature has SPEC.md with user stories and acceptance criteria
- [ ] Each task has `specification` section with exact details
- [ ] Dependencies between tasks are explicit
- [ ] Expected results are testable

### Integration Validated

- [ ] INTEGRATION_MATRIX.md exists with component connections
- [ ] Data flows are documented end-to-end
- [ ] Gap analysis completed
- [ ] All agents have what they need to work independently

---

## Error Handling

### If QUESTIONS.yaml not found:

- Check if PROJECT.md exists with requirements
- If neither exists, run `/onboard` first

### If contracts already exist:

- PLANNER will READ existing contracts and UPDATE them
- Backup existing contracts before major changes

### If PLANNER fails mid-execution:

- Check plans/ and contracts/ for partial output
- Resume by running `/planner` again - it will continue from existing state

---

## Integration with Other Commands

```
/onboard → Collects requirements
    ↓
/planner → Creates specifications (YOU ARE HERE)
    ↓
/work    → Routes to agents for implementation
    ↓
/qa      → Validates against specifications
```

---

## Manual Invocation

If you need to run PLANNER for a specific feature only:

```
/planner --feature FEAT-001
```

This will:

1. Read existing contracts
2. Create/update SPEC.md for that feature only
3. Generate tasks for that feature
4. Validate integration with existing features
