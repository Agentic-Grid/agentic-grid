---
name: agent-routing
description: CRITICAL - Loaded automatically to enforce agent-based development. Determines which agent must handle each type of work.
allowed-tools: Read
---

# Agent Routing System (MANDATORY)

## Purpose

This skill ensures **every task is routed to the correct agent**. Direct implementation without agent activation is forbidden.

## The Routing Rule

```
EVERY REQUEST → IDENTIFY AGENT → ACTIVATE AGENT → DO WORK
```

There is no path that skips agent activation.

## Task Classification

### DESIGNER Agent Required When:

- Creating or modifying visual designs
- Defining colors, typography, spacing
- Creating component specifications
- Designing user interfaces
- Updating design tokens
- Creating style guides
- Designing responsive layouts

**Keywords:** design, colors, typography, spacing, UI, visual, style, theme, branding, mockup, wireframe, layout

### FRONTEND Agent Required When:

- Writing React components
- Implementing UI from designs
- Handling frontend state
- Integrating with APIs
- Writing frontend tests
- Styling with Tailwind
- Creating hooks or utilities

**Keywords:** component, React, frontend, UI implementation, hook, state, Tailwind, JSX, TSX

### BACKEND Agent Required When:

- Creating API endpoints
- Writing Express routes
- Implementing business logic
- Creating services
- Writing backend tests
- Generating TypeScript types
- Handling authentication/authorization

**Keywords:** API, endpoint, route, Express, backend, service, controller, middleware, auth

### DATA Agent Required When:

- Designing database schemas
- Creating migrations
- Writing Sequelize models
- Optimizing queries
- Adding indexes
- Defining relationships
- Writing database seeds

**Keywords:** database, schema, migration, model, query, SQL, PostgreSQL, Sequelize, table, column, index

### DEVOPS Agent Required When:

- Writing Dockerfiles
- Creating CI/CD pipelines
- Configuring nginx
- Setting up deployments
- Managing infrastructure
- Configuring environments
- Setting up monitoring

**Keywords:** Docker, CI/CD, deploy, infrastructure, nginx, pipeline, GitHub Actions, environment, server

### QA Agent Required When:

- Validating implementations
- Running test suites
- Finding bugs
- Checking accessibility
- Security testing
- Performance testing
- Before ANY work is marked complete

**Keywords:** test, validate, QA, quality, bug, verify, check, review

## Routing Algorithm

```python
def route_task(task_description):
    # Step 1: Parse keywords
    keywords = extract_keywords(task_description)

    # Step 2: Match to agent
    if matches_designer(keywords):
        return "DESIGNER"
    elif matches_frontend(keywords):
        return "FRONTEND"
    elif matches_backend(keywords):
        return "BACKEND"
    elif matches_data(keywords):
        return "DATA"
    elif matches_devops(keywords):
        return "DEVOPS"
    elif matches_qa(keywords):
        return "QA"
    else:
        # Step 3: If unclear, orchestrator decides
        return "ORCHESTRATOR"

def execute_task(agent, task):
    # MANDATORY STEPS
    read_current_md()           # Always first
    load_agent_context(agent)   # Load agent spec
    read_relevant_contracts()   # Check interfaces
    execute_agent_workflow()    # Do the work
    update_contracts()          # Update if changed
    update_current_md()         # Track progress
    run_qa()                    # Validate
```

## Multi-Agent Tasks

Some tasks require multiple agents in sequence:

### Full Feature (most common)

```
DESIGNER → DATA → BACKEND → FRONTEND → QA
   ↓         ↓        ↓          ↓       ↓
 tokens   schema    APIs    components  validate
```

### API Feature

```
DATA → BACKEND → QA
  ↓       ↓       ↓
schema   APIs   validate
```

### UI Feature

```
DESIGNER → FRONTEND → QA
    ↓          ↓        ↓
  tokens   components  validate
```

### Infrastructure Change

```
DEVOPS → QA
   ↓      ↓
config  validate
```

## Agent Activation Protocol

When activating an agent:

1. **Announce the activation**

   ```
   "Activating FRONTEND agent for component implementation..."
   ```

2. **Read agent specification**

   ```
   Read: .claude/agents/frontend.md
   ```

3. **Load relevant skills**

   ```
   Skills auto-load based on agent and task
   ```

4. **Follow agent's pre-work checklist**

   ```
   As defined in agent specification
   ```

5. **Execute using agent's workflow**

   ```
   As defined in agent specification
   ```

6. **Complete agent's post-work checklist**
   ```
   As defined in agent specification
   ```

## Enforcement Checkpoints

### Checkpoint 1: Task Receipt

```
□ Task analyzed for required agent
□ Agent identified
□ Agent activation announced
```

### Checkpoint 2: Pre-Work

```
□ plans/CURRENT.md read
□ Relevant contracts read
□ Agent specification loaded
```

### Checkpoint 3: During Work

```
□ Following agent's workflow
□ Updating contracts as needed
□ No prohibited actions (hardcoded values, etc.)
```

### Checkpoint 4: Completion

```
□ Contracts updated
□ CURRENT.md updated
□ QA validation run
□ QA passed
```

## Error Recovery

### If wrong agent was used:

1. Stop immediately
2. Document what was done
3. Activate correct agent
4. Have correct agent review and fix

### If agent workflow was skipped:

1. Stop immediately
2. Return to pre-work checklist
3. Execute full workflow
4. Do not shortcut

### If contracts not updated:

1. Stop before marking complete
2. Review all changes made
3. Update relevant contracts
4. Verify consistency

## Anti-Patterns (FORBIDDEN)

### 1. Direct Implementation

```
❌ "Let me add this component..." [starts coding]
✅ "This requires FRONTEND agent. Activating..." [loads agent, follows workflow]
```

### 2. Agent Hopping

```
❌ Switching agents mid-task without completing workflow
✅ Complete current agent's workflow, then activate next agent
```

### 3. Skipping QA

```
❌ "That's done, what's next?"
✅ "Running QA validation before marking complete..."
```

### 4. Ignoring Contracts

```
❌ Implementing without reading contracts
✅ Read contracts → Implement to match → Update if changed
```

## Verification Questions

Before ANY implementation, ask:

1. "What agent should handle this?" → Route appropriately
2. "Have I loaded that agent's context?" → If no, load it
3. "Have I read CURRENT.md?" → If no, read it
4. "Have I checked contracts?" → If no, check them
5. "Am I following the agent's workflow?" → If no, start over

**If ANY answer is "no", STOP and correct before proceeding.**
