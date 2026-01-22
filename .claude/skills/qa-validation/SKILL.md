---
name: qa-validation
description: End-to-end quality assurance - build, database, API, frontend, integration testing. Validates everything RUNS, not just compiles.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task, WebFetch
---

# QA End-to-End Validation Patterns

## Core Philosophy

> **"If you didn't test it running, it doesn't work."**

- Code review is NOT enough - you must RUN the code
- Linting is NOT enough - you must START the servers
- Unit tests are NOT enough - you must test INTEGRATION
- A feature is ONLY done when it works end-to-end

---

## Validation Phases (Execute in Order)

### Phase 1: Build Validation

```bash
# 1.1 Lint check
npm run lint
# Any errors = FAIL, fix before continuing

# 1.2 TypeScript check
npm run typecheck
# Any errors = FAIL, fix before continuing

# 1.3 Build check
npm run build
# Any errors = FAIL, fix before continuing
```

**Anti-pattern checks:**

```bash
# Check for 'any' types
grep -r ": any" --include="*.ts" --include="*.tsx" src/

# Check for console.logs
grep -r "console.log" --include="*.ts" --include="*.tsx" src/ | grep -v ".test."

# Check for TODO/FIXME
grep -r "TODO\|FIXME\|HACK" --include="*.ts" --include="*.tsx" src/
```

---

### Phase 2: Database Validation

```bash
# 2.1 Start database container
docker compose up -d postgres

# 2.2 Wait for ready
until docker compose exec postgres pg_isready; do sleep 2; done

# 2.3 Run migrations
npm run db:migrate

# 2.4 Verify schema
docker compose exec postgres psql -U postgres -d app_db -c "\dt"

# 2.5 Run seeds
npm run db:seed

# 2.6 Verify data
docker compose exec postgres psql -U postgres -d app_db -c "SELECT COUNT(*) FROM users"
```

**Checklist:**

```markdown
□ Container starts without errors
□ Migrations run successfully
□ All tables created per data-model.yaml
□ Indexes exist on foreign keys
□ Seeds populate test data
□ Can connect and query
```

---

### Phase 3: API Server Validation

```bash
# 3.1 Start API server
cd api && npm run dev &

# 3.2 Wait for ready
sleep 5
curl -f http://localhost:3001/health

# 3.3 Test endpoints from api-contracts.yaml
```

**For EACH endpoint, test:**

```bash
# Happy path
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Validation error (400)
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid"}'

# Unauthorized (401)
curl -X GET http://localhost:3001/api/v1/users

# Not found (404)
curl -X GET http://localhost:3001/api/v1/users/nonexistent-id
```

**Checklist:**

```markdown
□ Server starts without errors
□ Health endpoint responds
□ All endpoints return correct status codes
□ Response shapes match api-contracts.yaml
□ Error messages match contract definitions
□ Auth/authz working correctly
□ Rate limiting active (if applicable)
```

---

### Phase 4: Frontend Server Validation

```bash
# 4.1 Start frontend
cd dashboard && npm run dev &

# 4.2 Wait for ready
sleep 10
curl -f http://localhost:5173
```

**Code quality checks:**

```bash
# Missing useEffect dependencies
grep -r "useEffect\s*(\s*\(\)\s*=>" --include="*.tsx" src/

# Fetching in components (should use hooks/context)
grep -r "fetch\|axios" --include="*.tsx" src/components/

# Missing keys in lists
grep -rn "\.map\s*(" --include="*.tsx" src/ | head -20
```

**Anti-patterns to find:**

```typescript
// 1. Missing dependency array
useEffect(() => { fetchData(); }); // BAD - no deps

// 2. Infinite loops
useEffect(() => { setData(x); }, [data]); // BAD - loop

// 3. Redundant fetches
useFetch('/api/users'); useFetch('/api/users'); // BAD - duplicate

// 4. Missing error handling
return <div>{data.name}</div>; // BAD - crashes if null

// 5. Missing loading state
return isLoading ? null : <Content />; // BAD - no skeleton
```

**Checklist:**

```markdown
□ Dev server starts without errors
□ No console errors on page load
□ No infinite loops or excessive re-renders
□ Data fetching uses proper hooks/context
□ Error boundaries in place
□ All routes render correctly
```

---

### Phase 5: Premium UI Validation (MANDATORY)

#### Animation & Motion Checklist

```markdown
□ Buttons: hover scale (1.02) + shadow increase
□ Buttons: active/press scale (0.98)
□ Cards: hover lift (-2px translateY) + shadow
□ Inputs: focus border glow transition
□ Inputs: error shake animation (400ms)
□ Modals: backdrop fade + content scale
□ Dropdowns: slide + fade + stagger items
□ Toggles: smooth slide with bounce
□ Checkboxes: pop scale on check
□ Page transitions: fade/slide between routes
□ All transitions use proper easing (cubic-bezier)
```

#### Loading States Checklist

```markdown
□ Full page: skeleton with shimmer animation
□ Content areas: skeleton matches content shape
□ Buttons: spinner replaces text, size maintained
□ Forms: all fields disabled during submit
□ Lists: loading indicator for pagination
□ Images: placeholder/blur while loading
□ No layout shifts when content loads
```

#### User Feedback Checklist

```markdown
□ Click: immediate visual feedback (< 100ms)
□ Hover: state change visible (< 150ms)
□ Focus: ring/glow indicator visible
□ Form success: toast/checkmark animation
□ Form error: shake + error message slide
□ Delete actions: confirmation modal
□ Network error: offline indicator + retry
□ All errors visible (no silent failures)
```

