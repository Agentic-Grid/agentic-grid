#!/bin/bash
# =============================================================================
# Sync claude-project-manager → base-project
# =============================================================================
# Syncs all files EXCEPT dashboard/ and sandbox/ to the base-project repo.
# This keeps base-project as a clean template for new project forks.
#
# Usage:
#   ./scripts/sync-to-base-project.sh [--dry-run] [--push]
#
# Options:
#   --dry-run  Show what would be synced without making changes
#   --push     Automatically push changes to base-project remote
# =============================================================================

set -e

# Configuration
BASE_PROJECT_REPO="git@github.com:CR-25/base-project.git"
BASE_PROJECT_DIR="../base-project"
IGNORE_FILE=".base-sync-ignore"

# Read exclude patterns from ignore file
EXCLUDE_DIRS=()
if [ -f "$IGNORE_FILE" ]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip comments and empty lines
        [[ "$line" =~ ^#.*$ ]] && continue
        [[ -z "$line" ]] && continue
        EXCLUDE_DIRS+=("$line")
    done < "$IGNORE_FILE"
else
    # Fallback defaults if ignore file doesn't exist
    EXCLUDE_DIRS=(
        "dashboard/"
        "sandbox/"
        ".git/"
        "node_modules/"
        "dist/"
    )
fi

# Parse arguments
DRY_RUN=false
AUTO_PUSH=false
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            ;;
        --push)
            AUTO_PUSH=true
            ;;
    esac
done

echo "═══════════════════════════════════════════════════════════════"
echo "  Syncing claude-project-manager → base-project"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Ensure we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Error: Run this script from the claude-project-manager root directory"
    exit 1
fi

# Clone or update base-project
if [ ! -d "$BASE_PROJECT_DIR" ]; then
    echo "📥 Cloning base-project..."
    git clone "$BASE_PROJECT_REPO" "$BASE_PROJECT_DIR"
else
    echo "📥 Updating base-project..."
    cd "$BASE_PROJECT_DIR"
    git fetch origin
    # Detect default branch (main or master)
    DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "master")
    git checkout "$DEFAULT_BRANCH"
    git pull origin "$DEFAULT_BRANCH"
    cd - > /dev/null
fi

# Build rsync exclude arguments
EXCLUDE_ARGS=""
for dir in "${EXCLUDE_DIRS[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude=$dir"
done

echo ""
echo "📋 Excluding:"
for dir in "${EXCLUDE_DIRS[@]}"; do
    echo "   - $dir"
done
echo ""

# Perform sync
if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN - showing what would be synced:"
    echo ""
    rsync -avnc --delete $EXCLUDE_ARGS ./ "$BASE_PROJECT_DIR/"
else
    echo "🔄 Syncing files..."
    rsync -av --delete $EXCLUDE_ARGS ./ "$BASE_PROJECT_DIR/"

    echo ""
    echo "✅ Files synced to $BASE_PROJECT_DIR"

    # Show git status in base-project
    cd "$BASE_PROJECT_DIR"

    # Detect default branch for push
    DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "master")

    echo ""
    echo "📊 Changes in base-project (branch: $DEFAULT_BRANCH):"
    git status --short

    # Count changes
    CHANGES=$(git status --porcelain | wc -l | tr -d ' ')

    if [ "$CHANGES" -eq 0 ]; then
        echo ""
        echo "ℹ️  No changes to commit - base-project is already up to date"
    else
        echo ""
        echo "📝 $CHANGES file(s) changed"

        if [ "$AUTO_PUSH" = true ]; then
            echo ""
            echo "🚀 Auto-pushing changes..."
            git add -A
            git commit -m "Sync from claude-project-manager

Automated sync of core files (excluding dashboard/ and sandbox/).
Source: https://github.com/digoocorrea/claude-project-manager"
            git push origin "$DEFAULT_BRANCH"
            echo ""
            echo "✅ Changes pushed to base-project"
        else
            echo ""
            echo "💡 To commit and push these changes:"
            echo "   cd $BASE_PROJECT_DIR"
            echo "   git add -A"
            echo "   git commit -m 'Sync from claude-project-manager'"
            echo "   git push origin $DEFAULT_BRANCH"
            echo ""
            echo "   Or re-run with --push flag:"
            echo "   ./scripts/sync-to-base-project.sh --push"
        fi
    fi

    cd - > /dev/null
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Done!"
echo "═══════════════════════════════════════════════════════════════"
