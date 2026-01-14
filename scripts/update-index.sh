#!/bin/bash

# update-index.sh - Regenerate index files after task/feature changes
# Usage: ./update-index.sh --feature <feature-dir>
#        ./update-index.sh --project <project-dir>
#        ./update-index.sh --dashboard
#        ./update-index.sh --all
#
# This script regenerates index.yaml files based on current task states.

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

# Helper functions
log_info() {
    echo -e "${BLUE}[INDEX]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[INDEX]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[INDEX]${NC} $1"
}

log_error() {
    echo -e "${RED}[INDEX]${NC} $1"
}

# Parse YAML field
get_yaml_field() {
    local file="$1"
    local field="$2"
    grep "^${field}:" "$file" 2>/dev/null | sed "s/^${field}:[[:space:]]*//" | tr -d '"'
}

# Update feature index
update_feature_index() {
    local feature_dir="$1"
    local tasks_dir="$feature_dir/tasks"
    local index_file="$feature_dir/index.yaml"
    local feature_file="$feature_dir/feature.yaml"

    if [ ! -d "$tasks_dir" ]; then
        log_warn "Tasks directory not found: $tasks_dir"
        return 1
    fi

    log_info "Updating feature index: $(basename "$feature_dir")"

    # Get feature info
    local feature_id=""
    if [ -f "$feature_file" ]; then
        feature_id=$(get_yaml_field "$feature_file" "id")
    fi

    # Initialize counters
    local total=0
    local pending=0
    local in_progress=0
    local blocked=0
    local qa=0
    local completed=0

    # Initialize arrays for by_status sections
    local pending_tasks=""
    local in_progress_tasks=""
    local blocked_tasks=""
    local qa_tasks=""
    local completed_tasks=""

    # Initialize arrays for by_phase
    declare -A phase_tasks

    # Initialize arrays for by_agent
    declare -A agent_tasks

    # Initialize dependencies map
    local dependencies=""

    # Find next task ID
    local max_task_num=0

    # Process each task file
    for task_file in "$tasks_dir"/TASK-*.yaml; do
        if [ ! -f "$task_file" ]; then
            continue
        fi

        ((total++))

        local task_id=$(get_yaml_field "$task_file" "id")
        local task_title=$(get_yaml_field "$task_file" "title")
        local task_status=$(get_yaml_field "$task_file" "status")
        local task_agent=$(get_yaml_field "$task_file" "agent")
        local task_phase=$(get_yaml_field "$task_file" "phase")
        local task_priority=$(get_yaml_field "$task_file" "priority")

        # Track max task number
        local task_num=$(echo "$task_id" | sed 's/TASK-//')
        if [ "$task_num" -gt "$max_task_num" ]; then
            max_task_num=$task_num
        fi

        # Build task entry
        local task_entry="    - id: \"$task_id\"
      title: \"$task_title\"
      agent: \"$task_agent\"
      phase: $task_phase
      priority: \"$task_priority\""

        # Count by status and build status lists
        case "$task_status" in
            "pending")
                ((pending++))
                pending_tasks="$pending_tasks
$task_entry"
                ;;
            "in_progress")
                ((in_progress++))
                local started=$(get_yaml_field "$task_file" "started_at")
                in_progress_tasks="$in_progress_tasks
$task_entry
      started_at: \"$started\""
                ;;
            "blocked")
                ((blocked++))
                blocked_tasks="$blocked_tasks
$task_entry"
                ;;
            "qa")
                ((qa++))
                qa_tasks="$qa_tasks
$task_entry"
                ;;
            "completed")
                ((completed++))
                local completed_at=$(get_yaml_field "$task_file" "completed_at")
                completed_tasks="$completed_tasks
