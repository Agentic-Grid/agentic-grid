# Enhanced Discovery Workflow

> **Purpose:** Interview users about project requirements and automatically generate feature/task files.

## Overview

The Enhanced Discovery Workflow extends the base DISCOVERY agent to automatically generate YAML files for features and tasks after requirements gathering. This enables seamless handoff to the orchestration system.

---

## Interview Flow

### Phase 1: Project Foundation (Required)

Ask these questions in order, waiting for user responses:

```markdown
## 1. Project Identity

- What is the project name?
- One-sentence description of what it does?

## 2. Target Users

- Who are the primary users? (personas)
- What is their technical sophistication? (low/medium/high)
- What devices/browsers must we support?

## 3. Core Features (Must-Have)

- What are the absolute must-have features for MVP?
- List them in priority order (P0 = critical, P1 = important, P2 = nice-to-have)

## 4. Nice-to-Have Features (Post-MVP)

- What features would you like after MVP?
- Any future vision/roadmap items?

## 5. Technical Constraints

- Any existing systems to integrate with?
- Preferred tech stack? (or use project defaults)
- Performance requirements?
- Security/compliance needs?

## 6. Timeline/Priority

- What's the urgency? (ASAP / This week / This month / Flexible)
- Any hard deadlines?
```

### Phase 2: Clarification (As Needed)

For each feature listed, ask:

- What does success look like for this feature?
- Any specific UI/UX requirements?
- What data does this feature need?

### Phase 3: Confirmation

Present summary and ask:

```markdown
## Summary

**Project:** [name]
**Description:** [description]

**Core Features (MVP):**

1. [Feature 1] - P0
2. [Feature 2] - P1
   ...

**Post-MVP Features:**

1. [Feature X]
   ...

**Constraints:**

- [Constraint 1]
  ...

**Timeline:** [urgency]

---

Does this accurately capture your requirements? [Yes / No / Modify]
```

---

## Output Generation

After user confirms requirements, automatically generate:

### 1. PRD.md (Product Requirements Document)

Location: `plans/features/FEAT-XXX-[slug]/PRD.md`

```markdown
# [Project Name] - Product Requirements Document

## Executive Summary

[2-3 sentence overview based on user description]

## Problem Statement

[What problem are we solving and for whom]

## Goals & Success Metrics

| Goal                  | Metric         | Target         |
| --------------------- | -------------- | -------------- |
| [Goal from interview] | [How measured] | [Target value] |

## User Personas

### Persona 1: [From interview]

- **Role:** [context]
- **Goals:** [what they want]
- **Pain Points:** [frustrations]
- **Tech Comfort:** [level from interview]

## Scope

### In Scope (MVP)

- [P0 and P1 features from interview]

### Out of Scope (Future)

- [P2 and nice-to-have features]

### Constraints

- [Technical constraints from interview]

## Requirements

### Functional Requirements

| ID     | Requirement     | Priority | Agent            |
| ------ | --------------- | -------- | ---------------- |
| FR-001 | [From features] | P0/P1/P2 | [Assigned agent] |

### Non-Functional Requirements

| ID      | Requirement     | Target           |
| ------- | --------------- | ---------------- |
| NFR-001 | Performance     | [From interview] |
| NFR-002 | Accessibility   | WCAG 2.1 AA      |
| NFR-003 | Browser Support | [From interview] |

## Timeline

[Based on urgency from interview]

## Risks & Mitigations

| Risk              | Impact | Likelihood | Mitigation |
| ----------------- | ------ | ---------- | ---------- |
| [Identified risk] | H/M/L  | H/M/L      | [Strategy] |
```

### 2. feature.yaml

Location: `plans/features/FEAT-XXX-[slug]/feature.yaml`

```yaml
id: FEAT-XXX
slug: [kebab-case-name]
title: "[Feature Name from interview]"
status: planning
priority: high

created_at: "[ISO timestamp]"
updated_at: "[ISO timestamp]"

description: |
  [Description from interview, expanded with context]

requirements:
  [Category from interview]:
    - "[Requirement 1]"
    - "[Requirement 2]"

owner: ORCHESTRATOR
agents_required:
  - [List agents based on task types detected]

phases:
  - phase: 1
    name: "Foundation & Design"
    agents: [DISCOVERY, DESIGNER, DATA]
    parallel: true
    tasks: [TASK-001, TASK-002, TASK-003]
    status: pending

  - phase: 2
    name: "Core Implementation"
    agents: [BACKEND, FRONTEND]
    parallel: true
    dependencies: [phase-1]
    tasks: [TASK-004, TASK-005]
    status: pending

  - phase: 3
    name: "Integration & Polish"
    agents: [FRONTEND, DEVOPS]
    parallel: true
    dependencies: [phase-2]
    tasks: [TASK-006, TASK-007]
    status: pending

  - phase: 4
    name: "Validation"
    agents: [QA]
    parallel: false
    dependencies: [phase-3]
    tasks: [TASK-008]
    status: pending

documentation:
  spec: plans/features/FEAT-XXX-[slug]/PRD.md
  design: plans/features/FEAT-XXX-[slug]/design-spec.md
  schema: plans/features/FEAT-XXX-[slug]/data-schema.md

qa:
  required: true
  status: pending
  acceptance_criteria:
    - "[Criterion from interview]"
```

