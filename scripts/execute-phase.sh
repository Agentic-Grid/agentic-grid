#!/bin/bash

# execute-phase.sh - Execute all tasks in a phase in parallel
# Usage: ./execute-phase.sh <feature-dir> <phase-number>
#
# This script:
# 1. Finds all tasks in the specified phase
# 2. Filters to only pending/blocked tasks
# 3. Checks dependencies for each task
# 4. Executes eligible tasks in parallel
# 5. Waits for all tasks to start before returning

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

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

# Parse YAML field
get_yaml_field() {
    local file="$1"
    local field="$2"
    grep "^${field}:" "$file" 2>/dev/null | sed "s/^${field}:[[:space:]]*//" | tr -d '"'
}

# Check arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    log_error "Feature directory and phase number required"
    echo "Usage: ./execute-phase.sh <feature-dir> <phase-number>"
    echo ""
    echo "Example:"
    echo "  ./execute-phase.sh sandbox/my-app/plans/features/FEAT-001-project-kanban 2"
    exit 1
fi

FEATURE_DIR="$1"
PHASE="$2"

# Validate feature directory
if [ ! -d "$FEATURE_DIR" ]; then
    log_error "Feature directory not found: $FEATURE_DIR"
    exit 1
fi

TASKS_DIR="$FEATURE_DIR/tasks"

if [ ! -d "$TASKS_DIR" ]; then
    log_error "Tasks directory not found: $TASKS_DIR"
    exit 1
fi

# Get feature info
FEATURE_FILE="$FEATURE_DIR/feature.yaml"
if [ -f "$FEATURE_FILE" ]; then
    FEATURE_ID=$(get_yaml_field "$FEATURE_FILE" "id")
    FEATURE_TITLE=$(get_yaml_field "$FEATURE_FILE" "title")
    log_info "Feature: $FEATURE_ID - $FEATURE_TITLE"
fi

log_info "Executing Phase $PHASE tasks..."
echo ""

# Find all tasks in this phase
PHASE_TASKS=()
ELIGIBLE_TASKS=()
BLOCKED_TASKS=()
COMPLETED_TASKS=()
IN_PROGRESS_TASKS=()

for task_file in "$TASKS_DIR"/TASK-*.yaml; do
    if [ ! -f "$task_file" ]; then
        continue
    fi

    TASK_PHASE=$(get_yaml_field "$task_file" "phase")

    if [ "$TASK_PHASE" = "$PHASE" ]; then
        TASK_ID=$(get_yaml_field "$task_file" "id")
        TASK_STATUS=$(get_yaml_field "$task_file" "status")
        TASK_AGENT=$(get_yaml_field "$task_file" "agent")

        PHASE_TASKS+=("$task_file")

        case "$TASK_STATUS" in
            "pending")
                # Check dependencies
                DEPS=$(grep -A 10 "^depends_on:" "$task_file" 2>/dev/null | grep "^\s*-" | sed 's/.*-[[:space:]]*//' | tr -d '"' || true)
                ALL_DEPS_COMPLETE=true

                if [ -n "$DEPS" ]; then
                    for DEP in $DEPS; do
                        DEP_FILE="$TASKS_DIR/$DEP.yaml"
                        if [ -f "$DEP_FILE" ]; then
                            DEP_STATUS=$(get_yaml_field "$DEP_FILE" "status")
                            if [ "$DEP_STATUS" != "completed" ]; then
                                ALL_DEPS_COMPLETE=false
                                break
                            fi
                        fi
                    done
                fi

                if [ "$ALL_DEPS_COMPLETE" = true ]; then
                    ELIGIBLE_TASKS+=("$task_file")
                    echo -e "  ${GREEN}[READY]${NC} $TASK_ID ($TASK_AGENT)"
                else
                    BLOCKED_TASKS+=("$task_file")
                    echo -e "  ${YELLOW}[BLOCKED]${NC} $TASK_ID ($TASK_AGENT)"
                fi
                ;;
            "blocked")
                BLOCKED_TASKS+=("$task_file")
                echo -e "  ${YELLOW}[BLOCKED]${NC} $TASK_ID ($TASK_AGENT)"
                ;;
            "in_progress")
                IN_PROGRESS_TASKS+=("$task_file")
                echo -e "  ${BLUE}[RUNNING]${NC} $TASK_ID ($TASK_AGENT)"
                ;;
            "completed"|"qa")
                COMPLETED_TASKS+=("$task_file")
                echo -e "  ${GREEN}[DONE]${NC} $TASK_ID ($TASK_AGENT)"
                ;;
        esac
    fi
