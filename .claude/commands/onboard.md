---
description: Business-first project onboarding - async-friendly initialization
allowed-tools: Read, Write, Edit, Glob, Grep, Task
---

# Project Onboarding (Business-First)

## Overview

This command handles project initialization through a structured question flow:

- **Phase 1**: Business context (required first)
- **Phase 2**: Feature-specific clarifications (based on Phase 1 answers)
- **Phase 3**: Architecture & Contracts (PLANNER agent generates specifications)

The flow is **async-friendly** - Claude writes questions to QUESTIONS.yaml, user answers via dashboard, Claude resumes to process answers.

---

## Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. CHECK STATE                                             │
│     • QUESTIONS.yaml exists? → Read and continue            │
│     • No file? → Create with Phase 1 questions              │
├─────────────────────────────────────────────────────────────┤
│  2. EVALUATE ANSWERS                                        │
│     • All required answered? → Proceed to next phase        │
│     • Missing answers? → Wait for user                      │
├─────────────────────────────────────────────────────────────┤
│  3. PHASE TRANSITIONS                                       │
│     • Phase 1 complete → Generate Phase 2 questions         │
│     • Phase 2 complete → Invoke PLANNER agent               │
├─────────────────────────────────────────────────────────────┤
│  4. PLANNER PHASE (when questions complete)                 │
│     • Create system architecture                            │
│     • Generate contracts (data-model, api, ui-flows)        │
│     • Create feature specifications                         │
│     • Generate implementation tasks with full specs         │
│     • Validate integration points                           │
├─────────────────────────────────────────────────────────────┤
│  5. OUTPUT (when PLANNER complete)                          │
│     • PROJECT.md with summaries                             │
│     • contracts/*.yaml (data-model, api, ui-flows)          │
│     • plans/ARCHITECTURE.md                                 │
│     • plans/INTEGRATION_MATRIX.md                           │
│     • Features with full specifications                     │
│     • Tasks with executable specifications                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Check Current State

First, check if QUESTIONS.yaml exists:

```bash
# Check for existing questions file
ls QUESTIONS.yaml 2>/dev/null
```

### If NO QUESTIONS.yaml exists:

Create it with Phase 1 (Business Context) questions:

```yaml
# QUESTIONS.yaml
version: "1.0"
status: pending
current_phase: 1

context:
  project_name: null
  project_summary: null
  problem_summary: null
  features_identified: []
  user_roles_identified: []
  tech_stack: null

phases:
  business:
    status: pending
    questions:
      - id: b1
        category: "Project Identity"
        question: "What is the project name?"
        type: text
        required: true
        answer: null

      - id: b2
        category: "Project Identity"
        question: "In 1-2 sentences, what does this project do?"
        type: text
        required: true
        placeholder: "e.g., A platform that connects freelance developers with startups"
        answer: null

      - id: b3
        category: "Project Identity"
        question: "What is the primary goal of this project?"
        type: single_select
        required: true
        options:
          - label: "Generate revenue"
            value: "revenue"
          - label: "Solve internal problem"
            value: "internal"
          - label: "Build community/audience"
            value: "community"
          - label: "Provide free service"
            value: "free_service"
        answer: null
        details: null

      - id: b4
        category: "Problem Statement"
        question: "What problem does this solve?"
        type: text
        required: true
        placeholder: "Describe the pain point or need this addresses"
        answer: null

      - id: b5
        category: "Problem Statement"
        question: "Who experiences this problem?"
        type: text
        required: true
        placeholder: "e.g., Small business owners who need quick development help"
        answer: null

      - id: b6
        category: "Features"
        question: "What are the MUST-HAVE features for MVP?"
        type: text
        required: true
        placeholder: "List 3-5 core features, one per line"
        answer: null

      - id: b7
        category: "Features"
        question: "What features can wait for later versions?"
        type: text
        required: false
        placeholder: "Nice-to-have features, one per line"
        answer: null

      - id: b8
        category: "User Roles"
        question: "Who are the different types of users?"
        type: text
        required: true
        placeholder: "e.g., Admin, Customer, Vendor, Guest"
        answer: null

      - id: b9
        category: "User Roles"
        question: "What can each user type do?"
        type: text
        required: true
        placeholder: "Describe main actions per user type"
        answer: null

      - id: b10
        category: "Technical"
        question: "Do you have a preferred tech stack?"
        type: single_select
        required: true
        options:
          - label: "Use recommended (React, Node, PostgreSQL)"
            value: "default"
          - label: "Let me specify"
            value: "custom"
        answer: null
        details: null

  features:
    status: pending
    questions: []

created_at: "{timestamp}"
updated_at: "{timestamp}"
answered_count: 0
total_required: 10
```

Then write `.onboard-status` file:

```
awaiting_answers
```

**STOP HERE** - Dashboard will show questions to user.

---

## Step 2: Process Answers (when resumed)

Read QUESTIONS.yaml and check answer status:

### Check Phase 1 Completion

All required business questions must have answers:

- b1 (project name) - required
- b2 (what it does) - required
- b3 (primary goal) - required
- b4 (problem) - required
- b5 (who has problem) - required
- b6 (MVP features) - required
- b7 (later features) - optional
- b8 (user types) - required
- b9 (user actions) - required
- b10 (tech stack) - required

### If Phase 1 Complete → Generate Phase 2 Questions

Based on features mentioned in b6, generate feature-specific questions:

**For each feature type detected:**

#### If "authentication" or "login" or "signup" mentioned:

```yaml
- id: f_auth_1
  category: "Authentication"
  question: "What authentication methods do you need?"
  type: multi_select
  required: true
  options:
    - label: "Email/Password"
      value: "email_password"
    - label: "OAuth (Google, GitHub, etc.)"
      value: "oauth"
    - label: "Magic Link (passwordless)"
      value: "magic_link"
    - label: "Enterprise SSO"
      value: "sso"
  answer: []

- id: f_auth_2
  category: "Authentication"
  question: "What user roles are needed?"
  type: text
  required: true
  placeholder: "e.g., Admin, User, Moderator"
  answer: null
```

#### If "payment" or "billing" or "subscription" mentioned:

```yaml
- id: f_pay_1
  category: "Payments"
  question: "What type of payments?"
  type: single_select
  required: true
  options:
    - label: "One-time purchases"
      value: "one_time"
    - label: "Subscriptions"
      value: "subscription"
    - label: "Both"
      value: "both"
  answer: null

- id: f_pay_2
  category: "Payments"
  question: "Which payment provider?"
  type: single_select
  required: true
  options:
    - label: "Stripe (recommended)"
      value: "stripe"
    - label: "PayPal"
      value: "paypal"
    - label: "Both"
      value: "both"
  answer: null
```

#### If "notification" or "email" or "alert" mentioned:

```yaml
- id: f_notif_1
  category: "Notifications"
  question: "What notification channels?"
  type: multi_select
  required: true
  options:
    - label: "Email"
      value: "email"
    - label: "Push notifications"
      value: "push"
    - label: "In-app notifications"
      value: "in_app"
    - label: "SMS"
      value: "sms"
  answer: []
```

#### If "dashboard" or "analytics" or "reporting" mentioned:

```yaml
- id: f_dash_1
  category: "Dashboard"
  question: "What metrics should the dashboard show?"
  type: text
  required: true
  placeholder: "e.g., User growth, Revenue, Active sessions"
  answer: null
```

Update QUESTIONS.yaml with Phase 2 questions, set `phases.business.status: complete`.

**STOP HERE** if Phase 2 questions were added - wait for answers.

---

## Step 3: Generate Project Plan

When ALL phases complete, generate the full project structure:

### 3.1 Create PROJECT.md

```markdown
# {project_name}

## Summary

{2-line summary from b2 answer}

## Problem

{Condensed from b4 + b5: who has problem + what problem}

## User Roles

| Role | Description | Key Actions |
| ---- | ----------- | ----------- |

{Parse from b8 + b9}

## Features (MVP)

{Numbered list from b6}

## Tech Stack

- Frontend: {from b10 or default: React 19, TypeScript, Tailwind CSS 4}
- Backend: {from b10 or default: Node.js 22, Express, TypeScript}
- Database: {from b10 or default: PostgreSQL 16}

## Quick Reference

- Features: {count}
- Tasks: {count}
- Estimated effort: {calculated} hours
```

### 3.2 Create plans/CURRENT.md

```markdown
# Current Progress

## Active Feature

{First feature name}

## Status

- Phase: Planning
- Tasks: 0/{total} complete

## Next Steps

1. Complete onboarding questions
2. Review generated plan
3. Start first feature implementation
```

### 3.3 Create Features and Tasks

For EACH feature identified, create:

#### Feature Directory Structure

```
plans/features/FEAT-{num}-{slug}/
├── feature.yaml
└── tasks/
    ├── TASK-001.yaml
    ├── TASK-002.yaml
    └── ...
```

#### feature.yaml Template

```yaml
id: FEAT-{num}
slug: { slug }
title: "{Feature Name}"
status: planning
priority: { high|medium|low }
phase: { num }

summary: |
  {Feature Name}: {One line description}.
  {Second line about scope/purpose}.

description: |
  {Detailed description from requirements}

user_stories:
  - "As a {role}, I want {action} so that {benefit}"

tasks:
  - TASK-001
  - TASK-002
  # ... based on feature complexity

acceptance_criteria:
  - "{Criterion 1}"
  - "{Criterion 2}"

created_at: "{timestamp}"
updated_at: "{timestamp}"
```

#### Task YAML Template (CRITICAL - Optimized Context)

```yaml
id: TASK-{num}
feature_id: FEAT-{num}
title: "{Task Title}"
agent: { DESIGNER|DATA|BACKEND|FRONTEND|DEVOPS|QA }
status: pending
priority: { high|medium|low }
type: { design|schema|implementation|automation|validation }
phase: { num }

# OPTIMIZED CONTEXT - This is the key innovation
context:
  # Layer 1: Project (2 lines, ~50 tokens)
  project: |
    {Project Name}: {One sentence what it does}.
    Goal: {Primary goal from b3 answer}.

  # Layer 2: Feature (2 lines, ~50 tokens)
  feature: |
    {Feature Name}: {One line description}.
    {Scope: what's included in this feature}.

  # Layer 3: Task Details (~200-500 tokens)
  task:
    objective: |
      {Clear statement of what this task accomplishes}

    requirements:
      - { Requirement 1 }
      - { Requirement 2 }
      - { Requirement 3 }

    files:
      create:
        - { path/to/new/file.ts }
      modify:
        - { path/to/existing/file.ts }

    contracts:
      - path: contracts/{relevant}.yaml
        section: "/{relevant-section}"

    depends_on_completed:
      - id: TASK-{prev}
        summary: "{What that task did}"

# EXPECTED RESULTS - For QA validation
expected_results:
  - description: "{What should be true}"
    test: "{How to verify it}"
  - description: "{What should be true}"
    test: "{How to verify it}"

estimated_minutes: { num }
actual_minutes: null
started_at: null
completed_at: null

progress:
  - timestamp: "{timestamp}"
    agent: ORCHESTRATOR
    action: created
    note: "Task created from onboarding"

qa:
  required: true
  status: pending
  checklist: []
  notes: null
```

### 3.4 Standard Task Breakdown Per Feature

For a typical feature, create these tasks in order:

1. **DESIGNER** - Design UI/UX for feature
2. **DATA** - Create database schema/models
3. **BACKEND** - Implement API endpoints
4. **FRONTEND** - Build UI components
5. **QA** - Validate feature end-to-end

Adjust based on feature type:

- API-only feature: Skip DESIGNER, FRONTEND
- UI-only feature: Skip DATA, BACKEND
- Infrastructure: Use DEVOPS instead

### 3.5 Invoke PLANNER Agent

**CRITICAL:** After questions are complete, invoke the PLANNER agent to create specifications.

Use the Task tool:

```
Task:
  subagent_type: Plan
  model: claude-opus-4-20250514
  prompt: |
    You are the PLANNER agent. Read .claude/agents/planner.md for your full instructions.

    Project: {project_name}
    Path: {project_path}

    All discovery questions have been answered. Your job is to create
    executable specifications that any agent can implement without guessing.

    Execute ALL 5 phases from planner.md:
    1. Architecture Design - Create plans/ARCHITECTURE.md
    2. Create Contracts - Generate contracts/*.yaml files from templates
    3. Feature Specifications - Create SPEC.md for each feature
    4. Generate Tasks - Create detailed task YAML files with specifications
    5. Integration Validation - Validate all parts connect properly

    Read QUESTIONS.yaml for the answered requirements.
    Copy contract templates from templates/contracts/*.yaml.

    Create specifications so detailed that agents know EXACTLY what to build.
```

### 3.6 Write Completion Marker

After PLANNER completes:

```bash
echo "complete" > .onboard-status
```

---

## Context Generation Rules

### Project Summary (MUST be 2 lines)

```
{Project Name}: {What it does in one sentence}.
Goal: {Primary business goal}.
```

Example:

```
DevMatch: Platform connecting freelance developers with startups for short-term projects.
Goal: Enable quick hiring of vetted developers for 1-4 week engagements.
```

### Feature Summary (MUST be 2 lines)

```
{Feature Name}: {What it does in one sentence}.
{Scope: What's included, who uses it}.
```

Example:

```
User Authentication: Secure login system with role-based access control.
Supports Developer and Company accounts with different permission levels.
```

### Task Instructions (Detailed but focused)

- Clear objective statement
- Specific requirements list
- Exact files to create/modify
- Contract references
- Completed dependencies

### Expected Results (Testable assertions)

Each expected result must be:

- Verifiable by QA agent
- Specific (not vague)
- Testable (can be checked)

---

## Error Handling

### If QUESTIONS.yaml is malformed:

- Log error
- Create fresh QUESTIONS.yaml
- Start from Phase 1

### If answers are incomplete:

- Don't proceed to next phase
- Keep status as "pending"
- Dashboard will prompt user

### If feature parsing fails:

- Create generic feature structure
- Add note for user to clarify

---

## Resume Behavior

When user runs `claude --resume <id>`:

1. Read QUESTIONS.yaml
2. Check for new answers
3. Process answers
4. Either:
   - Add more questions (if needed)
   - Generate plan (if complete)
5. Update .onboard-status

The flow is stateless - all state is in QUESTIONS.yaml.
