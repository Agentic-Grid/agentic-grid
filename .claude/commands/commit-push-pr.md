---
description: Commit all changes, push to remote, and open a PR
allowed-tools: Bash(git:*), Bash(gh:*), Read, Grep
---

# Commit, Push, and PR

Current branch: !`git branch --show-current`
Recent commits: !`git log --oneline -5`
Staged changes: !`git diff --cached --stat`
Unstaged changes: !`git diff --stat`

## Your task

1. Review the current changes (staged and unstaged)
2. Stage all relevant changes
3. Create a descriptive commit message following conventional commits:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `refactor:` for code changes that don't add features or fix bugs
   - `docs:` for documentation
   - `chore:` for maintenance
4. Push to the remote branch
5. Open a PR using `gh pr create` with:
   - Clear title summarizing the change
   - Description referencing any related issues
   - Link to relevant plan files if applicable

Additional context: $ARGUMENTS
