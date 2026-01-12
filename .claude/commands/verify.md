---
description: Verify contracts match implementation and run quality checks
allowed-tools: Bash, Read, Grep, Glob
---

# Contract & Code Verification

## Run verification checks:

### 1. Contract Files Exist

!`ls contracts/*.yaml 2>/dev/null || echo "WARNING: No contract files found"`

### 2. Check for Hardcoded Design Values

!`grep -r "rgb\|rgba\|#[0-9a-fA-F]\{3,6\}" --include="*.tsx" --include="*.jsx" --include="*.css" app/ 2>/dev/null | head -20 || echo "No hardcoded colors found (good!)"`

### 3. Check for Magic Numbers

!`grep -r "margin:\s*[0-9]\|padding:\s*[0-9]\|gap:\s*[0-9]" --include="*.tsx" --include="*.css" app/ 2>/dev/null | head -10 || echo "No magic spacing numbers found (good!)"`

### 4. TypeScript Errors

!`npm run typecheck 2>&1 | tail -20 || echo "TypeScript check not configured"`

### 5. Lint Issues

!`npm run lint 2>&1 | tail -20 || echo "Linting not configured"`

### 6. Test Status

!`npm run test 2>&1 | tail -30 || echo "Tests not configured"`

## Your task

1. Run all verification checks above
2. Analyze the results for issues
3. Check if API implementation matches `contracts/api-contracts.yaml`
4. Check if database models match `contracts/database-contracts.yaml`
5. Check if design tokens are being used from `contracts/design-tokens.yaml`

## Report Format

**✅ Passing Checks:**

- List what's working correctly

**❌ Failing Checks:**

- List issues found with specific file:line references

**⚠️ Warnings:**

- List potential problems that should be reviewed

**📋 Recommendations:**

- Prioritized list of fixes needed

Focus area: $ARGUMENTS
