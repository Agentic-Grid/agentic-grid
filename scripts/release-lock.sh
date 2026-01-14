#!/bin/bash

# release-lock.sh - Release file locks for a task
# Usage: ./release-lock.sh <task-file> [reason]
#
# This script releases all locks held by a specific task.
# Locks are moved to the history section for audit purposes.

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
    echo -e "${BLUE}[LOCK]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[LOCK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[LOCK]${NC} $1"
}

log_error() {
    echo -e "${RED}[LOCK]${NC} $1"
}

# Parse YAML field
get_yaml_field() {
    local file="$1"
    local field="$2"
    grep "^${field}:" "$file" 2>/dev/null | sed "s/^${field}:[[:space:]]*//" | tr -d '"'
}

# Check arguments
if [ -z "$1" ]; then
    log_error "Task file required"
    echo "Usage: ./release-lock.sh <task-file> [reason]"
    echo ""
    echo "Reasons: task_completed | task_failed | manual | expired"
    echo ""
    echo "Example:"
    echo "  ./release-lock.sh sandbox/my-app/plans/features/FEAT-001/tasks/TASK-001.yaml task_completed"
    exit 1
fi

TASK_FILE="$1"
REASON="${2:-task_completed}"

# Validate task file
if [ ! -f "$TASK_FILE" ]; then
    log_error "Task file not found: $TASK_FILE"
    exit 1
fi

# Parse task metadata
TASK_ID=$(get_yaml_field "$TASK_FILE" "id")
AGENT=$(get_yaml_field "$TASK_FILE" "agent")

if [ -z "$TASK_ID" ]; then
    log_error "Invalid task file: missing id"
    exit 1
fi

log_info "Releasing locks for $TASK_ID ($AGENT)"
log_info "Reason: $REASON"

# Check locks file exists
if [ ! -f "$LOCKS_FILE" ]; then
    log_warn "Locks file not found, nothing to release"
    exit 0
fi

TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Find and count locks for this task
LOCK_COUNT=$(grep -c "owner_task: \"$TASK_ID\"" "$LOCKS_FILE" 2>/dev/null || echo "0")

if [ "$LOCK_COUNT" -eq "0" ]; then
    log_warn "No locks found for task $TASK_ID"
    exit 0
fi

log_info "Found $LOCK_COUNT lock(s) to release"

# Create a temporary file for the new locks content
TEMP_FILE=$(mktemp)
trap "rm -f $TEMP_FILE" EXIT

# Process the locks file
# This is a simplified approach - in production, use a proper YAML parser
{
    IN_LOCK=false
    SKIP_LOCK=false
    CURRENT_LOCK=""
    RELEASED_LOCKS=()

    while IFS= read -r line; do
        # Detect start of a lock entry
        if echo "$line" | grep -q "^  - id:"; then
            IN_LOCK=true
            SKIP_LOCK=false
            CURRENT_LOCK="$line"
            continue
        fi

        # If we're in a lock entry
        if [ "$IN_LOCK" = true ]; then
            # Check if this lock belongs to our task
            if echo "$line" | grep -q "owner_task: \"$TASK_ID\""; then
                SKIP_LOCK=true
                # Extract file name for logging
                FILE_NAME=$(echo "$CURRENT_LOCK" | grep -o 'file: "[^"]*"' | sed 's/file: "//' | tr -d '"')
                RELEASED_LOCKS+=("$FILE_NAME")
            fi

            # Check for end of lock entry (next entry or section)
            if echo "$line" | grep -q "^  - id:" || echo "$line" | grep -q "^[a-z]"; then
                IN_LOCK=false
                if [ "$SKIP_LOCK" = false ]; then
                    echo "$CURRENT_LOCK"
                fi
                CURRENT_LOCK=""

                # Process the new line
                if echo "$line" | grep -q "^  - id:"; then
                    IN_LOCK=true
                    CURRENT_LOCK="$line"
                else
                    echo "$line"
                fi
                continue
            fi

            # Accumulate lock content
            if [ "$SKIP_LOCK" = false ]; then
                CURRENT_LOCK="$CURRENT_LOCK
$line"
            fi
        else
            echo "$line"
        fi
    done < "$LOCKS_FILE"

    # Handle last lock entry
    if [ "$IN_LOCK" = true ] && [ "$SKIP_LOCK" = false ]; then
        echo "$CURRENT_LOCK"
    fi
} > "$TEMP_FILE"

# For simplicity, we'll use sed to remove locks for this task
# This approach handles the YAML structure better

# Remove lock entries for this task
# Note: This is a simplified approach that works for our YAML structure
TEMP_LOCKS=$(mktemp)
trap "rm -f $TEMP_LOCKS" EXIT

awk '
    BEGIN { skip = 0; in_locks = 0 }
    /^locks:/ { in_locks = 1 }
    /^history:/ || /^queue:/ { in_locks = 0; skip = 0 }
    /^  - id:/ && in_locks { skip = 0 }
    /owner_task: "'"$TASK_ID"'"/ && in_locks { skip = 1 }
    !skip { print }
' "$LOCKS_FILE" > "$TEMP_LOCKS"

# Add history entry for released locks
HISTORY_ENTRY="  - task_id: \"$TASK_ID\"
    agent: \"$AGENT\"
    released_at: \"$TIMESTAMP\"
    release_reason: \"$REASON\"
    lock_count: $LOCK_COUNT"

if grep -q "^history: \[\]$" "$TEMP_LOCKS"; then
    sed -i '' "s/^history: \[\]$/history:\n$HISTORY_ENTRY/" "$TEMP_LOCKS"
elif grep -q "^history:$" "$TEMP_LOCKS"; then
    sed -i '' "/^history:/a\\
$HISTORY_ENTRY
" "$TEMP_LOCKS"
fi

# Update timestamp
sed -i '' "s/^updated_at:.*/updated_at: \"$TIMESTAMP\"/" "$TEMP_LOCKS"

# Replace original file
mv "$TEMP_LOCKS" "$LOCKS_FILE"

# Check for queued tasks that were waiting for our locks
if grep -q "waiting_for_lock" "$LOCKS_FILE" 2>/dev/null; then
    WAITING=$(grep -c "waiting_for_lock" "$LOCKS_FILE" 2>/dev/null || echo "0")
    if [ "$WAITING" -gt 0 ]; then
        log_info "Found $WAITING task(s) waiting in queue"
        log_info "Queue will be processed on next lock acquisition"
    fi
fi

echo ""
log_success "Released $LOCK_COUNT lock(s) for $TASK_ID"
echo "  Reason: $REASON"
echo "  Time:   $TIMESTAMP"
echo ""
