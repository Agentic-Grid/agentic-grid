# Component Styling Guide - Premium Glassmorphism Design System

> **Version:** 2.1 - Premium Luxury Edition (Enhanced from Visual References)
> **Owner:** DESIGNER | **Consumers:** FRONTEND
> **Last Updated:** 2026-01-23

---

## Design Philosophy

This design system creates a **premium, luxury, sophisticated** interface comparable to Gucci/Prada digital experiences. Every component must feel like a high-end product worth paying for.

### Core Principles

1. **Heavy Glassmorphism** - Frosted glass effects are the foundation
2. **Blues Dominant (70%)** - Blue tones always more prominent than reds
3. **Wine Reds as Accent (30%)** - Subtle luxury accent, never overpowering
4. **Addictive Interactions** - Every action has satisfying feedback
5. **Premium Details** - The small things separate good from exceptional

---

## Visual Reference Summary

Based on analysis of 22 reference images:

### Glassmorphism Characteristics
- Backdrop blur: 20-40px
- Diagonal light reflections on cards (top-left corner gradient)
- Thin white borders at 6-10% opacity
- Premium rounded corners: 16-24px
- Layered depth with multiple glass surfaces

### Color Palette (Extracted)
```
Primary Blues (DOMINANT):
- #5170FF - Bright accent blue
- #004AAD - Strong medium blue
- #0B6B81 - Teal blue
- #12506F - Deep teal
- #0D2944 - Deep navy
- #07101B - Dark navy

Secondary Wines (ACCENT ONLY):
- #800B1F - Deep wine
- #7C0E24 - Medium wine
- #4C0F12 - Dark wine

Neutrals:
- #B1B9C5 - Soft grey
- #F8FAFC - Light mode background
- #040A11 - Dark mode background
```

---

## Theme Implementation

### Activating Themes

```tsx
// Set theme via data attribute on root element
<html data-theme="dark">  // Default
<html data-theme="light">

// Toggle in React
const toggleTheme = () => {
  const current = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
};
```

### Background Gradients

**Dark Mode:** blue -> dark purple (almost black) -> red wine -> dark purple -> blue
```css
background: #040A11;
background-image:
  radial-gradient(ellipse at 15% 0%, rgba(11, 107, 129, 0.25) 0%, transparent 40%),
  radial-gradient(ellipse at 85% 100%, rgba(124, 14, 36, 0.15) 0%, transparent 40%);
```

**Light Mode:** light blue -> soft grey -> soft red -> soft grey -> light blue
```css
background: #F8FAFC;
background-image:
  radial-gradient(ellipse at 20% 0%, rgba(81, 112, 255, 0.12) 0%, transparent 50%),
  radial-gradient(ellipse at 80% 100%, rgba(124, 14, 36, 0.06) 0%, transparent 50%);
```

---

## Glassmorphism Implementation

### Standard Glass Card

```css
.glass-card {
  /* Background with transparency */
  background: var(--glass-bg);  /* rgba(255,255,255,0.04) dark / 0.7 light */

  /* Frosted blur effect - CRITICAL */
  backdrop-filter: blur(var(--glass-blur));  /* 24px dark / 20px light */
  -webkit-backdrop-filter: blur(var(--glass-blur));

  /* Subtle border for definition */
  border: 1px solid var(--glass-border);

  /* Generous radius for premium feel */
  border-radius: var(--radius-xl);  /* 16px */

  /* Smooth transitions */
  transition: all var(--transition-slow);  /* 200ms */
}

.glass-card:hover {
  background: var(--glass-bg-elevated);
  border-color: var(--border-default);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
```

### Premium Card with Gradient Border

For hero elements and important cards, use the gradient border technique:

```css
.card-premium {
  position: relative;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  border-radius: var(--radius-2xl);  /* 20px */
  padding: var(--space-6);  /* 24px */
  overflow: hidden;
}

/* Gradient border using pseudo-element */
.card-premium::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(81, 112, 255, 0.4) 0%,      /* Blue - dominant */
    rgba(255, 255, 255, 0.1) 40%,     /* White - transition */
    rgba(124, 14, 36, 0.25) 100%      /* Wine - subtle accent */
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

### Light Reflection Effect

Add diagonal light reflection for extra premium feel (from references):

```css
.glass-with-reflection::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 50%;
  height: 50%;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 50%
  );
  pointer-events: none;
  border-radius: inherit;
}
```

---

## Button Styles

### Primary Button (Blue - Most Used)

```css
.btn-primary {
  /* Gradient background */
  background: linear-gradient(
    135deg,
    var(--accent-primary) 0%,      /* #5170FF */
    var(--accent-primary-dim) 100% /* #3B5BDB */
  );
  color: white;
  border: none;

  /* Premium shadow with glow */
  box-shadow: 0 4px 14px var(--accent-primary-glow);

  /* Sizing */
  height: 40px;
  padding: 0 16px;
  border-radius: var(--radius-lg);  /* 12px */

  /* Typography */
  font-weight: 500;
  font-size: var(--text-sm);
}

