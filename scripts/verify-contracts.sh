#!/bin/bash

# verify-contracts.sh
# Verifies that implementation matches contract specifications

set -e

echo "🔍 Contract Verification"
echo "========================"
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if contract files exist
echo "📋 Checking contract files..."

if [ ! -f "contracts/api-contracts.yaml" ]; then
    echo -e "${YELLOW}⚠️  Warning: contracts/api-contracts.yaml not found${NC}"
    ((WARNINGS++))
fi

if [ ! -f "contracts/design-tokens.yaml" ]; then
    echo -e "${YELLOW}⚠️  Warning: contracts/design-tokens.yaml not found${NC}"
    ((WARNINGS++))
fi

if [ ! -f "contracts/database-contracts.yaml" ]; then
    echo -e "${YELLOW}⚠️  Warning: contracts/database-contracts.yaml not found${NC}"
    ((WARNINGS++))
fi

if [ ! -f "contracts/infra-contracts.yaml" ]; then
    echo -e "${YELLOW}⚠️  Warning: contracts/infra-contracts.yaml not found${NC}"
    ((WARNINGS++))
fi

echo ""

# Check for hardcoded colors in frontend
echo "🎨 Checking for hardcoded design values..."

if [ -d "app" ]; then
    HARDCODED_COLORS=$(grep -r "rgb\|rgba\|#[0-9a-fA-F]\{3,6\}" --include="*.tsx" --include="*.jsx" --include="*.css" app/ 2>/dev/null | grep -v "node_modules" | grep -v ".test." || true)
    
    if [ -n "$HARDCODED_COLORS" ]; then
        echo -e "${RED}❌ Found hardcoded colors:${NC}"
        echo "$HARDCODED_COLORS" | head -10
        ((ERRORS++))
    else
        echo -e "${GREEN}✅ No hardcoded colors found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  app/ directory not found, skipping frontend checks${NC}"
fi

echo ""

# Check for magic numbers in spacing
echo "📏 Checking for magic spacing numbers..."

if [ -d "app" ]; then
    MAGIC_NUMBERS=$(grep -r "margin:\s*[0-9]\|padding:\s*[0-9]\|gap:\s*[0-9]" --include="*.tsx" --include="*.css" app/ 2>/dev/null | grep -v "node_modules" | grep -v ".test." || true)
    
    if [ -n "$MAGIC_NUMBERS" ]; then
        echo -e "${YELLOW}⚠️  Found potential magic numbers:${NC}"
        echo "$MAGIC_NUMBERS" | head -10
        ((WARNINGS++))
    else
        echo -e "${GREEN}✅ No magic spacing numbers found${NC}"
    fi
fi

echo ""

# Run TypeScript check if available
echo "📝 Running TypeScript check..."

if [ -f "package.json" ] && grep -q "typecheck" package.json; then
    if npm run typecheck 2>&1 | tail -5; then
        echo -e "${GREEN}✅ TypeScript check passed${NC}"
    else
        echo -e "${RED}❌ TypeScript errors found${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️  TypeScript check not configured${NC}"
fi

echo ""

# Run linting if available
echo "🔍 Running linter..."

if [ -f "package.json" ] && grep -q '"lint"' package.json; then
    if npm run lint 2>&1 | tail -5; then
        echo -e "${GREEN}✅ Linting passed${NC}"
    else
        echo -e "${RED}❌ Linting errors found${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️  Linting not configured${NC}"
fi

echo ""
echo "========================"
echo "📊 Summary"
echo "========================"
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Verification failed with $ERRORS error(s)${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Verification passed${NC}"
    exit 0
fi
