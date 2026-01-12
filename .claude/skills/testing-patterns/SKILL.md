---
name: testing-patterns
description: Testing strategies for React and Node.js. Load when writing tests or implementing TDD.
allowed-tools: Read, Grep, Bash(npm:*)
---

# Testing Patterns

## Test Structure

### AAA Pattern (Arrange, Act, Assert)

```typescript
describe('UserService', () => {
  describe('create', () => {
    it('should create a user with valid input', async () => {
      // Arrange
      const input = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'securepass123',
      };

      // Act
      const user = await userService.create(input);

      // Assert
      expect(user.id).toBeDefined();
      expect(user.email).toBe(input.email);
      expect(user.name).toBe(input.name);
      expect(user.passwordHash).not.toBe(input.password);
    });

    it('should throw if email already exists', async () => {
      // Arrange
      await createUser({ email: 'existing@example.com' });

      // Act & Assert
      await expect(
        userService.create({ email: 'existing@example.com', ... })
      ).rejects.toThrow('EMAIL_EXISTS');
    });
  });
});
```

## React Component Testing

### Testing Library Setup

```typescript
// test/setup.ts
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

### Component Test Pattern

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders email and password inputs', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('shows validation errors for invalid input', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    mockOnSubmit.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
```

### Query Priority

1. `getByRole` - Most accessible
2. `getByLabelText` - Form inputs
3. `getByPlaceholderText` - When no label
4. `getByText` - Content
5. `getByTestId` - Last resort

## API/Integration Testing

### Supertest Pattern

```typescript
import request from "supertest";
import { app } from "@/app";
import { resetDatabase, seedUser } from "@/test/helpers";

describe("POST /api/users", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates a new user", async () => {
    const response = await request(app).post("/api/users").send({
      email: "new@example.com",
      name: "New User",
      password: "password123",
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      email: "new@example.com",
      name: "New User",
    });
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it("returns 400 for invalid email", async () => {
    const response = await request(app).post("/api/users").send({
      email: "invalid",
      name: "Test",
      password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 for duplicate email", async () => {
    await seedUser({ email: "existing@example.com" });

    const response = await request(app).post("/api/users").send({
      email: "existing@example.com",
      name: "Test",
      password: "password123",
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("EMAIL_EXISTS");
  });
});
```

## Factory Functions

```typescript
// test/factories.ts
import { faker } from "@faker-js/faker";

export function buildUser(overrides?: Partial<User>): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export async function createUser(overrides?: Partial<CreateUserInput>) {
  return User.create({
    email: faker.internet.email(),
    name: faker.person.fullName(),
    passwordHash: await hashPassword("password123"),
    ...overrides,
  });
}
```

## Mocking Patterns

### Module Mocking

```typescript
// Mock entire module
vi.mock("@/services/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

// Mock specific function
import { sendEmail } from "@/services/email";
vi.mocked(sendEmail).mockResolvedValue(true);
```

### API Mocking with MSW

```typescript
// test/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) => {
    return HttpResponse.json({
      data: {
        id: params.id,
        email: "test@example.com",
        name: "Test User",
      },
    });
  }),

  http.post("/api/users", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ data: { id: "123", ...body } }, { status: 201 });
  }),
];
```

## Test Organization

```
test/
  setup.ts          # Global test setup
  helpers.ts        # Test utilities
  factories.ts      # Data factories
  mocks/
    handlers.ts     # MSW handlers
    server.ts       # MSW server setup

app/src/
  components/
    Button/
      Button.tsx
      Button.test.tsx    # Co-located test

api/src/
  routes/
    users.ts
    users.test.ts        # Co-located test
  services/
    user.service.ts
    user.service.test.ts # Co-located test
```

## Coverage Thresholds

```json
// vitest.config.ts or jest.config.js
{
  "coverage": {
    "threshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```
