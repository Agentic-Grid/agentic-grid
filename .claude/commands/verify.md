---
description: Run contract verification to check consistency across the project
---

# Contract Verification 🔍

Running contract verification scripts to check for inconsistencies...

## What Gets Checked

### 1. Design Token Compliance
- Searching for hardcoded colors in frontend code
- Checking if all color values use design tokens
- Verifying spacing values use token system

### 2. API Contract Compliance
- Checking for hardcoded API URLs
- Verifying all endpoints match contracts
- Looking for uncontracted API calls

### 3. Security Issues
- Scanning for exposed secrets
- Checking for environment variables in code
- Looking for sensitive data in version control

### 4. Contract File Existence
- Verifying all contract files exist
- Checking contract files are valid YAML
- Ensuring contracts have required sections

---

## Running Verification

I'll now execute the verification script using the Bash tool to check all contracts and code quality.
