# Multi-Agent Development Framework

> A structured, contract-based development framework for Claude Code that coordinates specialized agents to build full-stack applications.

---

## 🎯 What Is This?

This is a **quickstart template** for building software projects with Claude Code using a multi-agent approach. Each "agent" is a specialized role (Designer, Frontend Dev, Backend Dev, Data Engineer, DevOps) with specific expertise, workflows, and quality standards.

**Key Features:**
- ✅ **Contract-based coordination** - Prevents mismatches between frontend/backend/database
- ✅ **Structured workflows** - Each agent follows proven best practices
- ✅ **Quality enforcement** - Built-in checklists and verification gates
- ✅ **Planning system** - Centralized planning keeps all agents synchronized
- ✅ **Honesty-first** - Based on principles of transparent, reliable AI assistance

---

## 🚀 Quick Start

### 1. Clone This Template

```bash
# Copy this directory structure for your new project
cp -r project/ /path/to/your-new-project/
cd /path/to/your-new-project/
```

### 2. Initialize Your Project

Open Claude Code in this directory and run:

```
/setup
```

Or simply type:

```
Set up my project
```

Claude will ask you about:
- Project name and description
- UI languages needed
- Main features
- Technical preferences

This creates your initial `PROJECT.md` and development plan.

### 3. Start Building!

Claude will guide you through the development process, coordinating the right agents for each task.

---

## 🤖 The Agent System

### How It Works

This framework uses **role-based context switching**. Claude Code is a single instance, but when working on different types of tasks, it:

1. Reads the relevant agent file (`agents/[AGENT].md`)
2. Loads project context (`PROJECT.md`)
3. Checks current plan (`plans/CURRENT.md`)
4. Reads relevant contracts (`contracts/*.yaml`)
5. Follows that agent's specific workflow and quality standards
6. Updates contracts and plans
7. Returns to orchestrator mode

**This provides:**
- Structured thinking for different work types
- Quality checklists specific to each role
- Clear handoffs between work phases
- Professional patterns and best practices

---

## 👥 Available Agents

### 🎨 DESIGNER (`agents/DESIGNER.md`)
**Expertise:** UX/UI design, visual identity, branding
**Delivers:**
- HTML/CSS component structures
- Design tokens (colors, typography, spacing)
- Component specifications with all states
- Responsive breakpoints

**Obsessed with:** Beautiful, premium interfaces and addictive UX

---

### ⚛️ FRONT (`agents/FRONT.md`)
**Expertise:** React development, component architecture, API integration
**Delivers:**
- Production-ready React components
- Type-safe frontend code
- API integrations following contracts
- Responsive, accessible interfaces

**Obsessed with:** Reusable components, small files, no code duplication

---

### 🔧 BACK (`agents/BACK.md`)
**Expertise:** Node.js/Express APIs, business logic, authentication
**Delivers:**
- RESTful API endpoints
- Service architecture
- TypeScript types for frontend
- API documentation

**Obsessed with:** Modular services, clean architecture, no large files

---

### 🗄️ DATA (`agents/DATA.md`)
**Expertise:** Database design, PostgreSQL, Sequelize ORM, query optimization
**Delivers:**
- Database schemas and migrations
- Optimized queries
- Data model specifications
- Index strategies

**Obsessed with:** Performance, data integrity, preventing N+1 queries

---

### 🚀 DEVOPS (`agents/DEVOPS.md`)
**Expertise:** Docker, nginx, SSL, CI/CD, GitHub Actions, Linux servers
**Delivers:**
- Deployment pipelines
- Infrastructure configuration
- Server setup and security
- Monitoring and backups

**Obsessed with:** Reliable deployments, security, always having a rollback plan

---

## 📐 The Planning System

### `/plans/CURRENT.md` - The Single Source of Truth

**ALL agents read this FIRST** before doing any work.

