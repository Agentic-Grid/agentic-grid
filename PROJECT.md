# Project Name

> Brief description of what this project does and why it exists.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| Backend | Node.js 22, Express, TypeScript |
| Database | PostgreSQL 16, Sequelize |
| Deployment | Docker, GitHub Actions |

## Project Structure

```
├── app/                    # Frontend (React)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── package.json
│
├── api/                    # Backend (Express)
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── package.json
│
├── contracts/              # Source of truth for interfaces
│   ├── api-contracts.yaml
│   ├── design-tokens.yaml
│   ├── database-contracts.yaml
│   └── infra-contracts.yaml
│
├── plans/                  # Development plans
│   ├── CURRENT.md          # Active work
│   ├── features/           # Feature plans
│   ├── tasks/              # Task plans
│   └── changes/            # Refactor plans
│
├── resources/              # User-provided resources
│   ├── requirements/       # MANDATORY specs
│   └── references/         # Visual inspiration
│
└── .claude/                # Claude Code configuration
    ├── commands/           # Slash commands
    ├── agents/             # Specialized agents
    ├── skills/             # Domain knowledge
    └── settings.json       # Permissions & hooks
```

## Development Workflow

### Using Claude Code

1. **Check current status:**
   ```
   /status
   ```

2. **Activate specialized agent:**
   ```
   /designer Create login page design
   /backend Implement user authentication API
   /frontend Build login form component
   ```

3. **Verify contracts:**
   ```
   /verify
   ```

4. **Commit and push:**
   ```
   /commit-push-pr
   ```

### Manual Development

```bash
# Frontend development
cd app && npm run dev

# Backend development
cd api && npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## Features

- [ ] Feature 1
- [ ] Feature 2
- [ ] Feature 3

## Team

- **Product Owner:** [Name]
- **Designer:** [Name]
- **Developers:** [Names]

## Links

- [Design Files](#)
- [API Documentation](#)
- [Deployment](#)

---

*This project uses the Multi-Agent Development Framework. See [README.md](README.md) for framework documentation.*
