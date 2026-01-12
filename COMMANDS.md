# Available Slash Commands

Quick reference for all available slash commands in this multi-agent framework.

---

## 🚀 Project Management

### `/orchestrator`

**Return to orchestrator mode (auto-coordinate agents)**

Returns to default mode where Claude automatically:

- Analyzes your requests
- Selects appropriate agent(s)
- Coordinates multiple agents for complex features
- Manages planning and progress

**When to use:** After using an explicit agent mode (`/designer`, `/frontend`, etc.) and you want to return to automatic agent coordination

**Example:**

```
User: "/frontend"              # Explicit frontend mode
User: "Build login form"       # Works only on frontend
User: "/orchestrator"          # Back to auto mode
User: "Build user dashboard"   # Auto-coordinates all needed agents
```

---

### `/setup`

**Initialize a new project**

Starts an interactive setup process that asks about:

- Project name and description
- UI languages needed (English, Portuguese, Spanish, etc.)
- Main features to build
- Technical preferences

Creates `PROJECT.md` with all project context.

**When to use:** First time using the framework, or starting a new project

---

### `/status`

**Show current project status**

Displays:

- Current active plan
- Progress summary (completed/in-progress/pending)
- Which agents are working on what
- Any blockers or issues
- Next suggested steps

**When to use:** Check project progress, see what's next

---

### `/verify`

**Run contract verification**

Checks for:

- Hardcoded colors in frontend (should use design tokens)
- Hardcoded API URLs (should use env vars)
- Exposed secrets in code
- Missing contract files
- Contract consistency

**When to use:** Before committing code, before deployment, periodic quality checks

---

## 👥 Agent Mode Commands

These commands explicitly switch to a specific agent mode.

### `/designer`

**Switch to DESIGNER agent mode** 🎨

**Use for:**

- Creating UX/UI designs
- Building design systems from references
- Defining color palettes and visual styles
- Creating component specifications
- Designing layouts and user flows

**Delivers:**

- Complete design system in `contracts/design-tokens.yaml`
- Component specs with all states
- HTML/CSS templates
- Design-to-frontend handoff docs

**Expertise:** UX/UI design, visual identity, design systems, accessibility

---

### `/frontend`

**Switch to FRONTEND agent mode** ⚛️

**Use for:**

- Building React components
- Implementing designs from DESIGNER
- Integrating with backend APIs
- Creating responsive interfaces
- Client-side logic

**Delivers:**

- Production-ready React components
- Type-safe TypeScript code
- API integrations following contracts
- Responsive, accessible UIs

**Expertise:** React, TypeScript, component architecture, frontend patterns

**Obsessed with:** Reusable components, small files (<250 lines), no duplication

---

### `/backend`

**Switch to BACKEND agent mode** 🔧

**Use for:**

- Building REST APIs
- Implementing business logic
- Authentication and authorization
- Service architecture
- API documentation

**Delivers:**

- RESTful API endpoints
- Service layer implementations
- Updated API contracts
- TypeScript types for frontend
- API documentation

**Expertise:** Node.js, Express, TypeScript, API design, security

**Obsessed with:** Modular services, small files (<200 lines), clean architecture

---

### `/data`

**Switch to DATA agent mode** 🗄️

**Use for:**

- Designing database schemas
- Creating migrations
- Building Sequelize models
- Query optimization
- Data modeling

**Delivers:**

- Database schema in contracts
- Migration files
- Sequelize ORM models
- Optimized query patterns
- Index strategies

**Expertise:** PostgreSQL, Sequelize, database design, query optimization

**Obsessed with:** Performance, preventing N+1 queries, data integrity

---

### `/devops`

**Switch to DEVOPS agent mode** 🚀

**Use for:**

- Docker configuration
- Nginx setup
- SSL certificates
- CI/CD pipelines
- Server deployment
- Monitoring and backups

**Delivers:**

- Docker configurations
- Nginx configs
- GitHub Actions workflows
- Infrastructure contracts
- Deployment documentation

**Expertise:** Docker, nginx, SSL, CI/CD, Linux servers, GitHub Actions