$task_entry
      completed_at: \"$completed_at\""
                ;;
        esac

        # Track by phase
        phase_tasks[$task_phase]="${phase_tasks[$task_phase]} $task_id"

        # Track by agent
        agent_tasks[$task_agent]="${agent_tasks[$task_agent]} $task_id"

        # Track dependencies
        local deps=$(grep -A 10 "^depends_on:" "$task_file" 2>/dev/null | grep "^\s*-" | sed 's/.*-[[:space:]]*//' | tr -d '"' | tr '\n' ' ' || echo "")
        local blocks=$(grep -A 10 "^blocks:" "$task_file" 2>/dev/null | grep "^\s*-" | sed 's/.*-[[:space:]]*//' | tr -d '"' | tr '\n' ' ' || echo "")

        dependencies="$dependencies
  $task_id:
    depends_on: [$deps]
    blocks: [$blocks]"
    done

    # Calculate next task ID
    local next_task_id=$((max_task_num + 1))

    # Build by_phase section
    local by_phase=""
    for phase in $(echo "${!phase_tasks[@]}" | tr ' ' '\n' | sort -n); do
        local tasks="${phase_tasks[$phase]}"
        local task_list=$(echo "$tasks" | tr ' ' '\n' | grep -v '^$' | sed 's/^/    - /' | paste -sd ',' - | sed 's/,/, /g')
        by_phase="$by_phase
  $phase: [${tasks}]"
    done

    # Build by_agent section
    local by_agent=""
    for agent in DISCOVERY DESIGNER DATA BACKEND FRONTEND DEVOPS QA; do
        local tasks="${agent_tasks[$agent]}"
        if [ -n "$tasks" ]; then
            by_agent="$by_agent
  $agent: [${tasks}]"
        fi
    done

    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Write index file
    cat > "$index_file" << EOF
# Feature Task Index
# Generated by update-index.sh at $TIMESTAMP
version: "1.0"
updated_at: "$TIMESTAMP"
feature_id: "$feature_id"

# Summary counts
summary:
  total: $total
  pending: $pending
  in_progress: $in_progress
  blocked: $blocked
  qa: $qa
  completed: $completed

# Tasks by status
by_status:
  pending:$pending_tasks
  in_progress:$in_progress_tasks
  blocked:$blocked_tasks
  qa:$qa_tasks
  completed:$completed_tasks

# Tasks by phase
by_phase:$by_phase

# Tasks by agent
by_agent:$by_agent

# Dependency graph
dependencies:$dependencies

# ID generation
next_task_id: $next_task_id
EOF

    log_success "Updated: $index_file"
    echo "  Total: $total | Pending: $pending | In Progress: $in_progress | Blocked: $blocked | QA: $qa | Completed: $completed"
}

# Update project features index
update_project_index() {
    local project_dir="$1"
    local features_dir="$project_dir/plans/features"
    local index_file="$features_dir/.index.yaml"
    local project_file="$project_dir/.project.yaml"

    if [ ! -d "$features_dir" ]; then
        log_warn "Features directory not found: $features_dir"
        return 1
    fi

    log_info "Updating project index: $(basename "$project_dir")"

    # Get project info
    local project_id=""
    if [ -f "$project_file" ]; then
        project_id=$(get_yaml_field "$project_file" "id")
    fi

    # Initialize counters
    local total=0
    local planning=0
    local in_progress=0
    local qa=0
    local completed=0
    local archived=0

    # Initialize lists
    local planning_features=""
    local in_progress_features=""
    local qa_features=""
    local completed_features=""
    local archived_features=""

    local high_priority=""
    local medium_priority=""
    local low_priority=""

    local execution_order=""

    local max_feature_num=0

    # Process each feature directory
    for feature_dir in "$features_dir"/FEAT-*; do
        if [ ! -d "$feature_dir" ]; then
            continue
        fi

        local feature_file="$feature_dir/feature.yaml"
        if [ ! -f "$feature_file" ]; then
            continue
        fi

        ((total++))

        local feat_id=$(get_yaml_field "$feature_file" "id")
        local feat_slug=$(get_yaml_field "$feature_file" "slug")
        local feat_title=$(get_yaml_field "$feature_file" "title")
        local feat_status=$(get_yaml_field "$feature_file" "status")
        local feat_priority=$(get_yaml_field "$feature_file" "priority")

        # Track max feature number
        local feat_num=$(echo "$feat_id" | sed 's/FEAT-//')
        if [ "$feat_num" -gt "$max_feature_num" ]; then
            max_feature_num=$feat_num
        fi

        # Get task counts from feature index
        local feat_index="$feature_dir/index.yaml"
        local tasks_total=0
        local tasks_completed=0
        local progress_percent=0

        if [ -f "$feat_index" ]; then
            tasks_total=$(get_yaml_field "$feat_index" "total" 2>/dev/null | grep -o '[0-9]*' || echo "0")
            tasks_completed=$(grep "completed:" "$feat_index" 2>/dev/null | head -1 | grep -o '[0-9]*' || echo "0")
            if [ "$tasks_total" -gt 0 ]; then
                progress_percent=$((tasks_completed * 100 / tasks_total))
            fi
        fi

        local feature_entry="    - id: \"$feat_id\"
      slug: \"$feat_slug\"
      title: \"$feat_title\"
      priority: \"$feat_priority\"
      tasks_total: $tasks_total
      tasks_completed: $tasks_completed
      progress_percent: $progress_percent"

        # Count by status
        case "$feat_status" in
            "planning")
                ((planning++))
                planning_features="$planning_features
