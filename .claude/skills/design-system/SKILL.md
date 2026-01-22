---
name: design-system
description: Premium design system patterns, animations, and token usage. Load when working with colors, typography, spacing, animations, or component styling.
allowed-tools: Read, Grep
---

# Premium Design System Patterns

## Core Philosophy

> **Every UI must feel PREMIUM, SOPHISTICATED, and ADDICTIVE.**

Reference apps for quality standard: Linear, Stripe, Vercel, Notion, Raycast, Arc Browser

---

## Design Tokens Structure

Design tokens are defined in `contracts/design-tokens.yaml` and exported to multiple formats.

### Color Scale Pattern

Every color should have a full scale from 50 (lightest) to 950 (darkest):

```yaml
colors:
  # Primary - Brand color
  primary:
    50: "#f0f9ff" # Subtle backgrounds
    100: "#e0f2fe" # Light backgrounds
    200: "#bae6fd" # Borders, dividers
    300: "#7dd3fc" # Disabled states
    400: "#38bdf8" # Icons, secondary elements
    500: "#0ea5e9" # Primary brand color (MAIN)
    600: "#0284c7" # Hover states
    700: "#0369a1" # Active/pressed states
    800: "#075985" # Dark mode primary
    900: "#0c4a6e" # Dark mode accents
    950: "#082f49" # Darkest shade

  # Semantic colors
  success: "#10b981"
  warning: "#f59e0b"
  error: "#ef4444"
  info: "#3b82f6"
```

### Typography Scale

```yaml
typography:
  fonts:
    display: "'Cal Sans', 'Inter', sans-serif" # Headlines
    body: "'Inter', -apple-system, sans-serif" # Body text
    mono: "'JetBrains Mono', monospace" # Code

  sizes:
    xs: { size: "0.75rem", line: "1rem" } # 12px - Fine print
    sm: { size: "0.875rem", line: "1.25rem" } # 14px - Secondary
    base: { size: "1rem", line: "1.5rem" } # 16px - Body
    lg: { size: "1.125rem", line: "1.75rem" } # 18px - Large body
    xl: { size: "1.25rem", line: "1.75rem" } # 20px - Subheadings
    2xl: { size: "1.5rem", line: "2rem" } # 24px - Headings
    3xl: { size: "1.875rem", line: "2.25rem" } # 30px - Large headings
    4xl: { size: "2.25rem", line: "2.5rem" } # 36px - Hero text
    5xl: { size: "3rem", line: "1" } # 48px - Display

  weights:
    normal: 400
    medium: 500
    semibold: 600
    bold: 700
```

### Spacing Scale (8px Grid)

```yaml
spacing:
  0: "0"
  px: "1px"
  0.5: "0.125rem" # 2px
  1: "0.25rem" # 4px
  2: "0.5rem" # 8px (base unit)
  3: "0.75rem" # 12px
  4: "1rem" # 16px
  5: "1.25rem" # 20px
  6: "1.5rem" # 24px
  8: "2rem" # 32px
  10: "2.5rem" # 40px
  12: "3rem" # 48px
  16: "4rem" # 64px
  20: "5rem" # 80px
  24: "6rem" # 96px
```

### Premium Shadows

```yaml
shadows:
  sm: "0 1px 2px 0 rgba(0,0,0,0.05)"
  md: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)"
  lg: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)"
  xl: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)"
  2xl: "0 25px 50px -12px rgba(0,0,0,0.25)"

  # Premium glow effects
  glow-sm: "0 0 10px rgba(var(--primary-500), 0.2)"
  glow-md: "0 0 20px rgba(var(--primary-500), 0.3)"
  glow-lg: "0 0 30px rgba(var(--primary-500), 0.4)"

  # Inset shadows for depth
  inner: "inset 0 2px 4px 0 rgba(0,0,0,0.05)"
```

### Border Radii

```yaml
radii:
  none: "0"
  sm: "0.25rem" # 4px - Small elements
  md: "0.5rem" # 8px - Default
  lg: "0.75rem" # 12px - Cards
  xl: "1rem" # 16px - Large cards
  2xl: "1.5rem" # 24px - Modals
  full: "9999px" # Pills, avatars
```

---

## Animation System (MANDATORY)

### Timing Functions

```yaml
animations:
  easing:
    default: "cubic-bezier(0.4, 0, 0.2, 1)" # Smooth ease
    in: "cubic-bezier(0.4, 0, 1, 1)" # Accelerate
    out: "cubic-bezier(0, 0, 0.2, 1)" # Decelerate
    bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" # Playful bounce
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)" # Spring effect

  duration:
    instant: "50ms" # Micro-feedback
    fast: "150ms" # Hover states, small changes
    normal: "200ms" # Default transitions
    slow: "300ms" # Page transitions, larger elements
    slower: "400ms" # Complex animations
    slowest: "500ms" # Full page transitions
```

