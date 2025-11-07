# 🎨 References Directory

## Purpose: VISUAL INSPIRATION & EXAMPLES

**This directory contains inspirational materials that MAY influence design and implementation.**

---

## What Goes Here

This folder is for **inspiration**, not requirements:

### 🎨 CRITICAL VISUAL ELEMENTS (Priority Focus)

#### 1. **Color Patterns & Palettes** ⭐⭐⭐
- Color schemes you like
- Primary/secondary color combinations
- Color palette screenshots
- Brand color examples
- Mood boards with color themes
- **Why it matters:** Sets the emotional tone and brand identity

#### 2. **Visual Effects & Styles** ⭐⭐⭐
- Shadow depths and styles
- Border styles (rounded, sharp, etc.)
- Gradient effects
- Glass morphism, neumorphism, or other effects
- Visual texture examples
- **Why it matters:** Defines the visual polish and modern feel

#### 3. **Content Organization & Layout** ⭐⭐⭐
- How information is structured on the page
- Grid layouts vs free-form
- Card-based vs list-based displays
- Hierarchy and spacing patterns
- Content density (minimal vs information-rich)
- **Why it matters:** Affects usability and how users navigate

#### 4. **Feature Placement & Organization** ⭐⭐⭐
- Navigation placement (top, side, bottom)
- Call-to-action button positions
- Search bar location
- Filter/sort control placement
- Settings and account menu locations
- **Why it matters:** Impacts user workflow and efficiency

### Additional Visual Elements

#### Typography Examples
- Font pairings you admire
- Heading styles
- Text hierarchy approaches

#### UI Patterns
- Component styles (buttons, cards, forms)
- Similar features from other products
- Interaction examples (GIFs, videos)

#### Animation References
- Micro-interactions
- Page transitions
- Loading states

---

## How This Differs from `/resources/requirements/`

### `/resources/requirements/` (Mandatory)
- **MUST be followed** - Requirements, rules, constraints
- "Build it exactly like this"
- Agents are **required** to read and implement
- Non-compliance means work is not complete

### `/resources/references/` (Inspirational)
- **MAY influence design** - Inspiration, ideas, examples
- "We like this style, use as inspiration"
- Agents **should review** but adapt to project needs
- Used as creative guidance, not strict rules

---

## How Agents Use This

### DESIGNER Agent:
- Reviews visual references before creating designs
- Identifies patterns and styles user likes
- Adapts inspiration to project's unique needs
- Doesn't copy directly, but understands aesthetic preferences

### FRONT Agent:
- Reviews component examples
- Understands interaction patterns user prefers
- Adapts implementations to project stack

### BACK Agent:
- Less commonly used, but may review
- API structure examples
- Data flow patterns

### ALL Agents:
- Review references to understand user preferences
- Ask questions: "I see you like [pattern] - should we use this approach?"
- Adapt inspiration to project context

---

## File Types Supported

- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`
- **Videos**: `.mp4`, `.mov` (for animation references)
- **Documents**: `.pdf`, `.md`, `.txt` (for design systems, style guides)
- **Links**: `.md` files with links to online references

---

## Recommended Structure

### Organize by Category (Recommended):

```
/resources/references/
├── 1-colors/                    ⭐ PRIORITY
│   ├── primary-palette.png      # Main color scheme
│   ├── accent-colors.png        # Secondary/accent colors
│   ├── color-moods.png          # Color psychology examples
│   └── competitor-colors.md     # Colors from apps you like
├── 2-visual-effects/            ⭐ PRIORITY
│   ├── shadow-examples.png      # Depth and elevation styles
│   ├── border-styles.png        # Rounded, sharp, etc.
│   ├── gradient-effects.png     # Gradient usage
│   └── glass-effects.png        # Modern effect examples
├── 3-layout-organization/       ⭐ PRIORITY
│   ├── dashboard-layout.png     # How content is organized
│   ├── grid-examples.png        # Grid vs free-form
│   ├── card-layouts.png         # Card-based displays
│   └── spacing-examples.png     # Content density
├── 4-feature-placement/         ⭐ PRIORITY
│   ├── navigation-placement.png # Top, side, bottom nav
│   ├── cta-positions.png        # Button placement patterns
│   ├── search-location.png      # Search bar positioning
│   └── menu-organization.png    # Settings, account menus
├── typography/
│   ├── font-pairings.png
│   └── heading-styles.jpg
├── components/
│   ├── button-styles.png
│   └── form-elements.png
├── animations/
│   ├── micro-interactions.gif
│   └── page-transitions.mp4
└── full-examples/
    ├── competitor-a-homepage.png
    └── app-inspiration.png
