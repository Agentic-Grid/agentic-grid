---
name: api-patterns
description: REST API patterns, error handling, and type generation. Load when creating or modifying API endpoints.
allowed-tools: Read, Grep, Bash(npm:*)
---

# API Patterns

## Endpoint Design

### URL Structure

```
GET    /api/v1/users          # List users (with pagination)
GET    /api/v1/users/:id      # Get single user
POST   /api/v1/users          # Create user
PATCH  /api/v1/users/:id      # Partial update
PUT    /api/v1/users/:id      # Full update
DELETE /api/v1/users/:id      # Delete user
```

### Query Parameters

```
GET /api/v1/users?page=1&limit=20&sort=createdAt:desc&filter[role]=admin
```

## Response Formats

### Success Response

```typescript
// Single resource
{
  "data": {
    "id": "uuid",
    "type": "user",
    "attributes": { ... }
  }
}

// Collection
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Error Response

```typescript
interface ErrorResponse {
  error: string;      // Human-readable message
  code: string;       // Machine-readable error code
  details?: unknown;  // Additional context
}

// Example
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "fields": {
      "email": "Invalid email format",
      "password": "Must be at least 8 characters"
    }
  }
}
```

### Error Codes

```typescript
// Standard error codes
const ERROR_CODES = {
  // 400 Bad Request
  VALIDATION_ERROR: "Input validation failed",
  INVALID_REQUEST: "Malformed request",

  // 401 Unauthorized
  UNAUTHORIZED: "Authentication required",
  INVALID_TOKEN: "Token is invalid or expired",

  // 403 Forbidden
  FORBIDDEN: "Insufficient permissions",

  // 404 Not Found
  NOT_FOUND: "Resource not found",

  // 409 Conflict
  CONFLICT: "Resource already exists",
  EMAIL_EXISTS: "Email already in use",

  // 429 Too Many Requests
  RATE_LIMITED: "Too many requests",

  // 500 Internal Server Error
  INTERNAL_ERROR: "Internal server error",
};
```

## Input Validation with Zod

```typescript
import { z } from "zod";

// Define schema
const createUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Must be at least 8 characters"),
  name: z.string().min(1).max(100),
  role: z.enum(["user", "admin"]).default("user"),
});

// Extract type
type CreateUserInput = z.infer<typeof createUserSchema>;

// Validation middleware
export function validate<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: { fields: formatZodErrors(error) },
        });
      } else {
        next(error);
      }
    }
  };
}
```

## Authentication Pattern

```typescript
// JWT middleware
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      error: "Authentication required",
      code: "UNAUTHORIZED",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired token",
      code: "INVALID_TOKEN",
    });
  }
}

// Authorization middleware
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        code: "FORBIDDEN",
      });
    }
    next();
  };
}
```

## Type Generation

After modifying API contracts, generate frontend types:

```bash
# Generate TypeScript types from API contracts
npm run generate:types
```

This produces `app/src/types/api.ts`:

```typescript
// Auto-generated from contracts/api-contracts.yaml

export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role?: "user" | "admin";
}

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}
```

## Pagination Pattern

```typescript
interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function paginate<T>(
  items: T[],
  total: number,
  { page = 1, limit = 20 }: PaginationParams,
): PaginatedResponse<T> {
  return {
    data: items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```
