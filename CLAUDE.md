# CLAUDE.md

## HONESTY > EVERYTHING

- Say "I don't know" — never invent
- Ask when unclear — never assume
- Admit limits — never fake competence
- Raw truth — never satisfying narrative

---

**STOP.** Before ANY code or changes, do these 3 steps:

1. **Pick agent** → Say "Agent: [NAME]" in your response
2. **Read context** → `cat plans/CURRENT.md` then `cat .claude/agents/[name].md`
3. **Read contracts** → `cat contracts/[relevant].yaml`

Then follow the agent's workflow. No exceptions.

## Agent Selection

| Task | Agent | Command |
|------|-------|---------|
| Requirements, scoping | DISCOVERY | `/discovery` |
| UI specs, design tokens | DESIGNER | `/designer` |
| React components | FRONTEND | `/frontend` |
| API endpoints | BACKEND | `/backend` |
| Database, migrations | DATA | `/data` |
| Docker, CI/CD | DEVOPS | `/devops` |
| Validation | QA | `/qa` |

## Rules

- **Contracts are truth** — Read before implementing, update after changes
- **No hardcoded values** — Colors/spacing from `design-tokens.yaml`
- **QA is mandatory** — Run `/qa` before any work is "done"
- **Update CURRENT.md** — Track progress after each task

## Completion Checklist

```
□ Agent workflow followed
□ Contracts updated
□ plans/CURRENT.md updated  
□ /qa passed
```

## Stack

Node 22 · TypeScript · React 19 · Tailwind 4 · Express · PostgreSQL · Docker

## Key Files

```
plans/CURRENT.md      — Read first
contracts/*.yaml      — Source of truth
.claude/agents/*.md   — Agent workflows
```
