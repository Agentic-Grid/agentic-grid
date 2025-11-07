# 📋 Requirements Directory

## ⚠️ IMPORTANT: MANDATORY PROJECT REQUIREMENTS

**This directory contains MANDATORY requirements that MUST be followed throughout the project.**

---

## Purpose

Documents in this folder are **required reading** for all agents before starting any work. They contain:

- **Feature requirements** - What must be built
- **Business rules** - Constraints and logic that must be implemented
- **Compliance requirements** - Legal, regulatory, or policy requirements
- **Technical constraints** - Specific technologies, APIs, or integrations required
- **Quality standards** - Performance, security, accessibility requirements
- **Design guidelines** - Brand guidelines, style guides, design systems
- **User requirements** - User stories, use cases, workflows

---

## How Agents Use This

### Before Starting Work:
Every agent **MUST** read all documents in this folder to understand:
- What is required (not optional)
- What constraints exist
- What standards must be met
- What features are mandatory vs nice-to-have

### During Development:
Agents check back here when:
- Making architectural decisions
- Choosing implementation approaches
- Evaluating trade-offs
- Validating completeness

### Agent Checklist:
```yaml
BEFORE_ANY_WORK:
  - [ ] Read ALL files in /resources/requirements/
  - [ ] Understand mandatory vs optional features
  - [ ] Note any constraints or limitations
  - [ ] Clarify anything unclear with user
  - [ ] Incorporate requirements into plan
```

---

## File Types Supported

You can add any file format:
- **`.md`** - Markdown documents (recommended for text)
- **`.txt`** - Plain text
- **`.pdf`** - PDF documents (Claude can read these)
- **`.html`** - HTML documents
- **`.png`, `.jpg`** - Images (wireframes, mockups, screenshots)
- **`.docx`** - Word documents (will be read as text)

---

## Recommended Structure

### For Feature Requirements:
```markdown
# Feature: [Name]

## Mandatory
- [ ] Requirement 1 (MUST HAVE)
- [ ] Requirement 2 (MUST HAVE)

## Optional
- [ ] Nice-to-have 1
- [ ] Nice-to-have 2

## Constraints
- Must support browsers: Chrome, Firefox, Safari
- Must load in under 2 seconds
- Must be WCAG 2.1 AA compliant

## Business Rules
- Users cannot delete their account if they have active subscriptions
- Passwords must be at least 12 characters
- Email must be verified before account activation
```

### For Compliance Requirements:
```markdown
# GDPR Compliance Requirements

## Mandatory
1. User data consent
   - Explicit opt-in for all data collection
   - Clear privacy policy linked at signup
   - Opt-out mechanism for marketing

2. Right to deletion
   - Users can delete account and all data
   - Data must be removed within 30 days
   - Confirmation email sent

3. Data export
   - Users can download all their data
   - Format: JSON or CSV
   - Available within 48 hours of request
```

### For Technical Constraints:
```markdown
# Technical Requirements

## APIs Required
- Stripe API for payments
- SendGrid for email delivery
- AWS S3 for file storage

## Browser Support
- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

## Performance
- Page load: < 2s on 3G
- Time to Interactive: < 3s
- Lighthouse score: > 90

## Security
- HTTPS only
- Content Security Policy headers
- Rate limiting on all endpoints
- Password hashing with bcrypt (12 rounds minimum)
```

---

## Examples

### Example 1: Feature Requirement Document
Create a file: `authentication-requirements.md`

```markdown
# Authentication Feature Requirements

## MANDATORY Features
- [ ] Email/password registration
- [ ] Email verification before account activation
- [ ] Secure password reset flow
- [ ] Remember me functionality (7-day sessions)
- [ ] Automatic logout after 1 hour of inactivity

## Password Requirements (MANDATORY)
- Minimum 12 characters
- Must include: uppercase, lowercase, number, special character
- Cannot be common password (check against list)
- Cannot be same as last 3 passwords

## Session Management (MANDATORY)
- JWT tokens with 1-hour expiry
- Refresh tokens with 7-day expiry
- Tokens invalidated on logout
- All sessions visible to user
- User can terminate any session

## Security Requirements (MANDATORY)
- Rate limiting: 5 failed login attempts = 15-minute lockout
- Log all authentication events
- Alert user on login from new device
- 2FA optional but recommended
```

### Example 2: Design Guidelines
Create a file: `brand-guidelines.md`

```markdown
# Brand Guidelines (MANDATORY)

## Brand Colors
- Primary: #0066CC (use for CTAs, links)
- Secondary: #00AA66 (use for success states)
- Error: #CC0000
- Warning: #FF9900

## Typography
- Headings: Poppins (Bold)
- Body: Inter (Regular, 16px minimum)
- Code: JetBrains Mono

## Voice & Tone
- Professional but friendly
- Clear and concise
- No jargon
- Active voice preferred

## Accessibility (MANDATORY)
- WCAG 2.1 AA minimum
- All images have alt text
- Keyboard navigation for all features
- Form fields have labels
- Color contrast ratio >= 4.5:1
```

---

## What NOT to Put Here

This folder is for **requirements**, not:
- ❌ Code files
- ❌ Implementation details
- ❌ Temporary notes
- ❌ Inspiration (use `/resources/references/` instead)
- ❌ Meeting notes
- ❌ Personal TODOs

---

## How This Differs from `/resources/references/`

### `/resources/requirements/` (This folder)
- **Mandatory** - MUST be followed
- Requirements, constraints, rules
- "Here's what you MUST build"

### `/resources/references/`
- **Inspirational** - MAY influence design
- Visual inspiration, examples
- "Here's what we like, use as inspiration"

---

## Agent Responsibility

Each agent is responsible for:
1. ✅ Reading all requirement documents before starting work
2. ✅ Asking user for clarification if requirements are unclear
3. ✅ Incorporating requirements into their deliverables
4. ✅ Verifying requirements are met before marking work complete
5. ✅ Updating plans to reflect requirement compliance

---

## User Responsibility

As the user, you should:
1. ✅ Add requirement documents **before** asking Claude to start development
2. ✅ Be specific and clear about what's mandatory vs optional
3. ✅ Include constraints, business rules, and compliance needs
4. ✅ Update requirements if they change (and notify Claude)
5. ✅ Review agent deliverables against your requirements

---

## Enforcement

**Agents MUST NOT mark work complete if:**
- ❌ Requirements from this folder are not met
- ❌ Mandatory features are missing
- ❌ Constraints are violated
- ❌ Business rules not implemented correctly
- ❌ Compliance requirements ignored

**Quality gate:** Every agent checks their work against requirements before completion.

---

## Empty Directory?

If this directory is empty, agents will:
1. Check with user if requirements exist elsewhere
2. Ask user to describe requirements verbally
3. Create a requirements document based on user input
4. Save it here for future reference

---

## Quick Start

**For Users:**
```
1. Create a .md file in this directory
2. List your mandatory requirements
3. Be specific and clear
4. Tell Claude: "Read requirements and start building"
```

**For Claude:**
```
1. Check this directory FIRST before any feature work
2. Read ALL documents thoroughly
3. Ask user for clarification if needed
4. Incorporate into feature plans
5. Verify compliance before marking complete
```

---

## 🎯 Remember

**Everything in this folder is MANDATORY.**

If it's in `/resources/requirements/`, it **MUST** be implemented.

If something is optional, it should be marked as such in the document itself.

---

**Last Updated:** Project creation
**Maintained By:** Project owner (user)
**Read By:** ALL agents before starting work
