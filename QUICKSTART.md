# 🚀 QUICKSTART GUIDE

Get your project up and running in 5 minutes!

---

## Step 1: Copy This Template

```bash
# Clone or copy the project folder to your new project location
cp -r /path/to/this/project /path/to/your-new-project
cd /path/to/your-new-project
```

---

## Step 2: Open in Claude Code

Open Claude Code in your project directory:

```bash
cd /path/to/your-new-project
claude-code .
```

Or open it through your IDE's Claude Code extension.

---

## Step 3: Run Setup

In Claude Code, type:

```
/setup
```

Or simply say:

```
Set up my project
```

Claude will ask you:

- Project name and description
- UI languages needed
- Core features
- Tech stack preferences

---

## Step 4: Start Building!

After setup completes, say:

```
Start development on [first feature]
```

Claude will:

1. Create a detailed feature plan
2. Coordinate the right agents
3. Guide you through implementation
4. Keep everything synchronized

---

## Common Commands

### Check Status

```
/status
```

Shows current progress, agent status, and next steps.

### Switch Agents (Optional)

```
/designer   - Explicitly work on design
/frontend   - Work on frontend code
/backend    - Work on backend code
/data       - Work on database
/devops     - Work on deployment
```

Usually Claude switches agents automatically, but you can be explicit.

### Verify Contracts

```
Run contract verification
```

Checks for:

- Hardcoded values (should use design tokens)
- Missing contract updates
- Secrets in code

---

## File Structure Overview

```
/your-project/
├── CLAUDE.md          ← Read by Claude on startup
├── PROJECT.md         ← Your project details (auto-generated)
├── README.md          ← Full documentation
├── plans/
│   └── CURRENT.md     ← Always shows current status
├── agents/            ← Agent specifications (read-only)
├── contracts/         ← Technical contracts (updated by agents)
├── app/               ← Your frontend code goes here
├── api/               ← Your backend code goes here
└── resources/         ← Add your requirements & references
```

---

## Tips for Success

### ✅ DO:

- Trust the process - let agents follow their workflows
- Check `plans/CURRENT.md` to see status anytime
- Add requirements to `/resources/requirements/`
- Add design inspiration to `/resources/references/`
- Review contract files when agents update them

### ❌ DON'T:

- Skip quality checks
- Hardcode values (use design tokens)
- Commit secrets to git
- Modify agent files without understanding impact

---

## Example First Project

**Goal:** Build a simple task manager

### 1. Run Setup

```
/setup
```

**Answer:**

- Name: "TaskMaster"
- Description: "A simple task management app with user accounts"
- Languages: English
- Features: User auth, create tasks, edit tasks, delete tasks, mark complete
- Tech: All defaults (React, TailwindCSS, JWT, etc.)

### 2. Start Development

```
Start with authentication feature
```

Claude will:

1. Create feature plan
2. **DESIGNER** designs login/register UI
3. **DATA** creates user schema
4. **BACK** implements auth API
5. **FRONT** implements auth components
6. **DEVOPS** prepares deployment

### 3. Continue

```
Now build the task management feature
```

Repeat the process for each feature!

---

## Need Help?

### Read the Docs

- **README.md** - Complete documentation
- **CLAUDE.md** - How the orchestrator works
- **agents/\*.md** - How each agent works

### Check Status

```
/status
```

### Review Current Plan

```
Show me the current plan
```

Or just read `/plans/CURRENT.md`

### Common Issues

**"Agents not coordinating"**
→ Check that `CURRENT.md` is being updated after each task

**"Work not matching design"**
→ Verify FRONT is using design tokens from `contracts/design-tokens.yaml`

**"API integration broken"**
→ Check `contracts/api-contracts.yaml` matches implementation

---

## What Makes This Different?

### Traditional Approach:

```
User: "Build a login page"
Claude: [Writes code without planning]
Result: May not match design, may not integrate well
```

### Multi-Agent Approach:

```
User: "Build a login page"
Claude:
  1. Creates feature plan
  2. DESIGNER: Designs UX, updates design tokens
  3. DATA: Creates user schema, updates database contract
  4. BACK: Implements API, updates API contract, generates types
  5. FRONT: Implements UI using tokens and API types
Result: Coordinated, consistent, production-ready
```

**Benefits:**

- ✅ No hardcoded values (uses design tokens)
- ✅ No API mismatches (follows contracts)
- ✅ No database issues (schema defined first)
- ✅ Built-in quality checks
- ✅ Everything documented

---

## Ready?

```
/setup
```

**Let's build something amazing!** 🚀