.btn-primary:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: var(--shadow-glow-blue);  /* 0 0 30px rgba(81,112,255,0.45) */
}

.btn-primary:active {
  transform: scale(0.98);
}
```

### Ghost Button

```css
.btn-ghost {
  background: var(--glass-bg);
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
  backdrop-filter: blur(8px);
}

.btn-ghost:hover {
  background: var(--glass-bg-elevated);
  border-color: var(--border-strong);
  color: var(--text-primary);
}
```

### Icon Button (Circular with Radial Glow)

From reference - buttons with radial gradient glow:

```css
.btn-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  border: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.btn-icon::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  background: radial-gradient(
    circle,
    var(--accent-primary-glow) 0%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.btn-icon:hover::before {
  opacity: 1;
}
```

---

## Input Styles

### Standard Input

```css
.input {
  background: var(--glass-bg);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  color: var(--text-primary);
  font-size: var(--text-sm);
  backdrop-filter: blur(8px);
  transition: all var(--transition-fast);
}

.input:focus {
  outline: none;
  background: var(--glass-bg-elevated);
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-primary-glow);
}

.input::placeholder {
  color: var(--text-muted);
}
```

### Chat Input with Animated Border

From reference - border glows and circulates once on message send:

```css
.chat-input-wrapper {
  position: relative;
  border-radius: var(--radius-2xl);
  overflow: hidden;
}

.chat-input-wrapper::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    transparent 100%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--transition-slow);
}

/* Trigger this class when message is sent */
.chat-input-wrapper.sending::before {
  opacity: 1;
  background: linear-gradient(
    90deg,
    var(--color-wine-medium) 0%,     /* Wine start */
    var(--color-blue-light) 25%,     /* Blue dominant */
    var(--color-wine-medium) 50%,    /* Wine accent */
    var(--color-blue-light) 75%,     /* Blue */
    var(--color-wine-medium) 100%    /* Wine end */
  );
  background-size: 200% 100%;
  animation: circulateOnce 1.5s ease forwards;
}

@keyframes circulateOnce {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
```

---

## Chat Bubbles

From reference - organic flowing shapes with distinct styling per sender:

### User Message

```css
.message-user {
  background: rgba(81, 112, 255, 0.12);  /* Blue tint */
  border: 1px solid rgba(81, 112, 255, 0.25);
  border-radius: var(--radius-2xl) var(--radius-2xl) var(--radius-sm) var(--radius-2xl);
  /* Small bottom-right corner points to user */
  padding: var(--space-3) var(--space-4);
  max-width: 80%;
  align-self: flex-end;
}
```

### Assistant Message

```css
.message-assistant {
  background: var(--glass-bg);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-2xl) var(--radius-2xl) var(--radius-2xl) var(--radius-sm);
  /* Small bottom-left corner points to assistant */
  padding: var(--space-3) var(--space-4);
  max-width: 80%;
  align-self: flex-start;
  backdrop-filter: blur(12px);
}
```

---

## Theme Toggle

From reference - premium dark mode toggle with cyan glow:

```css
.theme-toggle {
  position: relative;
  width: 64px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--glass-bg);
  border: 1px solid var(--border-default);
  cursor: pointer;
  overflow: hidden;
  transition: all var(--transition-slow);
}

.theme-toggle::before {
  content: "";
  position: absolute;
  width: 26px;
  height: 26px;
  top: 2px;
  left: 3px;
  border-radius: var(--radius-full);
  background: var(--accent-primary);
  box-shadow: 0 0 10px var(--accent-primary-glow);
  transition: all var(--transition-slower);
}

/* Light mode state */
[data-theme="light"] .theme-toggle::before {
  transform: translateX(32px);
  background: var(--color-blue-navy);
  box-shadow: 0 0 10px rgba(13, 41, 68, 0.3);
}

.theme-toggle:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}
```

---

## Kanban Cards

### Agent Color Coding

Each agent has a distinct left border color:

| Agent | Color | CSS |
|-------|-------|-----|
| DISCOVERY | Blue | `border-left-color: #5170FF` |
| DESIGNER | Violet | `border-left-color: #A78BFA` |
| FRONTEND | Cyan | `border-left-color: #22D3EE` |
| BACKEND | Emerald | `border-left-color: #34D399` |
| DATA | Amber | `border-left-color: #FBBF24` |
| DEVOPS | Rose | `border-left-color: #F87171` |
| QA | Indigo | `border-left-color: #6366F1` |
| ORCHESTRATOR | Gray | `border-left-color: #E5E7EB` |