$feature_entry"
                ;;
            "in_progress")
                ((in_progress++))
                in_progress_features="$in_progress_features
$feature_entry"
                ;;
            "qa")
                ((qa++))
                qa_features="$qa_features
$feature_entry"
                ;;
            "completed")
                ((completed++))
                completed_features="$completed_features
$feature_entry"
                ;;
            "archived")
                ((archived++))
                archived_features="$archived_features
$feature_entry"
                ;;
        esac

        # Track by priority
        case "$feat_priority" in
            "high") high_priority="$high_priority $feat_id" ;;
            "medium") medium_priority="$medium_priority $feat_id" ;;
            "low") low_priority="$low_priority $feat_id" ;;
        esac

        # Track execution order (simplified - based on feature ID)
        execution_order="$execution_order
  - feature: \"$feat_id\"
    depends_on: []
    blocks: []"
    done

    local next_feature_id=$((max_feature_num + 1))

    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Write index file
    cat > "$index_file" << EOF
# Project Feature Index
# Generated by update-index.sh at $TIMESTAMP
version: "1.0"
updated_at: "$TIMESTAMP"
project_id: "$project_id"

# Summary counts
summary:
  total: $total
  planning: $planning
  in_progress: $in_progress
  qa: $qa
  completed: $completed
  archived: $archived

# Features by status
by_status:
  planning:$planning_features
  in_progress:$in_progress_features
  qa:$qa_features
  completed:$completed_features
  archived:$archived_features

# Features by priority
by_priority:
  high: [$high_priority]
  medium: [$medium_priority]
  low: [$low_priority]

# Execution order
execution_order:$execution_order

# ID generation
next_feature_id: $next_feature_id
EOF

    log_success "Updated: $index_file"
    echo "  Features: $total | Planning: $planning | In Progress: $in_progress | Completed: $completed"
}

