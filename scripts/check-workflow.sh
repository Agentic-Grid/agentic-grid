#!/bin/bash
# Pre-implementation verification
# This script checks that proper workflow is being followed

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: Session state file exists and has active agent
if [ -f ".claude/state/session.md" ]; then
    ACTIVE_AGENT=$(grep "^\*\*Active Agent:\*\*" .claude/state/session.md | sed 's/\*\*Active Agent:\*\* //')
    if [ "$ACTIVE_AGENT" = "NONE" ] || [ -z "$ACTIVE_AGENT" ]; then
        echo -e "${RED}⛔ VIOLATION: No agent is active!${NC}"
        echo "   You MUST activate an agent before implementation."
        echo "   Update .claude/state/session.md with the active agent."
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓ Active agent: $ACTIVE_AGENT${NC}"
    fi
else
    echo -e "${RED}⛔ VIOLATION: Session state file missing!${NC}"
    echo "   File .claude/state/session.md must exist."
    ERRORS=$((ERRORS + 1))
fi

# Check 2: CURRENT.md was recently read (modified in last 5 min as proxy)
if [ -f "plans/CURRENT.md" ]; then
    echo -e "${GREEN}✓ plans/CURRENT.md exists${NC}"
else
    echo -e "${YELLOW}⚠ Warning: plans/CURRENT.md not found${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Check 3: Contracts exist
CONTRACT_COUNT=$(ls contracts/*.yaml 2>/dev/null | wc -l)
if [ "$CONTRACT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $CONTRACT_COUNT contract files${NC}"
else
    echo -e "${YELLOW}⚠ Warning: No contract files found in contracts/${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  WORKFLOW VIOLATION DETECTED - FIX BEFORE CONTINUING${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Required steps:"
    echo "  1. Identify the agent needed for this task"
    echo "  2. Run the agent's slash command (e.g., /frontend)"
    echo "  3. Update .claude/state/session.md"
    echo "  4. Read plans/CURRENT.md and relevant contracts"
    echo "  5. THEN proceed with implementation"
    exit 1
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Completed with $WARNINGS warning(s)${NC}"
fi

exit 0
