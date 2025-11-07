#!/bin/bash

# Contract Verification Script
# Verifies consistency across contract files

set -e

echo "🔍 Verifying contract consistency..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track errors
ERRORS=0

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
    ERRORS=$((ERRORS + 1))
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "1. Checking contract files exist..."

if [ ! -f "contracts/api-contracts.yaml" ]; then
    print_error "contracts/api-contracts.yaml not found"
else
    print_success "API contracts found"
fi

if [ ! -f "contracts/design-tokens.yaml" ]; then
    print_error "contracts/design-tokens.yaml not found"
else
    print_success "Design tokens found"
fi

if [ ! -f "contracts/database-contracts.yaml" ]; then
    print_error "contracts/database-contracts.yaml not found"
else
    print_success "Database contracts found"
fi

if [ ! -f "contracts/infra-contracts.yaml" ]; then
    print_error "contracts/infra-contracts.yaml not found"
else
    print_success "Infrastructure contracts found"
fi

echo ""
echo "2. Checking plan files..."

if [ ! -f "plans/CURRENT.md" ]; then
    print_error "plans/CURRENT.md not found"
else
    print_success "Current plan found"
fi

if [ ! -f "PROJECT.md" ]; then
    print_error "PROJECT.md not found"
else
    print_success "PROJECT.md found"
fi

echo ""
echo "3. Checking for hardcoded values in frontend..."

if [ -d "app/src" ]; then
    # Check for hardcoded colors (hex values)
    if grep -r "#[0-9A-Fa-f]\{6\}" app/src --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" > /dev/null 2>&1; then
        print_warning "Found hardcoded color values in frontend code"
        echo "  Run: grep -r \"#[0-9A-Fa-f]\{6\}\" app/src --include=\"*.tsx\" --include=\"*.ts\" to see them"
    else
        print_success "No hardcoded color values found"
    fi

    # Check for hardcoded API URLs
    if grep -r "http://\|https://" app/src --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" | grep -v "//.*http" > /dev/null 2>&1; then
        print_warning "Found hardcoded URLs in frontend code"
        echo "  URLs should come from environment variables"
    else
        print_success "No hardcoded URLs found"
    fi
else
    print_warning "Frontend directory (app/src) not found - skipping frontend checks"
fi

echo ""
echo "4. Checking for secrets in code..."

# Check for common secret patterns
if grep -r "password\s*=\s*['\"]" . --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build > /dev/null 2>&1; then
    print_error "Found hardcoded passwords in code!"
fi

if grep -r "api[_-]?key\s*=\s*['\"]" . --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build > /dev/null 2>&1; then
    print_error "Found hardcoded API keys in code!"
fi

if [ $ERRORS -eq 0 ]; then
    print_success "No secrets found in code"
fi

echo ""
echo "5. Checking environment variable documentation..."

if [ -f "contracts/infra-contracts.yaml" ] && [ -d "api/src" ]; then
    # This would require parsing YAML and checking code - simplified check
    print_warning "Manual check recommended: Verify all env vars in code are documented in infra-contracts.yaml"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) found${NC}"
    echo "Please fix the errors above before proceeding."
    exit 1
fi