### Card Structure

```css
.kanban-card {
  min-height: 100px;
  max-height: 160px;
  padding: var(--space-3);
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
  border-left: 3px solid var(--border-subtle);  /* Overridden by agent color */
  cursor: grab;
  transition: all var(--transition-fast);
}

.kanban-card:hover {
  background: var(--glass-bg-elevated);
  border-color: var(--border-default);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.kanban-card:active {
  cursor: grabbing;
  transform: scale(0.98) rotate(1deg);
  box-shadow: var(--shadow-xl);
}
```

### Agent Badge

```css
.agent-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px 8px;
  font-size: 0.625rem;  /* 10px */
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: var(--radius-full);
  border: 1px solid;
  backdrop-filter: blur(4px);
}
```

---

## Marketplace Cards

From reference - different shapes and colors per item type:

### Base Marketplace Card

```css
.marketplace-card {
  position: relative;
  border-radius: var(--radius-2xl);
  overflow: hidden;
  padding: var(--space-5);
  transition: all var(--transition-slow);
}

.marketplace-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: var(--shadow-xl);
}

/* Overlay for glass effect */
.marketplace-card::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
}
```

### Item Type Variations

| Type | Gradient Start | Gradient End | Border Radius |
|------|---------------|--------------|---------------|
| mcp_server | #0B6B81 | #12506F | 16px |
| prompt_template | #7C0E24 | #4C0F12 | 20px |
| agent_workflow | #5170FF | #004AAD | 24px |
| integration | #34D399 | #10B981 | 16px |
| theme | #A78BFA | #7C3AED | 28px |

```css
.marketplace-card[data-type="mcp_server"] {
  background: linear-gradient(135deg, #0B6B81 0%, #12506F 100%);
  border-radius: 16px;
}

.marketplace-card[data-type="agent_workflow"] {
  background: linear-gradient(135deg, #5170FF 0%, #004AAD 100%);
  border-radius: 24px;
}
```

---

## Sidebar Styles

### Light Mode Sidebar (Dark for Contrast)

```css
.sidebar-light {
  background: linear-gradient(
    180deg,
    rgba(13, 41, 68, 0.95) 0%,
    rgba(13, 41, 68, 0.9) 100%
  );
  backdrop-filter: blur(30px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Dark Mode Sidebar (Subtle Glass)

```css
.sidebar-dark {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(30px);
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}
```

### Sidebar Item

```css
.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  color: rgba(255, 255, 255, 0.6);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.sidebar-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.sidebar-item.active {
  background: rgba(81, 112, 255, 0.15);
  color: #5170FF;
  border-left: 3px solid #5170FF;
}
```

---

## Modal Styles

### Modal Backdrop

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: var(--z-modal-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Modal Content with Gradient Border

```css
.modal-content {
  position: relative;
  background: var(--glass-bg-elevated);
  backdrop-filter: blur(var(--glass-blur-strong));  /* 40px */
  border: 1px solid var(--border-default);
  border-radius: var(--radius-3xl);  /* 24px */
  box-shadow: var(--shadow-2xl);
  max-width: 700px;
  max-height: 90vh;
  overflow: hidden;
}

/* Premium gradient border */
.modal-content::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(81, 112, 255, 0.4) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(124, 14, 36, 0.25) 100%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

---

## Loading States

### Skeleton with Shimmer

```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--glass-bg) 25%,
    var(--glass-bg-elevated) 50%,
    var(--glass-bg) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### Status Dot (Pulsing)

```css
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  position: relative;
}

