---
description: Initialize a new project with full discovery and requirements gathering
allowed-tools: Task, Read, Write, Edit, Bash
---

# Project Setup & Discovery

## Overview

This command guides you through the complete project initialization:

```
┌─────────────────────────────────────────────────────────┐
│                  PROJECT LIFECYCLE                       │
│                                                          │
│  /setup                                                  │
│     │                                                    │
│     ▼                                                    │
│  ┌──────────────────────────────────────────┐           │
│  │  PHASE 1: DISCOVERY                       │           │
│  │  • Stakeholder interviews                 │           │
│  │  • Requirements gathering                 │           │
│  │  • User stories & acceptance criteria     │           │
│  │  • Feature specifications                 │           │
│  └──────────────────────────────────────────┘           │
│     │                                                    │
│     ▼                                                    │
│  ┌──────────────────────────────────────────┐           │
│  │  PHASE 2: FOUNDATION                      │           │
│  │  • Project documentation                  │           │
│  │  • Contract initialization                │           │
│  │  • Code structure setup                   │           │
│  │  • Development environment                │           │
│  └──────────────────────────────────────────┘           │
│     │                                                    │
│     ▼                                                    │
│  ┌──────────────────────────────────────────┐           │
│  │  PHASE 3: DEVELOPMENT                     │           │
│  │  • DESIGNER → Design tokens               │           │
│  │  • DATA → Database schema                 │           │
│  │  • BACKEND → API implementation           │           │
│  │  • FRONTEND → UI components               │           │
│  │  • QA → Validation                        │           │
│  └──────────────────────────────────────────┘           │
│     │                                                    │
│     ▼                                                    │
│  ┌──────────────────────────────────────────┐           │
│  │  PHASE 4: DEPLOYMENT                      │           │
│  │  • DEVOPS → Infrastructure                │           │
│  │  • QA → Final validation                  │           │
│  │  • Launch                                 │           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Discovery (REQUIRED FIRST)

### Step 1.1: Understand the Project

Ask these questions (gather ALL information before proceeding):

**Business Context:**

1. What problem are we solving?
2. Who are the primary users?
3. Why is this being built now?
4. What does success look like?
5. What's the timeline?

**User Understanding:**

1. Who are the different user types?
2. What are their goals and pain points?
3. What's their technical sophistication?
4. What devices/browsers must we support?

**Product Vision:**

1. What's the MVP scope?
2. What features are must-have vs nice-to-have?
3. Are there competing products?
4. What makes this different?

**Technical Context:**

1. Any existing systems to integrate with?
2. Performance or security requirements?
3. Preferred tech stack (or use defaults)?

**Resources:**

1. Any existing mockups or designs?
2. Documentation or specs already created?
3. Brand guidelines?

### Step 1.2: Document Requirements

Create these files:

#### /resources/requirements/PRD.md

```markdown
# [Project Name] — Product Requirements Document

## Executive Summary

[2-3 sentence overview]

## Problem Statement

[What problem, for whom, current alternatives]

## Goals & Success Metrics

| Goal | Metric | Target |
| ---- | ------ | ------ |

## User Personas

[For each persona: role, goals, pain points, tech level]

## Scope

### In Scope (MVP)

### Out of Scope (Future)

### Constraints

## Requirements

### Functional Requirements (FR-001, FR-002...)

### Non-Functional Requirements (NFR-001, NFR-002...)

## Timeline

## Risks & Mitigations

## Open Questions
```

#### /resources/requirements/user-stories.md

```markdown
# User Stories

## Epic: [Name]

### US-001: [As a... I want... So that...]

**Priority:** P0/P1/P2
**Acceptance Criteria:**

- [ ] Given... when... then...
```

#### /resources/requirements/feature-specs/[feature].md

```markdown
# Feature: [Name]

## Overview

## User Stories (references)

## User Flow

## UI Requirements (screens, states, responsive)

## API Requirements (endpoints, data shapes)

## Database Requirements

## Acceptance Criteria

## Out of Scope
```

---

## Phase 2: Foundation

### Step 2.1: Project Documentation

Create/update PROJECT.md:

```markdown
# [Project Name]

## Vision

[From PRD]

## Tech Stack

- Frontend: React 19, TypeScript, Tailwind CSS 4
- Backend: Node 22, Express, TypeScript
- Database: PostgreSQL, Sequelize
- Infrastructure: Docker, GitHub Actions

## Features (Priority Order)

1. [P0 Feature]
2. [P0 Feature]
3. [P1 Feature]

## Quick Start

[Development setup instructions]
```

### Step 2.2: Initialize Contracts

Based on requirements, create initial contracts:

**contracts/design-tokens.yaml** — From UI requirements
**contracts/api-contracts.yaml** — From API requirements
**contracts/database-contracts.yaml** — From data requirements
**contracts/infra-contracts.yaml** — From deployment requirements

### Step 2.3: Code Structure

```bash
# Create directory structure
mkdir -p app/src/{components,hooks,utils,types,styles}
mkdir -p api/src/{routes,services,middleware,models,types}
mkdir -p resources/requirements/feature-specs
mkdir -p plans/{features,tasks,changes}

# Initialize package.json files
# Set up TypeScript configs
# Configure linting and formatting
```

### Step 2.4: Development Environment

- Docker Compose for local development
- Environment variable templates
- README with setup instructions

---

## Phase 3: Ready for Development

Update plans/CURRENT.md with:

- First feature to implement
- Agent sequence for that feature
- Link to feature spec

Create plans/features/[first-feature].md from template.

---

## Completion Checklist

Before setup is complete:

**Discovery:**

- [ ] PRD.md created with all sections
- [ ] User stories with acceptance criteria
- [ ] Feature specs for MVP features
- [ ] Priorities assigned

**Foundation:**

- [ ] PROJECT.md documents vision and stack
- [ ] All contract files initialized
- [ ] Code structure created
- [ ] Development environment ready

**Ready for Development:**

- [ ] plans/CURRENT.md has first task
- [ ] First feature plan created
- [ ] User knows to run `/designer` or `/discovery` next

---

## Quick Setup (if requirements already gathered)

If user already has requirements documented, skip to Phase 2:

```bash
# Check for existing requirements
ls resources/requirements/

# If PRD exists, proceed to foundation
# If not, run /discovery first
```

---

User's input: $ARGUMENTS