### CSS Implementation

```css
/* Base transition utilities */
.transition-fast {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.transition-normal {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.transition-slow {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Specific property transitions */
.transition-colors {
  transition:
    color,
    background-color,
    border-color 150ms ease;
}
.transition-transform {
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.transition-opacity {
  transition: opacity 200ms ease;
}
.transition-shadow {
  transition: box-shadow 200ms ease;
}
```

---

## Interactive Element Patterns (MANDATORY)

### Button Animations

```tsx
// EVERY button must have these states
const buttonStyles = {
  base: `
    transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: center;
  `,
  hover: `
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `,
  active: `
    transform: scale(0.98);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `,
  focus: `
    outline: none;
    box-shadow: 0 0 0 3px rgba(var(--primary-500), 0.3);
  `,
  disabled: `
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  `,
  loading: `
    opacity: 0.8;
    cursor: wait;
    pointer-events: none;
  `,
};
```

### Card Hover Effects

```tsx
// Cards must lift on hover
const cardStyles = {
  base: `
    transition: transform 200ms ease-out, box-shadow 200ms ease-out;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  `,
  hover: `
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.12);
  `,
  active: `
    transform: translateY(0);
    box-shadow: 0 5px 10px rgba(0,0,0,0.1);
  `,
};
```

### Input Focus States

```tsx
// Inputs must have smooth focus transitions
const inputStyles = {
  base: `
    transition: border-color 200ms ease, box-shadow 200ms ease;
    border: 1px solid var(--gray-300);
  `,
  focus: `
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px rgba(var(--primary-500), 0.1);
  `,
  error: `
    border-color: var(--error);
    box-shadow: 0 0 0 3px rgba(var(--error), 0.1);
    animation: shake 400ms ease-in-out;
  `,
  success: `
    border-color: var(--success);
    box-shadow: 0 0 0 3px rgba(var(--success), 0.1);
  `,
};
```

---

## Loading States (MANDATORY)

### Skeleton Loader Pattern

```tsx
// Shimmer animation for skeleton loading
const skeletonStyles = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .skeleton {
    background: linear-gradient(
      90deg,
      var(--gray-100) 25%,
      var(--gray-200) 50%,
      var(--gray-100) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }
`;

// Component example
function SkeletonCard() {
  return (
    <div className="p-4 space-y-3">
      <div className="skeleton h-4 w-3/4" />
      <div className="skeleton h-4 w-1/2" />
      <div className="skeleton h-20 w-full" />
    </div>
  );
}
```

### Button Loading State

```tsx
function Button({ loading, children, ...props }) {
  return (
    <button
      disabled={loading}
      className={cn(
        "relative transition-all duration-150",
        loading && "opacity-80 cursor-wait",
      )}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner className="w-4 h-4 animate-spin" />
        </span>
      )}
      <span className={cn(loading && "opacity-0")}>{children}</span>
    </button>
  );
}
```

### Spinner Animation

```css
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 1s linear infinite;
}

/* Premium spinner with gradient */
.spinner-premium {
  width: 24px;
  height: 24px;
  border: 2px solid transparent;
  border-top-color: var(--primary-500);
  border-radius: 50%;
  animation: spin 0.8s ease infinite;
}
```

### Page Loading Transition

```tsx
// Fade in content after loading
const pageTransition = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .page-enter {
    animation: fadeIn 300ms ease-out forwards;
  }

  .page-stagger > * {
    opacity: 0;
    animation: fadeIn 300ms ease-out forwards;
  }

  .page-stagger > *:nth-child(1) { animation-delay: 0ms; }
  .page-stagger > *:nth-child(2) { animation-delay: 50ms; }
  .page-stagger > *:nth-child(3) { animation-delay: 100ms; }
  .page-stagger > *:nth-child(4) { animation-delay: 150ms; }
  .page-stagger > *:nth-child(5) { animation-delay: 200ms; }
`;
```

---

## User Feedback Patterns (MANDATORY)

### Toast Notifications

```tsx
const toastAnimations = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .toast-enter {
    animation: slideInRight 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .toast-exit {
    animation: slideOutRight 200ms ease-in;
  }
`;
```

### Success Animation

```tsx
// Checkmark animation for success states
const successAnimation = `
  @keyframes checkmark {
    0% { stroke-dashoffset: 100; }
    100% { stroke-dashoffset: 0; }
  }

  @keyframes scaleIn {
    0% { transform: scale(0); opacity: 0; }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); opacity: 1; }
  }

  .success-checkmark {
    animation: scaleIn 300ms ease-out forwards;
  }

  .success-checkmark path {
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: checkmark 300ms ease-out 150ms forwards;
  }
`;
```

### Error Shake Animation

```css
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-4px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(4px);
  }
}