# Update dashboard aggregation
update_dashboard() {
    local dashboard_file="$SANDBOX_DIR/.dashboard.yaml"

    if [ ! -d "$SANDBOX_DIR" ]; then
        log_warn "Sandbox directory not found"
        return 1
    fi

    log_info "Updating dashboard aggregation..."

    # Initialize counters
    local projects=0
    local projects_active=0
    local projects_paused=0
    local features=0
    local features_in_progress=0
    local tasks_total=0
    local tasks_pending=0
    local tasks_in_progress=0
    local tasks_blocked=0
    local tasks_qa=0
    local tasks_completed=0

    local agents_active=""
    local recent_activity=""

    # Process each project
    for project_dir in "$SANDBOX_DIR"/*/; do
        if [ ! -d "$project_dir" ]; then
            continue
        fi

        local project_name=$(basename "$project_dir")

        # Skip hidden directories
        if [[ "$project_name" == .* ]]; then
            continue
        fi

        local project_file="$project_dir/.project.yaml"
        if [ ! -f "$project_file" ]; then
            continue
        fi

        ((projects++))

        local proj_status=$(get_yaml_field "$project_file" "status")
        case "$proj_status" in
            "active") ((projects_active++)) ;;
            "paused") ((projects_paused++)) ;;
        esac

        # Count features and tasks from project index
        local features_index="$project_dir/plans/features/.index.yaml"
        if [ -f "$features_index" ]; then
            local proj_features=$(get_yaml_field "$features_index" "total" | grep -o '[0-9]*' || echo "0")
            features=$((features + proj_features))

            local proj_in_progress=$(grep "in_progress:" "$features_index" 2>/dev/null | head -1 | grep -o '[0-9]*' || echo "0")
            features_in_progress=$((features_in_progress + proj_in_progress))
        fi

        # Aggregate task counts from all features
        for feature_dir in "$project_dir/plans/features"/FEAT-*/; do
            if [ ! -d "$feature_dir" ]; then
                continue
            fi

            local feat_index="$feature_dir/index.yaml"
            if [ -f "$feat_index" ]; then
                local ft=$(grep "^  total:" "$feat_index" 2>/dev/null | grep -o '[0-9]*' || echo "0")
                local fp=$(grep "^  pending:" "$feat_index" 2>/dev/null | grep -o '[0-9]*' || echo "0")
                local fi=$(grep "^  in_progress:" "$feat_index" 2>/dev/null | grep -o '[0-9]*' || echo "0")
                local fb=$(grep "^  blocked:" "$feat_index" 2>/dev/null | grep -o '[0-9]*' || echo "0")
                local fq=$(grep "^  qa:" "$feat_index" 2>/dev/null | grep -o '[0-9]*' || echo "0")
                local fc=$(grep "^  completed:" "$feat_index" 2>/dev/null | grep -o '[0-9]*' || echo "0")

                tasks_total=$((tasks_total + ft))
                tasks_pending=$((tasks_pending + fp))
                tasks_in_progress=$((tasks_in_progress + fi))
                tasks_blocked=$((tasks_blocked + fb))
                tasks_qa=$((tasks_qa + fq))
                tasks_completed=$((tasks_completed + fc))
            fi
        done
    done

    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    # Write dashboard file
    cat > "$dashboard_file" << EOF
# Dashboard Aggregation
# Generated by update-index.sh at $TIMESTAMP
version: "1.0"
updated_at: "$TIMESTAMP"
stale_threshold_minutes: 5

# Global totals
totals:
  projects: $projects
  projects_active: $projects_active
  projects_paused: $projects_paused
  features: $features
  features_in_progress: $features_in_progress
  tasks_total: $tasks_total
  tasks_pending: $tasks_pending
  tasks_in_progress: $tasks_in_progress
  tasks_blocked: $tasks_blocked
  tasks_qa: $tasks_qa
  tasks_completed: $tasks_completed

# Active agents
agents_active: []

# Recent activity
recent_activity: []

# Execution queue
queue:
  next_tasks: []

# Health metrics
health:
  last_successful_execution: null
  failed_tasks_24h: 0
  average_task_duration_minutes: 0
  index_last_regenerated: "$TIMESTAMP"
EOF

    log_success "Updated: $dashboard_file"
    echo "  Projects: $projects | Features: $features | Tasks: $tasks_total"
}

# Main logic
case "$1" in
    "--feature")
        if [ -z "$2" ]; then
            log_error "Feature directory required"
            echo "Usage: ./update-index.sh --feature <feature-dir>"
            exit 1
        fi
        update_feature_index "$2"
        ;;
    "--project")
        if [ -z "$2" ]; then
            log_error "Project directory required"
            echo "Usage: ./update-index.sh --project <project-dir>"
            exit 1
        fi
        # Update all feature indexes in project
        for feature_dir in "$2/plans/features"/FEAT-*/; do
            if [ -d "$feature_dir" ]; then
                update_feature_index "$feature_dir"
            fi
        done
        # Update project features index
        update_project_index "$2"
        ;;
    "--dashboard")
        update_dashboard
        ;;
    "--all")
        log_info "Regenerating all indexes..."
        for project_dir in "$SANDBOX_DIR"/*/; do
            if [ -d "$project_dir" ] && [ -f "$project_dir/.project.yaml" ]; then
                # Update each feature in project
                for feature_dir in "$project_dir/plans/features"/FEAT-*/; do
                    if [ -d "$feature_dir" ]; then
                        update_feature_index "$feature_dir"
                    fi
                done
                # Update project index
                update_project_index "$project_dir"
            fi
        done
        # Update dashboard
        update_dashboard
        log_success "All indexes regenerated"
        ;;
    *)
        log_error "Invalid option: $1"
        echo "Usage:"
        echo "  ./update-index.sh --feature <feature-dir>"
        echo "  ./update-index.sh --project <project-dir>"
        echo "  ./update-index.sh --dashboard"
        echo "  ./update-index.sh --all"
        exit 1
        ;;
esac
