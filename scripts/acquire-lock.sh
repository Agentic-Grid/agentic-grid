#!/bin/bash

# acquire-lock.sh - Acquire file lock for a task
# Usage: ./acquire-lock.sh <task-file> [ttl-minutes]
#
# This script implements the file locking mechanism defined in schema-spec.md.
# It attempts to acquire exclusive locks for files that a task will modify.

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

# Default TTL
DEFAULT_TTL=30
MAX_TTL=120

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

# Generate unique lock ID
generate_lock_id() {
    echo "lock_$(date +%s%N | shasum | cut -c1-8)"
}

# Check arguments
if [ -z "$1" ]; then
    log_error "Task file required"
    echo "Usage: ./acquire-lock.sh <task-file> [ttl-minutes]"
    exit 1
fi

TASK_FILE="$1"
TTL="${2:-$DEFAULT_TTL}"

# Validate TTL
if [ "$TTL" -gt "$MAX_TTL" ]; then
    log_warn "TTL $TTL exceeds maximum ($MAX_TTL), using $MAX_TTL"
    TTL=$MAX_TTL
fi

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

# Get project info from task path
PROJECT_DIR=$(echo "$TASK_FILE" | sed 's|/plans/features/.*||')
PROJECT_NAME=$(basename "$PROJECT_DIR")

log_info "Acquiring lock for $TASK_ID ($AGENT)"

# Create locks file if not exists
if [ ! -f "$LOCKS_FILE" ]; then
    log_info "Creating locks file..."
    mkdir -p "$(dirname "$LOCKS_FILE")"
    cat > "$LOCKS_FILE" << EOF
version: "1.0"
updated_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"

config:
  default_ttl_minutes: 30
  max_ttl_minutes: 120
  stale_check_interval_seconds: 60
  auto_release_on_completion: true

locks: []

history: []

queue: []
EOF
fi

# Calculate timestamps
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EXPIRES_AT=$(date -u -v+"${TTL}M" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "+${TTL} minutes" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "$TIMESTAMP")

# Extract files to lock from task
# We'll lock the task file itself plus any files in the files.create and files.modify sections
FILES_TO_LOCK=("$TASK_FILE")

# Parse files.create section (simple extraction)
CREATE_FILES=$(grep -A 20 "^files:" "$TASK_FILE" 2>/dev/null | grep -A 10 "create:" | grep "^\s*-" | sed 's/.*-[[:space:]]*//' | tr -d '"' || true)
for file in $CREATE_FILES; do
    if [ -n "$file" ] && [ "$file" != "[]" ]; then
        FILES_TO_LOCK+=("$PROJECT_DIR/$file")
    fi
done

# Parse files.modify section
MODIFY_FILES=$(grep -A 30 "^files:" "$TASK_FILE" 2>/dev/null | grep -A 10 "modify:" | grep "^\s*-" | sed 's/.*-[[:space:]]*//' | tr -d '"' || true)
for file in $MODIFY_FILES; do
    if [ -n "$file" ] && [ "$file" != "[]" ]; then
        FILES_TO_LOCK+=("$PROJECT_DIR/$file")
    fi
done

log_info "Files to lock: ${#FILES_TO_LOCK[@]}"

# Check for existing locks
CONFLICTS=()
for file in "${FILES_TO_LOCK[@]}"; do
    # Check if file is already locked
    if grep -q "file: \"$file\"" "$LOCKS_FILE" 2>/dev/null; then
        # Extract lock info
        LOCK_OWNER=$(grep -A 5 "file: \"$file\"" "$LOCKS_FILE" | grep "owner_task:" | head -1 | sed 's/.*owner_task:[[:space:]]*//' | tr -d '"')
        LOCK_EXPIRES=$(grep -A 5 "file: \"$file\"" "$LOCKS_FILE" | grep "expires_at:" | head -1 | sed 's/.*expires_at:[[:space:]]*//' | tr -d '"')

        # Check if it's our own lock
        if [ "$LOCK_OWNER" = "$TASK_ID" ]; then
            log_info "File already locked by this task: $(basename "$file")"
            continue
        fi

        # Check if lock is expired
        if [ -n "$LOCK_EXPIRES" ]; then
            EXPIRES_EPOCH=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$LOCK_EXPIRES" +%s 2>/dev/null || date -d "$LOCK_EXPIRES" +%s 2>/dev/null || echo "0")
            NOW_EPOCH=$(date +%s)

            if [ "$NOW_EPOCH" -gt "$EXPIRES_EPOCH" ]; then
                log_info "Found expired lock on $(basename "$file"), will override"
                # Remove expired lock
                # Note: In production, use a proper YAML parser
                continue
            fi
        fi

        CONFLICTS+=("$file (locked by $LOCK_OWNER)")
    fi
done

# If conflicts exist, fail or queue
if [ ${#CONFLICTS[@]} -gt 0 ]; then
    log_error "Lock conflicts detected:"
    for conflict in "${CONFLICTS[@]}"; do
        echo "  - $conflict"
    done

    # Add to queue
    QUEUE_ENTRY="  - file: \"${CONFLICTS[0]%%(*}\"
    requester_task: \"$TASK_ID\"
    requester_agent: \"$AGENT\"
    requested_at: \"$TIMESTAMP\""

    # Append to queue section
    if grep -q "^queue: \[\]$" "$LOCKS_FILE"; then
        sed -i '' "s/^queue: \[\]$/queue:\n$QUEUE_ENTRY/" "$LOCKS_FILE"
    fi

    exit 1
fi

# Acquire locks
log_info "Acquiring ${#FILES_TO_LOCK[@]} lock(s)..."

for file in "${FILES_TO_LOCK[@]}"; do
    LOCK_ID=$(generate_lock_id)

    LOCK_ENTRY="  - id: \"$LOCK_ID\"
    file: \"$file\"
    project: \"$PROJECT_NAME\"
    owner_task: \"$TASK_ID\"
    owner_agent: \"$AGENT\"
    lock_type: \"exclusive\"
    acquired_at: \"$TIMESTAMP\"
    expires_at: \"$EXPIRES_AT\"
    ttl_minutes: $TTL"

    # Add to locks section
    if grep -q "^locks: \[\]$" "$LOCKS_FILE"; then
        sed -i '' "s/^locks: \[\]$/locks:\n$LOCK_ENTRY/" "$LOCKS_FILE"
    else
        # Append to existing locks
        sed -i '' "/^locks:/a\\
$LOCK_ENTRY
" "$LOCKS_FILE"
    fi

    log_success "Lock acquired: $(basename "$file")"
done

# Update locks file timestamp
sed -i '' "s/^updated_at:.*/updated_at: \"$TIMESTAMP\"/" "$LOCKS_FILE"

echo ""
log_success "All locks acquired for $TASK_ID"
echo "  TTL:     $TTL minutes"
echo "  Expires: $EXPIRES_AT"
echo ""
echo "To release locks: ./release-lock.sh $TASK_FILE"
