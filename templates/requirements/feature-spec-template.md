# Feature: [Feature Name]

> **Status:** Draft | Ready for Dev | In Progress | Complete
> **Priority:** P0 / P1 / P2
> **Owner:** [Agent/Person]
> **Last Updated:** [DATE]

---

## Overview

### What

[1-2 sentences describing the feature]

### Why

[Business value and user benefit]

### Success Metrics

| Metric   | Target   | How Measured |
| -------- | -------- | ------------ |
| [Metric] | [Target] | [Method]     |

---

## User Stories

| ID     | Story                          | Priority | Status |
| ------ | ------------------------------ | -------- | ------ |
| US-XXX | [As a... I want... So that...] | P0       | To Do  |
| US-XXX | [As a... I want... So that...] | P0       | To Do  |

---

## User Flow

### Happy Path

```
┌─────────────────────────────────────────────────────────┐
│ 1. User [initial action]                                │
│    └─→ System [response]                                │
│                                                          │
│ 2. User [next action]                                   │
│    └─→ System [response]                                │
│                                                          │
│ 3. User [final action]                                  │
│    └─→ System [success state]                           │
└─────────────────────────────────────────────────────────┘
```

### Error Paths

**Error 1: [Condition]**

```
User [action] → System [error response] → User [recovery]
```

**Error 2: [Condition]**

```
User [action] → System [error response] → User [recovery]
```

---

## UI Requirements

### Screens / Views

#### Screen 1: [Name]

**Purpose:** [What user accomplishes here]

**Layout:**

```
┌─────────────────────────────────────┐
│ Header                              │
├─────────────────────────────────────┤
│                                     │
│   [Component A]                     │
│                                     │
│   [Component B]                     │
│                                     │
│   [Component C]                     │
│                                     │
├─────────────────────────────────────┤
│ Footer / Actions                    │
└─────────────────────────────────────┘
```

**Components:**

- Component A: [Description, behavior]
- Component B: [Description, behavior]
- Component C: [Description, behavior]

#### Screen 2: [Name]

[Repeat structure]

### States

| State   | Trigger         | Display                   |
| ------- | --------------- | ------------------------- |
| Default | Initial load    | [Description]             |
| Loading | Fetching data   | Skeleton/spinner          |
| Empty   | No data         | Empty state message + CTA |
| Error   | Request failed  | Error message + retry     |
| Success | Action complete | Success feedback          |

### Responsive Behavior

| Breakpoint          | Layout Changes   |
| ------------------- | ---------------- |
| Mobile (< 640px)    | [Changes]        |
| Tablet (640-1024px) | [Changes]        |
| Desktop (> 1024px)  | [Default layout] |

### Accessibility Requirements

- [ ] All interactive elements keyboard accessible
- [ ] ARIA labels on icon buttons
- [ ] Color contrast ≥ 4.5:1
- [ ] Focus indicators visible
- [ ] Screen reader announcements for state changes

---

## API Requirements

### Endpoints

#### GET /api/[resource]

**Purpose:** [What it does]

**Request:**

```
GET /api/[resource]?[query_params]
Headers:
  Authorization: Bearer {token}
```

**Response (200):**

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

**Errors:**
| Status | Code | When |
|--------|------|------|
| 401 | UNAUTHORIZED | Invalid/missing token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource doesn't exist |

#### POST /api/[resource]

[Repeat structure]

### Data Types

```typescript
interface [ResourceName] {
  id: string;
  createdAt: string;
  updatedAt: string;
  // ... other fields
}

interface Create[ResourceName]Request {
  // ... required fields
}

interface Update[ResourceName]Request {
  // ... optional fields
}
```

---

## Database Requirements

### Tables

#### [table_name]

| Column     | Type      | Constraints           | Description   |
| ---------- | --------- | --------------------- | ------------- |
| id         | UUID      | PK                    | Primary key   |
| [column]   | [type]    | [constraints]         | [description] |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW | Creation time |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW | Last update   |

**Indexes:**

- `idx_[table]_[column]` on [column] — For [query pattern]

**Relationships:**

- [table] belongs to [other_table] via [foreign_key]

### Query Patterns

| Query         | Frequency | Index Used   |
| ------------- | --------- | ------------ |
| [Description] | High      | [Index name] |
| [Description] | Medium    | [Index name] |

---

## Implementation Notes

### Technical Considerations

- [Consideration 1]
- [Consideration 2]

### Dependencies

- Requires: [Feature/System]
- Required by: [Feature/System]

### Performance Requirements

- [Requirement with target]

### Security Considerations

- [Security requirement]

---

## Acceptance Criteria

### Functional

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

### Non-Functional

- [ ] Page loads in < 2s
- [ ] Works on [browsers]
- [ ] Accessible (WCAG AA)

---

## Out of Scope

**Explicitly NOT included in this feature:**

- [Item 1] — Will be in: [Future feature]
- [Item 2] — Will be in: [Future feature]

---

## Open Questions

- [ ] [Question 1] — Owner: [Name]
- [ ] [Question 2] — Owner: [Name]

---

## Implementation Plan

| Phase    | Agent    | Tasks                          | Est. Time |
| -------- | -------- | ------------------------------ | --------- |
| Design   | DESIGNER | Design tokens, component specs | [Time]    |
| Data     | DATA     | Schema, migrations             | [Time]    |
| Backend  | BACKEND  | API endpoints                  | [Time]    |
| Frontend | FRONTEND | Components, integration        | [Time]    |
| QA       | QA       | Testing, validation            | [Time]    |

---

## Changelog

| Date   | Change        | Author |
| ------ | ------------- | ------ |
| [Date] | Initial draft | [Name] |
