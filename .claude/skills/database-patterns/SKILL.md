---
name: database-patterns
description: PostgreSQL and Sequelize patterns, query optimization, and migration strategies. Load when designing schemas or writing queries.
allowed-tools: Read, Grep, Bash(npm:*)
---

# Database Patterns

## Schema Design Principles

### Table Conventions

```sql
-- Standard table structure
CREATE TABLE users (
  -- Primary key: UUID
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Required fields with constraints
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,

  -- Optional fields with defaults
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),

  -- Nullable fields
  bio TEXT,
  avatar_url VARCHAR(500),

  -- Timestamps (ALWAYS include)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE  -- Soft delete
);
```

### Foreign Key Pattern

```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ALWAYS index foreign keys
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

### Junction Table Pattern (Many-to-Many)

```sql
CREATE TABLE post_tags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (post_id, tag_id)
);

-- Index both columns for queries from either side
CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
```

## Sequelize Model Patterns

### Model Definition

```typescript
// api/src/models/User.ts
import { Model, DataTypes, Sequelize } from "sequelize";

export class User extends Model {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare role: "user" | "admin";
  declare createdAt: Date;
  declare updatedAt: Date;

  // Associations
  declare posts?: Post[];
}

export function initUser(sequelize: Sequelize) {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: "password_hash", // Map to snake_case column
      },
      role: {
        type: DataTypes.ENUM("user", "admin"),
        defaultValue: "user",
      },
    },
    {
      sequelize,
      tableName: "users",
      underscored: true, // Use snake_case in database
      paranoid: true, // Soft deletes
    },
  );
}

export function associateUser() {
  User.hasMany(Post, { foreignKey: "userId", as: "posts" });
}
```

### Association Patterns

```typescript
// One-to-Many
User.hasMany(Post, { foreignKey: "userId", as: "posts" });
Post.belongsTo(User, { foreignKey: "userId", as: "author" });

// Many-to-Many
Post.belongsToMany(Tag, { through: "post_tags", as: "tags" });
Tag.belongsToMany(Post, { through: "post_tags", as: "posts" });

// One-to-One
User.hasOne(Profile, { foreignKey: "userId", as: "profile" });
Profile.belongsTo(User, { foreignKey: "userId" });
```

## Query Optimization

### Preventing N+1 Queries

❌ **Bad: N+1 Query**

```typescript
const users = await User.findAll();
for (const user of users) {
  const posts = await Post.findAll({ where: { userId: user.id } });
  // This creates N+1 queries!
}
```

✅ **Good: Eager Loading**

```typescript
const users = await User.findAll({
  include: [{ model: Post, as: "posts" }],
});
```

✅ **Good: DataLoader Pattern**

```typescript
const postLoader = new DataLoader(async (userIds) => {
  const posts = await Post.findAll({
    where: { userId: userIds },
  });
  // Group by userId
  return userIds.map((id) => posts.filter((p) => p.userId === id));
});

// Usage
const posts = await postLoader.load(userId);
```

### Pagination Pattern

```typescript
async function getPaginatedUsers(page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const { count, rows } = await User.findAndCountAll({
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  return {
    data: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
}
```

### Efficient Filtering

```typescript
// Use indexes for common filters
const activeAdmins = await User.findAll({
  where: {
    role: "admin", // Indexed
    status: "active", // Indexed
    deletedAt: null, // Paranoid
  },
});

// Composite index for common filter combinations
// CREATE INDEX idx_users_role_status ON users(role, status);
```

## Migration Best Practices

### Migration Template

```typescript
// api/src/migrations/YYYYMMDDHHMMSS-description.ts
import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface) {
  await queryInterface.createTable("table_name", {
    // columns
  });

  // Add indexes after table creation
  await queryInterface.addIndex("table_name", ["column_name"]);
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.dropTable("table_name");
}
```

### Adding Column with Default

```typescript
export async function up(queryInterface: QueryInterface) {
  // Add column
  await queryInterface.addColumn("users", "verified", {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  });

  // Backfill existing rows
  await queryInterface.sequelize.query(
    `UPDATE users SET verified = true WHERE email_verified_at IS NOT NULL`,
  );
}

export async function down(queryInterface: QueryInterface) {
  await queryInterface.removeColumn("users", "verified");
}
```

## Index Strategy

### When to Add Indexes

1. Foreign key columns (ALWAYS)
2. Columns used in WHERE clauses frequently
3. Columns used in ORDER BY
4. Columns used in JOIN conditions

### When NOT to Add Indexes

1. Columns with low cardinality (e.g., boolean with 50/50 split)
2. Tables with very few rows
3. Columns rarely used in queries
4. Tables with heavy write load (indexes slow writes)

### Index Types

```sql
-- B-tree (default, most common)
CREATE INDEX idx_users_email ON users(email);

-- Partial index (for filtered queries)
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- Composite index (for multi-column queries)
CREATE INDEX idx_posts_user_date ON posts(user_id, created_at DESC);

-- GIN index (for arrays/JSONB)
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
```