done

echo ""
echo "Phase $PHASE Summary:"
echo "  Total tasks:      ${#PHASE_TASKS[@]}"
echo "  Eligible to run:  ${#ELIGIBLE_TASKS[@]}"
echo "  Already running:  ${#IN_PROGRESS_TASKS[@]}"
echo "  Blocked:          ${#BLOCKED_TASKS[@]}"
echo "  Completed:        ${#COMPLETED_TASKS[@]}"
echo ""

# Check if phase is already complete
if [ ${#ELIGIBLE_TASKS[@]} -eq 0 ] && [ ${#IN_PROGRESS_TASKS[@]} -eq 0 ] && [ ${#BLOCKED_TASKS[@]} -eq 0 ]; then
    log_success "Phase $PHASE is complete!"
    exit 0
fi

# Check if no tasks can be executed
if [ ${#ELIGIBLE_TASKS[@]} -eq 0 ]; then
    if [ ${#IN_PROGRESS_TASKS[@]} -gt 0 ]; then
        log_info "No new tasks to start. ${#IN_PROGRESS_TASKS[@]} task(s) already in progress."
    else
        log_warn "No tasks can be executed. All remaining tasks are blocked."
    fi
    exit 0
fi

# Execute eligible tasks in parallel
log_info "Starting ${#ELIGIBLE_TASKS[@]} task(s) in parallel..."
echo ""

PIDS=()
TASK_IDS=()

for task_file in "${ELIGIBLE_TASKS[@]}"; do
    TASK_ID=$(get_yaml_field "$task_file" "id")
    TASK_AGENT=$(get_yaml_field "$task_file" "agent")

    log_info "Starting $TASK_ID with $TASK_AGENT agent..."

    # Execute task in background
    "$SCRIPT_DIR/execute-task.sh" "$task_file" &
    PID=$!
    PIDS+=("$PID")
    TASK_IDS+=("$TASK_ID")
done

# Wait for all tasks to start (not complete - that's handled by agents)
log_info "Waiting for tasks to initialize..."

FAILED=0
for i in "${!PIDS[@]}"; do
    PID="${PIDS[$i]}"
    TASK_ID="${TASK_IDS[$i]}"

    if wait "$PID"; then
        log_success "$TASK_ID initialized"
    else
        log_error "$TASK_ID failed to start"
        ((FAILED++))
    fi
done

echo ""

# Update feature index
"$SCRIPT_DIR/update-index.sh" --feature "$FEATURE_DIR" 2>/dev/null || log_warn "Could not update feature index"

# Final summary
echo -e "${GREEN}=======================================================${NC}"
echo -e "${GREEN}  Phase $PHASE execution started${NC}"
echo -e "${GREEN}=======================================================${NC}"
echo ""
echo "  Started:  ${#ELIGIBLE_TASKS[@]} task(s)"
echo "  Failed:   $FAILED"
echo ""
echo -e "${YELLOW}Note:${NC} Tasks are now in_progress."
echo "  Claude Code agents should pick up and execute each task."
echo "  Monitor task status in: $TASKS_DIR"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Claude agents execute their assigned tasks"
echo "  2. Each agent updates task status on completion"
echo "  3. Run: ./execute-phase.sh $FEATURE_DIR $((PHASE + 1))"
echo ""

if [ $FAILED -gt 0 ]; then
    exit 1
fi
