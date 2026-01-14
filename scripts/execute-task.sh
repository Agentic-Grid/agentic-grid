#!/bin/bash

# execute-task.sh - Execute a single task by updating status and preparing for Claude
# Usage: ./execute-task.sh <path-to-task.yaml>
#
# This script:
# 1. Validates the task file
# 2. Checks dependencies are satisfied
# 3. Acquires necessary file locks
# 4. Updates task status to in_progress
# 5. Logs execution start
#
# The actual task execution is handled by Claude Code agents.

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
SANDBOX_DIR="$BASE_DIR/sandbox"
LOCKS_FILE="$SANDBOX_DIR/.locks.yaml"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Parse YAML field (simple grep-based parser)
get_yaml_field() {
    local file="$1"
    local field="$2"
    grep "^${field}:" "$file" 2>/dev/null | sed "s/^${field}:[[:space:]]*//" | tr -d '"'
}

# Check for task file argument
if [ -z "$1" ]; then
    log_error "Task file path required"
    echo "Usage: ./execute-task.sh <path-to-task.yaml>"
    echo ""
    echo "Example:"
    echo "  ./execute-task.sh sandbox/my-app/plans/features/FEAT-001/tasks/TASK-001.yaml"
    exit 1
fi

TASK_FILE="$1"

# Validate task file exists
if [ ! -f "$TASK_FILE" ]; then
    log_error "Task file not found: $TASK_FILE"
    exit 1
fi

# Parse task metadata
TASK_ID=$(get_yaml_field "$TASK_FILE" "id")
FEATURE_ID=$(get_yaml_field "$TASK_FILE" "feature_id")
AGENT=$(get_yaml_field "$TASK_FILE" "agent")
STATUS=$(get_yaml_field "$TASK_FILE" "status")
TITLE=$(get_yaml_field "$TASK_FILE" "title")

if [ -z "$TASK_ID" ] || [ -z "$AGENT" ]; then
    log_error "Invalid task file: missing required fields (id, agent)"
    exit 1
fi

log_info "Executing task: $TASK_ID"
echo "  Title:  $TITLE"
echo "  Agent:  $AGENT"
echo "  Status: $STATUS"
echo ""

# Check current status
case "$STATUS" in
    "pending")
        log_info "Task is pending, starting execution..."
        ;;
    "blocked")
        log_warn "Task is blocked, checking dependencies..."
        ;;
    "in_progress")
        log_warn "Task is already in progress"
        echo "To restart, first reset status to 'pending'"
        exit 0
        ;;
    "completed")
        log_warn "Task is already completed"
        exit 0
        ;;
    "qa")
        log_warn "Task is in QA review"
        exit 0
        ;;
    *)
        log_error "Unknown task status: $STATUS"
        exit 1
        ;;
esac

# Check dependencies
log_info "Checking dependencies..."

# Extract depends_on array (simple parsing)
DEPS=$(grep -A 10 "^depends_on:" "$TASK_FILE" | grep "^\s*-" | sed 's/.*-[[:space:]]*//' | tr -d '"')

if [ -n "$DEPS" ]; then
    TASK_DIR=$(dirname "$TASK_FILE")
    BLOCKED_BY=""

    for DEP in $DEPS; do
        DEP_FILE="$TASK_DIR/$DEP.yaml"
        if [ -f "$DEP_FILE" ]; then
            DEP_STATUS=$(get_yaml_field "$DEP_FILE" "status")
            if [ "$DEP_STATUS" != "completed" ]; then
                BLOCKED_BY="$BLOCKED_BY $DEP($DEP_STATUS)"
            fi
        else
            log_warn "Dependency file not found: $DEP_FILE"
        fi
    done

    if [ -n "$BLOCKED_BY" ]; then
        log_error "Task blocked by incomplete dependencies:$BLOCKED_BY"

        # Update status to blocked
        sed -i '' "s/^status:.*/status: \"blocked\"/" "$TASK_FILE"

        # Add blocked_by field if not exists
        if ! grep -q "^blocked_by:" "$TASK_FILE"; then
            sed -i '' "/^depends_on:/a\\
blocked_by: [$BLOCKED_BY ]
" "$TASK_FILE"
        fi

        exit 1
    fi

    log_success "All dependencies satisfied"
else
    log_success "No dependencies"
fi

# Attempt to acquire locks
log_info "Checking file locks..."

# Get project path from task file location
PROJECT_DIR=$(echo "$TASK_FILE" | sed 's|/plans/features/.*||')
PROJECT_NAME=$(basename "$PROJECT_DIR")

# For now, we'll do a simple lock check
# Full implementation would parse files.create and files.modify from task
if [ -f "$LOCKS_FILE" ]; then
    # Check if any locks exist for this project
    EXISTING_LOCKS=$(grep -c "$PROJECT_NAME" "$LOCKS_FILE" 2>/dev/null || echo "0")
    if [ "$EXISTING_LOCKS" -gt 0 ]; then
        log_warn "Found $EXISTING_LOCKS active lock(s) in project"
        # In a full implementation, we'd check specific file conflicts
    fi
fi

# Acquire lock for this task
"$SCRIPT_DIR/acquire-lock.sh" "$TASK_FILE" 2>/dev/null || log_warn "Could not acquire lock (non-blocking)"

# Update task status
log_info "Updating task status..."

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Update status to in_progress
sed -i '' "s/^status:.*/status: \"in_progress\"/" "$TASK_FILE"

# Update started_at if null
if grep -q "^started_at: null" "$TASK_FILE"; then
    sed -i '' "s/^started_at: null/started_at: \"$TIMESTAMP\"/" "$TASK_FILE"
fi

# Update updated_at
sed -i '' "s/^updated_at:.*/updated_at: \"$TIMESTAMP\"/" "$TASK_FILE"

# Add progress entry
PROGRESS_ENTRY="  - timestamp: \"$TIMESTAMP\"
    agent: \"$AGENT\"
    action: \"started\"
    note: \"Task execution started via execute-task.sh\""

# Append to progress section
if grep -q "^progress:" "$TASK_FILE"; then
    # Check if progress is empty array
    if grep -q "^progress: \[\]" "$TASK_FILE"; then
        sed -i '' "s/^progress: \[\]/progress:\n$PROGRESS_ENTRY/" "$TASK_FILE"
    else
        # Append to existing progress
        sed -i '' "/^progress:/a\\
$PROGRESS_ENTRY
" "$TASK_FILE"
    fi
fi

log_success "Task status updated to in_progress"

# Update feature index
FEATURE_DIR=$(dirname "$(dirname "$TASK_FILE")")
"$SCRIPT_DIR/update-index.sh" --feature "$FEATURE_DIR" 2>/dev/null || log_warn "Could not update feature index"

# Output task instructions for Claude
echo ""
echo -e "${GREEN}=======================================================${NC}"
echo -e "${GREEN}  Task $TASK_ID ready for execution${NC}"
echo -e "${GREEN}=======================================================${NC}"
echo ""
echo "Agent: $AGENT"
echo "Task:  $TASK_FILE"
echo ""
echo -e "${YELLOW}Instructions:${NC}"
echo "  The task file contains detailed instructions for the $AGENT agent."
echo "  Claude Code should read the 'instructions' field and execute."
echo ""
echo -e "${YELLOW}On completion:${NC}"
echo "  1. Update task status to 'qa' or 'completed'"
echo "  2. Run: ./release-lock.sh $TASK_FILE"
echo "  3. Run: ./update-index.sh --feature $FEATURE_DIR"
echo ""