.shake {
  animation: shake 400ms ease-in-out;
}

/* Red pulse for error states */
@keyframes errorPulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0);
  }
}

.error-pulse {
  animation: errorPulse 500ms ease-out;
}
```

---

## Micro-Interactions (PREMIUM DETAILS)

### Toggle Switch

```tsx
const toggleStyles = `
  .toggle {
    transition: background-color 200ms ease;
  }

  .toggle-thumb {
    transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .toggle[data-state="checked"] .toggle-thumb {
    transform: translateX(20px);
  }
`;
```

### Checkbox Pop

```css
@keyframes checkPop {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.checkbox-indicator {
  animation: checkPop 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### Dropdown Menu

```css
@keyframes dropdownOpen {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.dropdown-enter {
  animation: dropdownOpen 200ms cubic-bezier(0, 0, 0.2, 1);
  transform-origin: top center;
}

/* Stagger menu items */
.dropdown-item {
  opacity: 0;
  animation: fadeIn 150ms ease-out forwards;
}

.dropdown-item:nth-child(1) {
  animation-delay: 0ms;
}
.dropdown-item:nth-child(2) {
  animation-delay: 30ms;
}
.dropdown-item:nth-child(3) {
  animation-delay: 60ms;
}
.dropdown-item:nth-child(4) {
  animation-delay: 90ms;
}
```

### Modal/Dialog

```css
/* Backdrop fade */
@keyframes backdropFade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Modal scale and fade */
@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-backdrop {
  animation: backdropFade 200ms ease-out;
}

.modal-content {
  animation: modalEnter 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## Premium Visual Details

### Gradient Text (for headings)

```css
.gradient-text {
  background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Glass Morphism

```css
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.glass-dark {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Subtle Noise Texture

```css
.noise-overlay {
  position: relative;
}

.noise-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  pointer-events: none;
}
```

### Animated Border Gradient

```css
@keyframes borderRotate {
  from {
    --angle: 0deg;
  }
  to {
    --angle: 360deg;
  }
}

.border-gradient {
  position: relative;
  background: white;
  border-radius: 12px;
}

.border-gradient::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 14px;
  background: conic-gradient(
    from var(--angle),
    var(--primary-500),
    var(--primary-300),
    var(--primary-500)
  );
  animation: borderRotate 3s linear infinite;
  z-index: -1;
}
```

---

## Dark Mode Support

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --text-primary: #111827;
  --text-secondary: #6b7280;
  --border: #e5e7eb;
}

[data-theme="dark"] {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border: #374151;
}

/* Automatic system preference */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --bg-primary: #111827;
    --bg-secondary: #1f2937;
    --text-primary: #f9fafb;
    --text-secondary: #9ca3af;
    --border: #374151;
  }
}
```

---

## Anti-Patterns to Avoid

### Never Hardcode Values

```tsx
// ❌ BAD
<div style={{ color: '#3b82f6', padding: '17px' }}>

// ✅ GOOD
<div className="text-primary-500 p-4">
```

### Never Skip Animations

```tsx
// ❌ BAD - Static button
<button className="bg-blue-500">Click</button>

// ✅ GOOD - Animated button
<button className="bg-primary-500 transition-all duration-150 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]">
  Click
</button>
```

### Never Skip Loading States

```tsx
// ❌ BAD - No loading state
{
  data && <Content data={data} />;
}

// ✅ GOOD - Skeleton during load
{
  isLoading ? <SkeletonContent /> : <Content data={data} />;
}
```

### Never Skip Error Feedback

```tsx
// ❌ BAD - Silent error
{
  error && <div className="text-red-500">{error}</div>;
}

// ✅ GOOD - Animated error feedback
{
  error && (
    <div className="text-red-500 animate-shake bg-red-50 p-3 rounded-lg border border-red-200">
      {error}
    </div>
  );
}
```

---

## Checklist Before Implementation

- [ ] All colors from design tokens (no hardcoded hex)
- [ ] All spacing from scale (8px grid)
- [ ] Hover states for all interactive elements
- [ ] Focus states with visible rings
- [ ] Loading states for async operations
- [ ] Error states with shake/feedback
- [ ] Success states with confirmation
- [ ] Page transitions (fade/slide)
- [ ] Dark mode variant
- [ ] Animations use proper easing