Shows:
- Current focus and active task
- Overall progress (completed/in-progress/pending)
- Agent status (who's working on what)
- Important notes and decisions

Updated after each agent completes work.

### `/plans/features/[name].md` - Feature Plans

Comprehensive plans for entire features:
- Multi-phase execution strategy
- All agent responsibilities
- Progress tracking per phase
- Dependencies and risks

### `/plans/tasks/[id]-[name].md` - Task Plans

Detailed plans for individual tasks:
- Implementation steps
- Dependencies and blockers
- Verification checklists

### `/plans/changes/[id]-[name].md` - Change Plans

Plans for refactors, migrations, technical debt:
- Impact analysis
- Risk assessment
- Rollback strategy

---

## 🤝 The Contract System

### Purpose: Prevent Inconsistencies

Contract files are the **single source of truth** for interfaces between agents.

### `/contracts/api-contracts.yaml`

**Owner:** BACK | **Consumers:** FRONT

Defines all API endpoints:
- Request/response schemas
- Error codes
- Authentication requirements
- Rate limiting

**Prevents:** Frontend expecting data Backend doesn't provide

---

### `/contracts/design-tokens.yaml`

**Owner:** DESIGNER | **Consumers:** FRONT

Defines all design system values:
- Colors (with CSS vars, Tailwind, JS exports)
- Typography (fonts, sizes, weights)
- Spacing scale
- Shadows, borders, animations

**Prevents:** Hardcoded values, visual inconsistency

---

### `/contracts/database-contracts.yaml`

**Owner:** DATA | **Consumers:** BACK

Defines database schema:
- Tables, columns, types
- Indexes and their purposes
- Relationships
- Optimized query patterns

**Prevents:** Backend models not matching database schema

---

### `/contracts/infra-contracts.yaml`

**Owner:** DEVOPS | **Consumers:** ALL

Defines infrastructure requirements:
- Environment variables for each environment
- Resource requirements
- Health check specifications
- Secrets documentation

**Prevents:** Deployment failures due to missing configuration

---

## 🔄 Typical Development Flow

### Example: Building a Login Page

1. **User:** "Create a login page"

2. **Orchestrator (Claude):**
   - Creates feature plan
   - Identifies agents needed: DESIGNER → DATA → BACK → FRONT
   - Updates `CURRENT.md`

3. **DESIGNER Agent:**
   - Reads `CURRENT.md` and feature plan
   - Designs login UI (considers UX psychology)
   - Updates `/contracts/design-tokens.yaml`
   - Creates HTML/CSS templates
   - Completes handoff document
   - Updates `CURRENT.md` → "Design complete, DATA can start"

4. **DATA Agent:**
   - Reads `CURRENT.md` and feature plan
   - Designs User table schema
   - Updates `/contracts/database-contracts.yaml`
   - Creates migration files
   - Provides optimized queries
   - Updates `CURRENT.md` → "Schema ready, BACK can implement"

5. **BACK Agent:**
   - Reads `CURRENT.md`, feature plan, database contract
   - Implements auth endpoints
   - Updates `/contracts/api-contracts.yaml`
   - Generates TypeScript types for FRONT
   - Creates API documentation
   - Updates `CURRENT.md` → "API ready, FRONT can integrate"

6. **FRONT Agent:**
   - Reads `CURRENT.md`, design specs, API contracts, design tokens
   - Implements login components
   - Uses design tokens (no hardcoded values)
   - Integrates with API endpoints
   - Handles all error cases
   - Updates `CURRENT.md` → "Login page complete"

7. **Orchestrator:**
   - Reviews completion
   - Updates feature plan progress
   - Suggests next steps

---

## 🎨 Using Slash Commands

### `/setup`
Initialize new project - asks questions and creates `PROJECT.md`

### `/designer`, `/frontend`, `/backend`, `/data`, `/devops`
Explicitly switch to specific agent mode

### `/status`
Show current project status and progress

### `/verify`
Run contract verification scripts

---

## ✅ Quality Gates

### Every Agent Has Quality Standards

**Will NOT mark work complete if:**
- Contract files not updated
- Quality checklist not passed
- Tests failing
- Security vulnerabilities present
- Accessibility issues found
- Code doesn't meet standards

**Examples:**
- FRONT: Won't complete if hardcoded colors (must use design tokens)
- BACK: Won't complete if TypeScript types not generated
- DATA: Won't complete if foreign keys have no indexes
- DEVOPS: Won't complete if no rollback plan tested

---

## 📚 Key Files Reference

### Read-Only (Part of Framework)
- `CLAUDE.md` - Orchestrator configuration
- `agents/*.md` - Agent specifications
- `templates/` - Templates for plans, handoffs, contracts

### Dynamic (Updated During Development)
- `PROJECT.md` - Project context and status
- `plans/CURRENT.md` - Current active plan
- `plans/features/` - Feature plans
- `contracts/*.yaml` - Technical contracts
- `app/` - Frontend code
- `api/` - Backend code

### User-Provided (YOU add these)
- **`resources/requirements/`** - ⚠️ **MANDATORY** requirements (MUST be followed)
- **`resources/references/`** - Visual inspiration (MAY influence design)

---

## 🎓 Best Practices

### For Users:

1. **Trust the Process**
   - Let Claude follow agent workflows
   - Don't skip quality checks
   - Plans keep everyone synchronized

2. **Provide Context**
   - Add requirements to `/resources/requirements/`
   - Add visual inspiration to `/resources/references/`
   - Answer questions thoroughly

3. **Review Contracts**
   - Check contract files when agents update them
   - These prevent bugs and rework

4. **Keep Plans Updated**
   - Claude updates plans automatically
   - Read `CURRENT.md` to see status

### For Claude (When Using This Framework):

1. **ALWAYS Read `CURRENT.md` First**
   - Before any work
   - Every single time

2. **Follow Agent Checklists**
   - Pre-work checklist before starting
   - Post-work checklist before completing
   - Quality gates must pass

3. **Update Contracts Religiously**
   - After implementing features
   - Before handing off to next agent

4. **Keep Plans Current**
   - Mark tasks complete immediately
   - Update agent status
   - Note any blockers

---

## 🛠️ Customization

### Modifying Agents

Edit agent files in `/agents/` to:
- Add tech stack preferences
- Modify workflows
- Add company-specific standards
- Change quality criteria

### Adding New Agents

1. Create `agents/NEW_AGENT.md`
2. Define expertise and responsibilities
3. Add to `CLAUDE.md` detection rules
4. Create contract file if needed
5. Add to `PROJECT.md` structure

---

## 🚨 Troubleshooting

### "Agents aren't coordinating well"
→ Check that `CURRENT.md` is being updated after each agent's work
→ Verify contracts are being updated
→ Ensure handoff documents are completed

### "Work not matching designs"
→ Check `/contracts/design-tokens.yaml` is updated by DESIGNER
→ Verify FRONT is importing tokens, not hardcoding

### "Frontend/Backend integration broken"
→ Check `/contracts/api-contracts.yaml` matches implementation
→ Run verification scripts to check consistency

### "Deployment failing"
→ Check all env vars in `/contracts/infra-contracts.yaml`
→ Verify health check endpoints implemented
→ Check DEVOPS pre-deployment checklist

---

## 🤝 Contributing

This framework is designed to evolve. To improve it:

1. Identify pain points or gaps
2. Update relevant agent files or contracts
3. Test with real projects
4. Document lessons learned
5. Share improvements

---

## 📜 License

[Your License Here]

---

## 🎯 Philosophy

This framework is built on principles of:

**Honesty Over Performance**
- Admitting uncertainty builds trust
- Checking before asserting prevents bugs
- Transparency beats false confidence

**Structure Over Chaos**
- Workflows prevent skipped steps
- Contracts prevent mismatches
- Plans keep everyone aligned

**Quality Over Speed**
- Quality gates prevent rework
- Checklists ensure nothing missed
- Standards make code maintainable

**Collaboration Over Silos**
- Agents coordinate through contracts
- Handoffs make knowledge explicit
- Plans make dependencies clear

---

**Ready to build? Run `/setup` and let's get started!** 🚀
