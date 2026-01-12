#!/bin/bash
# Post-implementation verification
# Runs after file changes to verify consistency

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

FILE_PATH="${1:-}"
ERRORS=0
WARNINGS=0

echo "═══════════════════════════════════════════════════════════"
echo "  POST-IMPLEMENTATION VERIFICATION"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check for hardcoded colors (hex codes)
if [ -n "$FILE_PATH" ] && [ -f "$FILE_PATH" ]; then
    # Only check .ts, .tsx, .css files
    if [[ "$FILE_PATH" =~ \.(ts|tsx|css)$ ]]; then
        HEX_COLORS=$(grep -E '#[0-9a-fA-F]{3,6}' "$FILE_PATH" 2>/dev/null | grep -v "// allowed" | head -5)
        if [ -n "$HEX_COLORS" ]; then
            echo -e "${YELLOW}⚠ Potential hardcoded colors in $FILE_PATH:${NC}"
            echo "$HEX_COLORS"
            echo "   → Use design tokens instead (contracts/design-tokens.yaml)"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
fi

# Check for hardcoded spacing
if [ -n "$FILE_PATH" ] && [ -f "$FILE_PATH" ]; then
    if [[ "$FILE_PATH" =~ \.(ts|tsx|css)$ ]]; then
        HARDCODED_PX=$(grep -E '(margin|padding|gap|top|left|right|bottom):\s*[0-9]+px' "$FILE_PATH" 2>/dev/null | grep -v "// allowed" | head -5)
        if [ -n "$HARDCODED_PX" ]; then
            echo -e "${YELLOW}⚠ Potential hardcoded spacing in $FILE_PATH:${NC}"
            echo "$HARDCODED_PX"
            echo "   → Use spacing tokens instead (contracts/design-tokens.yaml)"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi
fi

# Reminder about contract updates
echo ""
echo "─────────────────────────────────────────────────────────────"
echo -e "${YELLOW}📋 REMINDER: Did you update the relevant contracts?${NC}"
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "If you changed:"
echo "  • API endpoints    → Update contracts/api-contracts.yaml"
echo "  • UI components    → Update contracts/design-tokens.yaml"
echo "  • Database schema  → Update contracts/database-contracts.yaml"
echo "  • Infrastructure   → Update contracts/infra-contracts.yaml"
echo ""

# Check session state
if [ -f ".claude/state/session.md" ]; then
    ACTIVE_AGENT=$(grep "^\*\*Active Agent:\*\*" .claude/state/session.md | sed 's/\*\*Active Agent:\*\* //')
    if [ "$ACTIVE_AGENT" != "NONE" ] && [ -n "$ACTIVE_AGENT" ]; then
        echo -e "${GREEN}Active agent: $ACTIVE_AGENT${NC}"
        echo ""
        echo "Before marking this work complete:"
        echo "  1. ☐ Update contracts if you changed interfaces"
        echo "  2. ☐ Update plans/CURRENT.md with progress"
        echo "  3. ☐ Run /qa to validate"
        echo "  4. ☐ Only mark complete if QA passes"
    fi
fi

echo ""
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}Errors: $ERRORS${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Warnings: $WARNINGS - Please review${NC}"
fi

exit 0