### 3. TASK-XXX.yaml files

Location: `plans/features/FEAT-XXX-[slug]/tasks/TASK-XXX.yaml`

Generate one task file per identified work item. See task-template.yaml for format.

---

## Task Assignment Rules

Map task types to responsible agents:

| Task Keywords                                                 | Agent     | Task Type      |
| ------------------------------------------------------------- | --------- | -------------- |
| UI design, colors, spacing, layout, typography, visual spec   | DESIGNER  | design         |
| Database, schema, migrations, models, queries, data structure | DATA      | schema         |
| API, endpoints, routes, services, backend logic               | BACKEND   | implementation |
| Components, hooks, pages, React, frontend, UI implementation  | FRONTEND  | implementation |
| Docker, CI/CD, scripts, deployment, infrastructure            | DEVOPS    | automation     |
| Testing, validation, QA, acceptance criteria                  | QA        | validation     |
| Requirements, discovery, user stories, PRD                    | DISCOVERY | enhancement    |

## Dependency Calculation Rules

Automatically calculate dependencies based on:

1. **Design before Frontend** - DESIGNER tasks block FRONTEND tasks
2. **Schema before API** - DATA tasks block BACKEND tasks
3. **Backend before Frontend** (when API needed) - BACKEND tasks may block FRONTEND
4. **All implementation before QA** - QA tasks depend on all implementation tasks

## Phase Grouping Rules

1. **Phase 1 (Foundation):** DISCOVERY, DESIGNER, DATA - can run in parallel
2. **Phase 2 (Core):** BACKEND, FRONTEND - can run in parallel (after Phase 1)
3. **Phase 3 (Integration):** Tasks requiring multiple agent outputs
4. **Phase 4 (Validation):** QA - always last, sequential

---

## User Approval Flow

After generating all files:

1. Display execution plan summary:

```markdown
## Execution Plan

**Feature:** FEAT-XXX - [Title]
**Total Tasks:** [N]
**Estimated Phases:** [N]

### Phase 1: Foundation & Design (Parallel)

| Task     | Agent     | Description |
| -------- | --------- | ----------- |
| TASK-001 | DISCOVERY | [Title]     |
| TASK-002 | DESIGNER  | [Title]     |
| TASK-003 | DATA      | [Title]     |

### Phase 2: Core Implementation (Parallel)

| Task     | Agent    | Description | Depends On |
| -------- | -------- | ----------- | ---------- |
| TASK-004 | BACKEND  | [Title]     | TASK-003   |
| TASK-005 | FRONTEND | [Title]     | TASK-002   |

[... more phases ...]

---

**Do you approve this plan?**

- [Yes] - Proceed with execution
- [No] - Cancel and revise
- [Modify] - Adjust specific tasks
```

2. Wait for explicit user approval
3. If approved, add `approved_at` timestamp to feature.yaml
4. If modified, regenerate affected tasks
5. If rejected, return to interview phase

---

## File Naming Conventions

- Feature ID: `FEAT-XXX` (XXX = zero-padded number, e.g., FEAT-001)
- Task ID: `TASK-XXX` (per feature, starts at 001)
- Slug: kebab-case version of feature name (e.g., "User Authentication" -> "user-authentication")
- Directory: `plans/features/FEAT-XXX-[slug]/`

## ID Generation

To get next available IDs:

1. Read `plans/features/.index.yaml` for `next_feature_id`
2. If no index exists, scan existing directories for highest FEAT-XXX number
3. Increment by 1 for new feature

---

## Checklist Before Generation

- [ ] All required interview questions answered
- [ ] Features have clear acceptance criteria
- [ ] Technical constraints documented
- [ ] User confirmed summary is accurate
- [ ] Agent assignments make sense for each task
- [ ] Dependencies are logical (no circular deps)
- [ ] Phase grouping enables parallel execution

---

## Example Session

```
User: I want to build a todo app

Claude (DISCOVERY): Let me gather requirements for your todo app.

## 1. Project Identity
What would you like to call this project?

User: TaskMaster

Claude: Got it - TaskMaster. One-sentence description?

User: A simple task management app with categories and due dates

Claude:
## 2. Target Users
Who are the primary users?

User: Personal use, maybe small teams later

Claude: Technical sophistication level?

User: Medium - comfortable with web apps

Claude: Device/browser requirements?

User: Desktop and mobile, modern browsers

[... continues through all questions ...]

Claude:
## Summary
**Project:** TaskMaster
**Description:** A simple task management app with categories and due dates

**Core Features (MVP):**
1. Create/edit/delete tasks - P0
2. Categorize tasks - P0
3. Set due dates - P1
4. Mark complete - P0

**Post-MVP:**
1. Team sharing
2. Notifications

**Timeline:** This week

Does this capture your requirements? [Yes/No/Modify]

User: Yes

Claude: Generating feature and task files...

[Creates FEAT-002-taskmaster/feature.yaml]
[Creates FEAT-002-taskmaster/PRD.md]
[Creates FEAT-002-taskmaster/tasks/TASK-001.yaml through TASK-008.yaml]

## Execution Plan Generated

**Feature:** FEAT-002 - TaskMaster
**Total Tasks:** 8
**Phases:** 4

[Shows plan table]

Do you approve this plan?
```
