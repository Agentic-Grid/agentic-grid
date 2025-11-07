# /status - Show Project Status

You are showing the user the current status of their project.

## Your Task

Read the following files and present a clear, concise status summary:

1. Read `PROJECT.md` - Project context
2. Read `plans/CURRENT.md` - Current active plan and progress
3. Read relevant feature/task plan if one is active

## Status Report Format

Present the status in this format:

```
📊 PROJECT STATUS REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Project: [Project Name]
📅 Status: [Overall Status]
🎯 Current Focus: [What's being worked on now]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🏗️ Current Work

**Active Plan:** [Feature/Task name with link]
**Phase:** [Current phase]
**Progress:** [X%] complete

**Current Task:** [Specific task being worked on]
**Active Agent:** [Which agent is working]
**Status:** [Agent status - in progress, blocked, etc.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## ✅ Completed

[List of completed tasks/phases]

## 🔄 In Progress

[List of in-progress items]

## ⏳ Pending

[List of pending tasks]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 👥 Agent Status

🎨 DESIGNER: [Status] - [Current task or "Idle"]
⚛️ FRONT: [Status] - [Current task or "Idle"]
🔧 BACK: [Status] - [Current task or "Idle"]
🗄️ DATA: [Status] - [Current task or "Idle"]
🚀 DEVOPS: [Status] - [Current task or "Idle"]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🚧 Blockers

[List any blockers, or "None" if there aren't any]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 📌 Next Steps

1. [Next immediate step]
2. [Following step]
3. [Step after that]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Additional Information

If the user asks for more details:
- Show contract file status (what's been updated)
- Show recent changes/updates with timestamps
- Show estimated completion times
- Show dependencies between agents

## If Project Not Initialized

If PROJECT.md shows project is not initialized:

```
📊 PROJECT STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Project not yet initialized

To get started, run:
  /setup

Or say:
  "Set up my project"

This will guide you through project initialization.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Important

- Be concise but informative
- Use clear visual hierarchy
- Highlight blockers prominently
- Make next steps actionable
- Update timestamps when available