.status-dot::after {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: var(--radius-full);
  background: inherit;
  opacity: 0.3;
  animation: statusPulse 2s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.1;
  }
}
```

---

## Glow Effects

| Class | Shadow | Usage |
|-------|--------|-------|
| `.glow-blue` | `0 0 30px rgba(81, 112, 255, 0.45)` | Primary actions |
| `.glow-wine` | `0 0 30px rgba(124, 14, 36, 0.3)` | Accent elements |
| `.glow-success` | `0 0 24px rgba(52, 211, 153, 0.35)` | Success states |
| `.glow-warning` | `0 0 24px rgba(251, 191, 36, 0.35)` | Warning states |
| `.glow-error` | `0 0 24px rgba(248, 113, 113, 0.35)` | Error states |

### Animated Glow Pulse

```css
.glow-pulse {
  animation: glowPulse 2s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 transparent;
  }
  50% {
    box-shadow: 0 0 20px 4px var(--accent-primary-glow);
  }
}
```

---

## Typography

### Gradient Text (for headlines)

```css
.text-gradient {
  background: linear-gradient(
    135deg,
    var(--color-blue-light) 0%,
    var(--text-primary) 50%,
    var(--color-wine-light) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Display Heading

```css
.text-display {
  font-family: var(--font-display);
  font-size: var(--text-4xl);  /* 36px */
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}
```

---

## Animation Timing Reference

| Animation | Duration | Easing |
|-----------|----------|--------|
| Button hover | 150ms | ease-out |
| Button press | 100ms | ease-in |
| Card lift | 200ms | ease-out |
| Modal open | 300ms | ease-out |
| Modal close | 150ms | ease-in |
| Shimmer | 1500ms | ease-in-out |
| Glow pulse | 2000ms | ease-in-out |
| Border circulate | 1500ms | ease |
| Page transition | 300ms | ease-out |

---

## Accessibility Requirements

1. **Focus States** - Every interactive element MUST have visible focus ring:
   ```css
   .focus-ring:focus-visible {
     outline: none;
     box-shadow:
       0 0 0 2px var(--bg-primary),
       0 0 0 4px var(--accent-primary);
   }
   ```

2. **Color Contrast** - WCAG AA minimum (4.5:1 for text)

3. **Motion** - Respect `prefers-reduced-motion`:
   ```css
   @media (prefers-reduced-motion: reduce) {
     * {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```

---

## Responsive Breakpoints

| Breakpoint | Width | Adjustments |
|------------|-------|-------------|
| xs | <480px | Single column, reduced padding |
| sm | 640px | Compact sidebar |
| md | 768px | Full sidebar, reduced blur |
| lg | 1024px | Standard layout |
| xl | 1280px | Wide layout |
| 2xl | 1536px | Maximum width containers |

### Mobile Glass Adjustments

```css
@media (max-width: 768px) {
  :root {
    --glass-blur: 16px;
    --glass-blur-strong: 24px;
  }
}
```

---

## CSS Variable Quick Reference

### Colors
```css
--color-primary-500     /* #0B6B81 - Main teal-blue */
--color-secondary-500   /* #7C0E24 - Main wine red */
--color-blue-light      /* #5170FF - Bright accent blue */
--color-blue-navy       /* #0D2944 - Deep navy */
--color-wine-medium     /* #7C0E24 - Wine accent */
--accent-primary        /* #5170FF - Primary accent */
--accent-cyan           /* #22D3EE - Cyan accent */
--accent-emerald        /* #34D399 - Success green */
--accent-amber          /* #FBBF24 - Warning yellow */
--accent-rose           /* #FB7185 - Error red */
--accent-violet         /* #A78BFA - Special purple */
```

### Glass Effects
```css
--glass-bg              /* Glass background */
--glass-bg-subtle       /* Subtle glass */
--glass-bg-elevated     /* Elevated glass */
--glass-border          /* Glass border */
--glass-blur            /* 24px dark / 20px light */
--glass-blur-strong     /* 40px dark / 30px light */
```

### Shadows
```css
--shadow-sm             /* Small shadow */
--shadow-md             /* Medium shadow */
--shadow-lg             /* Large shadow */
--shadow-xl             /* Extra large shadow */
--shadow-2xl            /* Huge shadow */
--shadow-glow-blue      /* Blue glow */
--shadow-glow-wine      /* Wine glow */
```

### Transitions
```css
--transition-fast       /* 100ms */
--transition-normal     /* 150ms */
--transition-slow       /* 200ms */
--transition-slower     /* 300ms */
--transition-slowest    /* 400ms */
--transition-bounce     /* Spring effect */
```

---

## Implementation Checklist

For every component, verify:

- [ ] Uses CSS variables from design tokens (never hardcode)
- [ ] Has glassmorphism background with backdrop blur
- [ ] Has hover state with transform and shadow
- [ ] Has focus state for accessibility (glow ring)
- [ ] Has smooth transitions (150-300ms)
- [ ] Uses 8px grid for spacing
- [ ] Blue is dominant over red (70/30 ratio)
- [ ] Works in both light and dark themes
- [ ] Has loading state if async
- [ ] Has error state if applicable
- [ ] Has premium gradient border on elevated elements

---

## File References

- **Design Tokens:** `/contracts/design-tokens.yaml`
- **CSS Variables:** `/dashboard/src/index.css`
- **Reference Images:** `/resources/references/`

---

*This guide ensures premium, luxury, sophisticated UI that users become addicted to using.*
