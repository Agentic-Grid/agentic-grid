---
name: design-system
description: Design system patterns and token usage. Load when working with colors, typography, spacing, or component styling.
allowed-tools: Read, Grep
---

# Design System Patterns

## Token Structure

Design tokens are defined in `contracts/design-tokens.yaml` and exported to multiple formats.

### Color Scale Pattern

Every color should have a full scale from 50 (lightest) to 900 (darkest):

```yaml
colors:
  primary:
    50: "#eff6ff" # Backgrounds, hover states
    100: "#dbeafe" # Light backgrounds
    200: "#bfdbfe" # Borders, dividers
    300: "#93c5fd" # Disabled states
    400: "#60a5fa" # Icons, secondary elements
    500: "#3b82f6" # Primary brand color
    600: "#2563eb" # Hover states
    700: "#1d4ed8" # Active states
    800: "#1e40af" # Dark mode primary
    900: "#1e3a8a" # Dark mode accents
```

### Typography Scale

```yaml
typography:
  fontFamily:
    sans: "Inter, -apple-system, sans-serif"
    mono: "JetBrains Mono, Menlo, monospace"
  fontSize:
    xs: "0.75rem" # 12px - Fine print
    sm: "0.875rem" # 14px - Secondary text
    base: "1rem" # 16px - Body text
    lg: "1.125rem" # 18px - Large body
    xl: "1.25rem" # 20px - Subheadings
    2xl: "1.5rem" # 24px - Headings
    3xl: "1.875rem" # 30px - Large headings
    4xl: "2.25rem" # 36px - Hero text
  fontWeight:
    normal: 400
    medium: 500
    semibold: 600
    bold: 700
```

### Spacing Scale

```yaml
spacing:
  0: "0"
  px: "1px"
  0.5: "0.125rem" # 2px
  1: "0.25rem" # 4px
  2: "0.5rem" # 8px
  3: "0.75rem" # 12px
  4: "1rem" # 16px
  5: "1.25rem" # 20px
  6: "1.5rem" # 24px
  8: "2rem" # 32px
  10: "2.5rem" # 40px
  12: "3rem" # 48px
  16: "4rem" # 64px
```

## Usage in Code

### React/TypeScript

```typescript
// Import from design tokens
import { colors, spacing, typography } from "@/design-tokens";

// Use in styled components or inline styles
const styles = {
  backgroundColor: colors.primary[50],
  padding: spacing[4],
  fontSize: typography.fontSize.base,
};
```

### Tailwind CSS

Design tokens map to Tailwind classes:

```html
<!-- Colors -->
<div class="bg-primary-50 text-primary-900">
  <!-- Spacing -->
  <div class="p-4 mt-6 gap-2">
    <!-- Typography -->
    <p class="text-base font-medium"></p>
  </div>
</div>
```

### CSS Variables

```css
/* Generated CSS variables */
:root {
  --color-primary-500: #3b82f6;
  --spacing-4: 1rem;
  --font-size-base: 1rem;
}

/* Usage */
.button {
  background-color: var(--color-primary-500);
  padding: var(--spacing-4);
}
```

## Common Patterns

### Button Variants

```yaml
button:
  primary:
    bg: colors.primary.500
    bgHover: colors.primary.600
    bgActive: colors.primary.700
    text: colors.white
  secondary:
    bg: colors.gray.100
    bgHover: colors.gray.200
    text: colors.gray.900
  danger:
    bg: colors.red.500
    bgHover: colors.red.600
    text: colors.white
```

### Form States

```yaml
input:
  default:
    border: colors.gray.300
    focus: colors.primary.500
  error:
    border: colors.red.500
    focus: colors.red.500
    bg: colors.red.50
  disabled:
    bg: colors.gray.100
    text: colors.gray.400
```

## Anti-Patterns to Avoid

❌ **Hardcoded values**

```tsx
// BAD
<div style={{ color: '#3b82f6' }}>
```

✅ **Use tokens**

```tsx
// GOOD
<div style={{ color: colors.primary[500] }}>
// OR
<div className="text-primary-500">
```

❌ **Magic numbers for spacing**

```tsx
// BAD
<div style={{ padding: '17px' }}>
```

✅ **Use spacing scale**

```tsx
// GOOD
<div className="p-4">
```