**Obsessed with:** Reliable deployments, security, always having a rollback plan

---

## 🎯 When to Use Which Command

### Starting a New Project

```
1. Run /setup
2. Answer the setup questions
3. Begin building features (agents automatically selected)
```

### Building a Feature

```
Claude will automatically select agents based on your request:

"Design a login page" → DESIGNER
"Implement the login page" → FRONTEND (after DESIGNER)
"Create user authentication API" → DATA → BACKEND
"Deploy to production" → DEVOPS
```

### Explicit Agent Selection

Use agent commands when you want to:

- Work on something specific in a single domain
- Continue work that was interrupted
- Override automatic agent selection
- Focus deeply on one area without switching

**Example:**

```
User: "/designer"
Claude: [Switches to DESIGNER mode]
        "What design work should I focus on?"

User: "Design the dashboard layout"
Claude: [Follows DESIGNER workflow to create dashboard design]

User: "/orchestrator"
Claude: [Returns to auto-coordination mode]
        "What would you like to build?"

User: "Now build the analytics feature"
Claude: [Automatically coordinates DESIGNER → DATA → BACKEND → FRONTEND]
```

**💡 Remember:** Use `/orchestrator` to return to automatic agent coordination after using any explicit agent mode.

### Checking Quality

```
Run /verify periodically to catch:
- Hardcoded values that should use tokens
- Missing contract updates
- Security issues
```

### Checking Progress

```
Run /status to see:
- What's been completed
- What's in progress
- What's coming next
- Any blockers
```

---

## 💡 Pro Tips

### Automatic vs Explicit Mode Switching

**Automatic (Recommended):**

```
User: "Build a user registration feature"
Claude: [Automatically coordinates DESIGNER → DATA → BACKEND → FRONTEND]
```

**Explicit:**

```
User: "/backend"
Claude: [Switches to BACKEND mode]
User: "Create the user registration API"
Claude: [Works in BACKEND mode only]
```

### Combining Commands

**Good workflow:**

```
1. /status                    # See what's in progress
2. "Build login feature"      # Let Claude coordinate agents
3. /verify                    # Check quality before committing
4. /status                    # Confirm completion
```

### When Agents Get Confused

If Claude seems to have forgotten context:

```
1. /status                    # Reload current state
2. [Agent command]            # Explicitly switch to needed agent
3. Describe what you need     # Clear, specific request
```

---

## 🔧 Command Implementation

All commands are implemented as Markdown files in:

```
.claude/commands/
├── setup.md      # Project initialization
├── status.md     # Project status display
├── verify.md     # Contract verification
├── designer.md   # DESIGNER agent mode
├── frontend.md   # FRONTEND agent mode
├── backend.md    # BACKEND agent mode
├── data.md       # DATA agent mode
└── devops.md     # DEVOPS agent mode
```

Each command:

- Has a description for auto-completion
- Loads the appropriate agent context
- Follows the agent's workflow
- Updates plans and contracts

---

## 📚 Related Documentation

- **README.md** - Complete framework overview
- **QUICKSTART.md** - 5-minute getting started guide
- **agents/\*.md** - Detailed agent workflows and standards
- **contracts/\*.yaml** - Technical contracts between agents
- **plans/CURRENT.md** - Current active plan (all agents read this)

---

## ❓ Getting Help

**For framework usage:**

```
Read README.md and QUICKSTART.md
```

**For specific agent workflows:**

```
Read agents/[AGENT].md for detailed guidelines
```

**For checking what's happening:**

```
/status - Always your first stop
```

**For quality assurance:**

```
/verify - Run before commits and deployments
```

---

**Quick Reference Card:**

```
/orchestrator → Auto-coordinate mode (default) 🎯
/setup        → Start new project
/status       → Check progress
/verify       → Check quality

/designer     → Design mode 🎨
/frontend     → Frontend mode ⚛️
/backend      → Backend mode 🔧
/data         → Database mode 🗄️
/devops       → DevOps mode 🚀
```

---

_Built with honesty, structured for reliability_ ✨
