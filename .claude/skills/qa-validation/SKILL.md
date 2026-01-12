---
name: qa-validation
description: Quality assurance patterns, validation checklists, and bug hunting strategies. Load when validating implementations, writing tests, or reviewing code quality.
allowed-tools: Read, Bash(npm:*), Bash(./scripts/*), Grep, Glob
---

# QA & Validation Patterns

## The QA Mindset

**Golden Rule:** If you didn't test it, it doesn't work.

### Assumptions to Challenge

1. "It works on my machine" → Test in production-like environment
2. "Users won't do that" → Users will do EXACTLY that
3. "The framework handles it" → Verify the framework handles it
4. "It's just a small change" → Small changes cause big bugs
5. "Tests passed" → Tests may not cover this case

## Validation Checklist by Layer

### API Validation

#### For Every Endpoint:

```markdown
□ Happy path returns correct data
□ Happy path returns correct status code
□ Response matches contract schema exactly
□ Required fields are actually required (400 on missing)
□ Invalid types return 400 (string for number, etc.)
□ String length limits enforced
□ Enum values validated
□ Unauthorized returns 401 (not 403, not 500)
□ Forbidden returns 403 (not 401, not 500)
□ Not found returns 404 (not 500)
□ Rate limiting works (429)
□ Request timeout handled
□ Large payloads handled (413 or truncated)
□ Content-Type validated
□ CORS headers correct
```

#### Security-Specific:

```markdown
□ SQL injection: Try `'; DROP TABLE users; --`
□ XSS: Try `<script>alert('xss')</script>`
□ Path traversal: Try `../../../etc/passwd`
□ Auth bypass: Try accessing without token
□ Auth bypass: Try with expired token
□ Auth bypass: Try with malformed token
□ Privilege escalation: Access other user's data
□ Mass assignment: Send extra fields in request
□ Rate limiting: Rapid requests blocked
□ Sensitive data not logged
```

### Frontend Validation

#### Component Checklist:

```markdown
□ Renders without console errors
□ Props are typed (no `any`)
□ Default props work
□ Required props enforced
□ Loading state renders
□ Error state renders
□ Empty state renders
□ Success state renders
□ Handles null/undefined data gracefully
□ No memory leaks (useEffect cleanup)
□ Event handlers don't throw
□ Responsive: mobile (< 640px)
□ Responsive: tablet (640-1024px)
□ Responsive: desktop (> 1024px)
```

#### Form Validation:

```markdown
□ Empty submission blocked
□ Required field indicators visible
□ Validation on blur
□ Validation on submit
□ Error messages clear and specific
□ Error messages accessible (aria-describedby)
□ Submit button disabled while loading
□ Can't double-submit
□ Success message shown
□ Form resets after success (if appropriate)
□ Handles network error gracefully
□ Tab order logical
□ Enter key submits form
```

#### Accessibility (WCAG 2.1 AA):

```markdown
□ All images have alt text
□ Decorative images have alt=""
□ Links have descriptive text (not "click here")
□ Form inputs have labels
□ Labels associated with inputs (for/id)
□ Color contrast ≥ 4.5:1 (normal text)
□ Color contrast ≥ 3:1 (large text)
□ Focus visible on all interactive elements
□ Focus order logical
□ No keyboard traps
□ Skip link present
□ Headings in logical order (h1 → h2 → h3)
□ ARIA labels on icon buttons
□ Error messages announced to screen readers
□ Loading states announced
□ Modals trap focus
□ Modals return focus on close
```

### Database Validation

```markdown
□ Migrations run without error
□ Migrations are reversible (down works)
□ Foreign key constraints enforced
□ NOT NULL constraints enforced
□ UNIQUE constraints enforced
□ CHECK constraints enforced
□ Indexes exist on FK columns
□ Indexes exist on frequently queried columns
□ No N+1 queries (check query logs)
□ Transactions used for multi-step operations
□ Deadlocks handled
□ Connection pool not exhausted
□ Large datasets don't timeout
□ Soft deletes work correctly
□ Timestamps auto-update
```

## Common Bug Patterns

### Off-by-One Errors

```typescript
// BUG: Array index out of bounds
for (let i = 0; i <= array.length; i++) // Should be <

// BUG: Pagination shows wrong page
const offset = page * limit; // Should be (page - 1) * limit

// BUG: Date comparison
if (date > deadline) // Should be >= for "on or after"
```

### Null/Undefined Bugs

```typescript
// BUG: Optional chaining missing
const name = user.profile.name; // Crashes if profile is null
const name = user?.profile?.name; // Safe

// BUG: Falsy value treated as missing
if (!count) return "No items"; // 0 is valid, shows wrong message
if (count === undefined) return "No items"; // Correct

// BUG: Default value for falsy
const limit = options.limit || 10; // 0 becomes 10
const limit = options.limit ?? 10; // 0 stays 0
```

### Async Bugs

```typescript
// BUG: Race condition
const [users, setUsers] = useState([]);
useEffect(() => {
  fetchUsers().then(setUsers); // Old request might resolve after new
}, [filter]);

// FIX: Cancel outdated requests
useEffect(() => {
  const controller = new AbortController();
  fetchUsers({ signal: controller.signal }).then(setUsers);
  return () => controller.abort();
}, [filter]);

// BUG: Missing await
async function save() {
  validate(); // Should be: await validate()
  saveToDb();
}
```

### State Bugs

```typescript
// BUG: Stale closure
const [count, setCount] = useState(0);
const increment = () => setCount(count + 1); // Captures stale count
const increment = () => setCount((c) => c + 1); // Always current

// BUG: Object mutation
const updateUser = () => {
  user.name = "New"; // Mutates original, React won't re-render
  setUser(user);
};
// FIX:
const updateUser = () => {
  setUser({ ...user, name: "New" });
};
```

### Security Bugs

```typescript
// BUG: SQL injection
const query = `SELECT * FROM users WHERE id = ${userId}`;
// FIX: Parameterized query
const query = `SELECT * FROM users WHERE id = $1`;

// BUG: XSS vulnerability
element.innerHTML = userInput;
// FIX: Use textContent or sanitize
element.textContent = userInput;

// BUG: Sensitive data in URL
`/api/users?password=${password}`;
// FIX: Use POST body

// BUG: Exposing internal errors
res.status(500).json({ error: err.stack });
// FIX: Generic message
res.status(500).json({ error: "Internal server error" });
```

## Test Patterns

### Unit Test Structure

```typescript
describe('ComponentName', () => {
  describe('when [condition]', () => {
    it('should [expected behavior]', () => {
      // Arrange
      const props = { ... };

      // Act
      render(<Component {...props} />);

      // Assert
      expect(screen.getByText('...')).toBeInTheDocument();
    });
  });
});
```

### Edge Case Tests to Always Write

```typescript
describe("edge cases", () => {
  it("handles empty input", () => {});
  it("handles null input", () => {});
  it("handles undefined input", () => {});
  it("handles very long input", () => {});
  it("handles special characters", () => {});
  it("handles unicode characters", () => {});
  it("handles zero", () => {});
  it("handles negative numbers", () => {});
  it("handles future dates", () => {});
  it("handles past dates", () => {});
  it("handles network failure", () => {});
  it("handles timeout", () => {});
  it("handles concurrent requests", () => {});
});
```

### API Test Patterns

```typescript
describe("POST /api/users", () => {
  // Happy path
  it("creates user with valid data", async () => {});

  // Validation
  it("returns 400 for missing email", async () => {});
  it("returns 400 for invalid email format", async () => {});
  it("returns 400 for short password", async () => {});

  // Business rules
  it("returns 409 for duplicate email", async () => {});

  // Auth
  it("returns 401 without token", async () => {});
  it("returns 403 for non-admin", async () => {});

  // Edge cases
  it("handles email with unicode", async () => {});
  it("trims whitespace from inputs", async () => {});
});
```

## Performance Validation

### Response Time Targets

| Endpoint Type        | Target  | Max Acceptable |
| -------------------- | ------- | -------------- |
| Simple GET           | < 50ms  | 100ms          |
| List with pagination | < 100ms | 200ms          |
| Complex query        | < 200ms | 500ms          |
| File upload          | < 1s    | 5s             |
| Report generation    | < 5s    | 30s            |

### Database Query Analysis

```sql
-- Check for slow queries
EXPLAIN ANALYZE SELECT ...;

-- Look for:
-- - Seq Scan (should be Index Scan on large tables)
-- - Nested Loop with many rows
-- - Sort on unindexed column
-- - High "actual rows" vs "planned rows"
```

### Memory Leak Detection

```typescript
// In React, check for:
// 1. Event listeners not cleaned up
// 2. Subscriptions not unsubscribed
// 3. Timers not cleared
// 4. Refs holding stale data

useEffect(() => {
  const subscription = observable.subscribe(handler);
  const timer = setInterval(tick, 1000);
  window.addEventListener("resize", handleResize);

  return () => {
    subscription.unsubscribe();
    clearInterval(timer);
    window.removeEventListener("resize", handleResize);
  };
}, []);
```

## QA Report Template

```markdown
# QA Validation Report

**Feature:** [Name]
**Date:** [Date]
**Validator:** QA Agent
**Verdict:** ✅ PASSED / ❌ FAILED

## Summary

- Total Issues: X
- Critical: X
- High: X
- Medium: X
- Low: X

## Test Results

- Unit Tests: ✅ X passed / ❌ X failed
- Integration Tests: ✅ X passed / ❌ X failed
- Coverage: X%

## Issues Found

### 🔴 Critical

[None / List issues]

### 🟠 High

[None / List issues]

### 🟡 Medium

[None / List issues]

### 🟢 Low

[None / List issues]

## Checklist Completion

- [x] Contract compliance verified
- [x] Automated tests run
- [x] Edge cases tested
- [x] Security checks passed
- [x] Accessibility verified
- [x] Performance acceptable

## Recommendation

[Ready for deployment / Needs fixes before deployment]

## Blocking Issues for Deployment

1. [Issue that must be fixed]
2. [Issue that must be fixed]
```