#### Design Token Compliance

```bash
# Check for hardcoded colors
grep -r "#[0-9a-fA-F]\{3,6\}" --include="*.tsx" --include="*.css" src/

# Check for hardcoded spacing
grep -r "padding:\s*[0-9]" --include="*.tsx" src/
grep -r "margin:\s*[0-9]" --include="*.tsx" src/

# All values should come from design tokens
```

**Checklist:**

```markdown
□ All colors from design-tokens.yaml
□ All spacing from 8px grid
□ All font sizes from typography scale
□ All shadows from shadow scale
□ Dark mode works for all components
□ Responsive: mobile/tablet/desktop
```

---

### Phase 6: Integration Testing

#### Full Flow Testing

Test complete user journeys:

```markdown
## Flow: User Login

1. Visit /login
2. Fill email + password
3. Click submit
4. Verify: loading state appears
5. Verify: redirected to /dashboard
6. Verify: user data displayed
7. Verify: auth token stored

## Flow: Create Resource

1. Login first
2. Navigate to /resources/new
3. Fill form
4. Click submit
5. Verify: loading state
6. Verify: success toast
7. Verify: resource in list
```

#### Error Flow Testing

```markdown
## Flow: Invalid Login

1. Visit /login
2. Enter wrong password
3. Click submit
4. Verify: loading state
5. Verify: error message (shake)
6. Verify: form NOT cleared
7. Verify: can retry

## Flow: Network Error

1. Disable network
2. Attempt action
3. Verify: error state
4. Verify: retry option
5. Enable network
6. Click retry
7. Verify: success
```

---

## Issue Resolution Protocol

### When Issues Found:

1. **Document Issue**

```yaml
issue:
  id: QA-001
  severity: critical|high|medium|low
  category: build|database|api|frontend|ui|integration
  component: [file/endpoint/component]
  description: Clear description
  reproduction:
    - Step 1
    - Step 2
  expected: What should happen
  actual: What happens
  evidence: Error message/trace
  agent: DATA|BACKEND|FRONTEND|DEVOPS
```

2. **Spawn Specialist Agent**

```
Task:
  subagent_type: [frontend|backend|data]
  prompt: |
    QA found issue needing immediate fix:

    **Issue:** QA-001
    **Severity:** {severity}
    **Component:** {component}

    **Problem:** {description}

    **Steps to Reproduce:**
    {reproduction}

    **Expected:** {expected}
    **Actual:** {actual}

    Fix NOW and explain what you changed.
```

3. **Re-Validate**

- Re-run the failing test
- If still fails → send back to agent
- If passes → mark resolved, continue

**NEVER stop until all issues fixed.**

---

## Quality Gates

### Build Gate

- [ ] No lint errors
- [ ] No TypeScript errors
- [ ] Build succeeds

### Database Gate

- [ ] Container starts
- [ ] Migrations run
- [ ] Schema matches contract
- [ ] Seeds work

### API Gate

- [ ] Server starts
- [ ] All endpoints work
- [ ] Responses match contract
- [ ] Auth works

### Frontend Gate

- [ ] Server starts
- [ ] No console errors
- [ ] No anti-patterns
- [ ] Integration works

### Premium UI Gate

- [ ] All animations present
- [ ] All loading states work
- [ ] User feedback on all actions
- [ ] Design tokens used

### Integration Gate

- [ ] Full flows work
- [ ] Error flows work
- [ ] State management correct

---

## Validation Report Template

```markdown
# QA Validation Report

**Feature:** {name}
**Date:** {date}
**Status:** ✅ PASSED | ❌ FAILED

## Summary

| Phase       | Status | Issues | Fixed |
| ----------- | ------ | ------ | ----- |
| Build       | ✅/❌  | X      | X     |
| Database    | ✅/❌  | X      | X     |
| API         | ✅/❌  | X      | X     |
| Frontend    | ✅/❌  | X      | X     |
| Premium UI  | ✅/❌  | X      | X     |
| Integration | ✅/❌  | X      | X     |

## Issues Found & Resolved

### QA-001: {title}

- Severity: {severity}
- Agent: {agent}
- Status: ✅ Fixed
- Resolution: {what was done}

## Verdict

✅ PASSED - Feature complete and working end-to-end.

OR

❌ FAILED - Must fix:

1. {issue}
2. {issue}
```

---

## Definition of Done

Feature is **ONLY** complete when:

1. ✅ All quality gates pass
2. ✅ All issues fixed
3. ✅ Re-validation confirms fixes
4. ✅ End-to-end flows tested
5. ✅ QA Report shows PASSED

**If ANY gate fails, feature is NOT done.**

---

## Anti-Patterns (NEVER DO)

❌ Mark done without running servers
❌ Skip database validation
❌ Accept "works on my machine"
❌ Ignore "minor" UI issues
❌ Stop after first issue found
❌ Trust "fixed" claims without re-test
❌ Skip error flow testing
❌ Accept any unresolved issues

---

## Continuous Validation Loop

```
START → Run Phase → Issues?
                      │
                      ├─ Yes → Document → Spawn Agent → Wait Fix → Re-Validate
                      │                                              │
                      │                    ┌─────────────────────────┘
                      │                    │
                      │                    ├─ Still Fails → Back to Agent
                      │                    │
                      │                    └─ Passes → Continue
                      │
                      └─ No → Next Phase → All Done? → ✅ COMPLETE
```

**Never stop until ALL phases pass.**