```

**Note:** Folders 1-4 are the most critical for establishing visual identity.

---

## Example: Creating a Reference Document

### Example 1: Link Collection
Create: `design-inspiration-links.md`

```markdown
# Design Inspiration Links

## Dashboard Layouts
- https://dribbble.com/shots/example1 - Clean, minimal dashboard
- https://www.awwwards.com/example2 - Data visualization approach

## Color Schemes
- https://coolors.co/palette/example - Blue/green professional palette

## Component Libraries for Inspiration
- https://ui.shadcn.com - Modern React components
- https://chakra-ui.com - Component patterns
- https://www.radix-ui.com - Accessibility focus

## Animation Inspiration
- https://www.framer.com/motion/examples - Smooth transitions

## Notes
- Love the clean aesthetic from first dashboard link
- The color palette feels professional but not boring
- Animations should be subtle, not distracting
```

### Example 2: Comprehensive Visual Preferences
Create: `visual-identity-guide.md`

```markdown
# Visual Identity Guide

## 🎨 Color Patterns & Palettes (CRITICAL)

### Primary Color Scheme
- **Main Color:** Deep blue (#0052CC) - Professional, trustworthy
- **Secondary:** Teal (#00B8A9) - Fresh, modern accent
- **Neutral:** Warm grays (#F5F7FA backgrounds, #2D3748 text)

### Color Usage Pattern
- **Headers/Navigation:** Dark blue with white text
- **CTAs/Buttons:** Bright teal for primary actions
- **Backgrounds:** Very light gray, almost white (avoid pure white)
- **Success:** Soft green, not too bright
- **Error:** Deep red, not alarming orange-red

### Color Mood
- **Feeling:** Calm, confident, professional but not corporate-stuffy
- **Energy Level:** Medium - not too vibrant, not too muted
- **Example References:** See `/1-colors/airbnb-palette.png` and `/1-colors/stripe-colors.png`

---

## ✨ Visual Effects & Styles (CRITICAL)

### Shadows & Depth
- **Preference:** Subtle, soft shadows (no harsh dark shadows)
- **Style:** Multi-layer shadows for premium feel
- **Example:** `box-shadow: 0 2px 8px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)`
- **Reference:** See `/2-visual-effects/notion-shadows.png`

### Borders & Corners
- **Border Radius:** 8-12px (modern, friendly but not too playful)
- **Border Style:** Very subtle 1px borders, light gray
- **Avoid:** Sharp 0px corners (too harsh), overly rounded >20px (too playful)

### Visual Effects
- **Glassmorphism:** YES - use for modals and overlays
- **Gradients:** Subtle only - background gradients okay, not on buttons
- **Textures:** Minimal - maybe subtle noise on backgrounds
- **Reference:** See `/2-visual-effects/glass-modals.png`

---

## 📐 Content Organization & Layout (CRITICAL)

### Layout Pattern
- **Style:** Card-based with generous spacing
- **Grid:** 12-column responsive grid
- **Spacing:** Lots of whitespace (minimum 24px between major sections)
- **Density:** Medium - not cramped, not too sparse

### Page Structure
- **Header:** Fixed top navigation, 64px height
- **Sidebar:** 240px wide when present, collapsible on mobile
- **Main Content:** Max-width 1200px, centered
- **Cards:** Elevated with shadows, 16px padding inside

### Content Hierarchy
- **Clear sections** with visual separation
- **Card-based** displays for lists (not plain tables)
- **Grid layouts** for galleries/products (3-4 columns on desktop)
- **Reference:** See `/3-layout-organization/notion-layout.png`

---

## 🎯 Feature Placement & Organization (CRITICAL)

### Navigation
- **Position:** Top horizontal navbar (NOT side navigation)
- **Structure:** Logo left, main nav center, user menu right
- **Mobile:** Hamburger menu, slides from right
- **Reference:** See `/4-feature-placement/stripe-nav.png`

### Primary Actions (CTAs)
- **Position:** Top-right of sections (where user's eye ends)
- **Size:** Large, prominent (min 48px height for touch)
- **Color:** Always teal (secondary color) for primary actions
- **Placement Pattern:** "Read left-to-right, act right"

### Search & Filters
- **Search:** Top-right of navbar OR top-left of content area
- **Filters:** Left sidebar OR horizontal row above content
- **Preference:** Horizontal filters above content (more space-efficient)
- **Reference:** See `/4-feature-placement/airbnb-search.png`

### Settings & Account
- **Position:** User avatar/icon in top-right
- **Dropdown:** Opens below, right-aligned
- **Contains:** Profile, Settings, Logout (in that order)

---

## 📝 Typography

- **Sans-serif for everything** (no serifs)
- **Primary:** Inter or similar (clean, geometric)
- **Headings:** Bold (600-700 weight), slightly tighter letter-spacing
- **Body:** Regular (400 weight), 16px minimum, 1.6 line-height

---

## 🎬 Interactions & Animations

- **Speed:** Fast but not instant (150-250ms)
- **Easing:** Smooth ease-out for entering, ease-in for exiting
- **Feedback:** Subtle hover states (slight color change + shadow increase)
- **Loading:** Skeleton screens, not spinners

---

## ❌ What to Avoid

### Colors
- Overly bright, saturated colors
- Pure black (#000000) - use dark gray instead
- Red/orange primaries (too aggressive)

### Layout
- Cramped content with no breathing room
- Too many columns (max 4 on desktop)
- Centered text for body content (left-align)

### Effects
- Heavy, dark shadows
- Excessive animations
- Flashing or pulsing elements
- Outdated effects (bevels, inner shadows on buttons)

---

## 🎯 Summary: The Feeling We Want

**Professional but not corporate** - Clean and trustworthy but still approachable
**Modern but timeless** - Current trends but won't look dated in 2 years
**Spacious but efficient** - Generous whitespace but information is accessible
**Polished but not flashy** - High quality feel without being ostentatious

**Think:** Stripe, Notion, Linear - clean, modern SaaS aesthetics
```

---

## How to Use Effectively

### For Users:

**Good Practice:**
```
1. Add screenshots of UIs you like
2. Note WHY you like them
3. Specify what to adopt vs what to adapt
4. Provide multiple examples for each category
```

**Example:**
```
"Adding 3 dashboard screenshots to references/
I like the clean layout of Example 1, but we need more density
Use the color scheme from Example 2, but warmer tones
Navigation style from Example 3 works well for our use case"
```

**Poor Practice:**
```
❌ Just dropping screenshots without context
❌ Conflicting styles without guidance
❌ Saying "make it look like this" (that's a requirement, not reference)
```

---

### For Agents:

**Good Practice:**
```yaml
DESIGNER_APPROACH:
  1. Review all references
  2. Identify common patterns user likes
  3. Note specific preferences mentioned
  4. Ask clarifying questions:
     - "I see you like [style], should we apply this throughout?"
     - "These examples have conflicting approaches for [element], which do you prefer?"
  5. Create designs inspired by references but adapted to project
  6. Explain design decisions referencing the inspiration
```

**Example DESIGNER Response:**
```
"I've reviewed the references you provided. I notice you prefer:
- Clean, minimal interfaces (from Example 1, 3)
- Bold typography for headings (from Example 2)
- Subtle animations (from animation references)

For the dashboard, I'll create a layout inspired by Example 1's card-based
approach, but adapted to show more data density as you mentioned. I'll use
a color palette similar to Example 2 but with warmer blues as suggested.

Would you like me to proceed with this direction?"
```

---

## Empty Directory?

If this directory is empty:
- Agents proceed based on best practices
- May ask user for style preferences
- Create modern, professional designs by default
- Check in with user for approval more frequently

**That's OK!** References are helpful but not required.

---

## Tips

### Screenshots
- **Label them clearly**: `good-login-page.png` better than `IMG_1234.png`
- **Add notes**: Create a `.md` file explaining what you like about each screenshot

### Collections
- Group related references together
- Create folders for different aspects (UI, colors, animations)

### Links
- Save links in markdown files with context
- Include why each link is relevant

### Updates
- Add references as you find inspiration
- Remove outdated or irrelevant references

---

## Agent Workflow

```yaml
WHEN_USER_SAYS_"I_LIKE_THIS_STYLE":
  1. Ask user to add screenshot/link to /resources/references/
  2. Ask what specifically they like about it
  3. Document preferences in references folder
  4. Reference back when making design decisions

WHEN_STARTING_DESIGN:
  1. Check /resources/references/ for visual inspiration
  2. Note patterns and preferences
  3. Ask questions to clarify preferences
  4. Create designs that feel aligned with references
  5. Explain how design was inspired by references
```

---

## 🎯 Remember

**References are inspiration, not requirements.**

- Agents should **review** and **consider** references
- Agents should **adapt** inspiration to project needs
- Agents should **ask questions** when references conflict
- Agents should **explain** how they used the inspiration

**If something is mandatory, it belongs in `/resources/requirements/` instead.**

---

**Last Updated:** Project creation
**Maintained By:** Project owner (user)
**Reviewed By:** Primarily DESIGNER, also FRONT and other agents as relevant
