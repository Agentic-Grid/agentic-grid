/**
 * ProjectKanbanWidget Component
 * Collapsible kanban widget for a specific project
 * Used in the dashboard view within each project section
 */

import { useState, useEffect, useMemo } from "react";
import clsx from "clsx";
import type { Task, TaskStatus, Feature } from "../../types/kanban";
import {
  STATUS_COLORS,
  AGENT_COLORS,
  formatRelativeTime,
} from "../../types/kanban";
import { useKanbanData } from "../../contexts/KanbanDataContext";

// =============================================================================
// TYPES
// =============================================================================

interface ProjectKanbanWidgetProps {
  /** Project name/ID to filter features by */
  projectId: string;
  /** Callback when user wants to navigate to full Kanban board */
  onNavigateToKanban?: () => void;
}

// =============================================================================
// STORAGE KEY
// =============================================================================

function getCollapsedKey(projectId: string): string {
  return `project-kanban-collapsed-${projectId}`;
}

// =============================================================================
// ICONS
// =============================================================================

function IconKanban({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
  );
}

function IconChevron({
  className,
  direction = "down",
}: {
  className?: string;
  direction?: "up" | "down";
}) {
  return (
    <svg
      className={clsx(className, direction === "up" && "rotate-180")}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function IconExternalLink({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

// =============================================================================
// MINI TASK CARD
// =============================================================================

function MiniTaskCard({ task }: { task: Task }) {
  const statusConfig = STATUS_COLORS[task.status];
  const agentConfig = AGENT_COLORS[task.agent];

  return (
    <div
      className="p-2 rounded-md bg-[var(--bg-primary)] border-l-2 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
      style={{ borderLeftColor: statusConfig.color }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--text-primary)] truncate">
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: agentConfig.color }}
            >
              {task.agent}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {formatRelativeTime(task.updated_at)}
            </span>
          </div>
        </div>
        {task.status === "in_progress" && (
          <span
            className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
            style={{
              backgroundColor: statusConfig.color,
              animation: statusConfig.animation,
            }}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// COMPACT STATUS COLUMN
// =============================================================================

function CompactStatusColumn({
  status,
  tasks,
}: {
  status: TaskStatus;
  tasks: Task[];
}) {
  const config = STATUS_COLORS[status];
  const displayTasks = tasks.slice(0, 2);

  return (
    <div className="flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
          {config.label}
        </span>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color: config.color }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      <div className="space-y-1.5">
        {displayTasks.length > 0 ? (
          displayTasks.map((task) => <MiniTaskCard key={task.id} task={task} />)
        ) : (
          <div className="py-2 text-center text-[10px] text-[var(--text-muted)]">
            —
          </div>
        )}
        {tasks.length > 2 && (
          <p className="text-[10px] text-[var(--text-muted)] text-center">
            +{tasks.length - 2} more
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ProjectKanbanWidget({
  projectId,
  onNavigateToKanban,
}: ProjectKanbanWidgetProps) {
  // Get data from centralized context (single source of truth)
  const {
    projects: projectsWithData,
    loading,
    error,
    refresh: loadData,
  } = useKanbanData();

  // Collapsed state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(getCollapsedKey(projectId));
    return stored === "true";
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(getCollapsedKey(projectId), String(isCollapsed));
  }, [isCollapsed, projectId]);

  // Derive data for this project from context
  const projectData = useMemo(
    () => projectsWithData.find((p) => p.name === projectId),
    [projectsWithData, projectId],
  );

  // Extract features (without tasks nested)
  const features: Feature[] = useMemo(
    () =>
      projectData?.features.map(({ tasks: _, ...feature }) => feature) || [],
    [projectData],
  );

  // Aggregate all tasks from all features
  const tasks: Task[] = useMemo(
    () => projectData?.features.flatMap((f) => f.tasks) || [],
    [projectData],
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      pending: [],
      in_progress: [],
      blocked: [],
      qa: [],
      completed: [],
    };

    for (const task of tasks) {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    }

    return grouped;
  }, [tasks]);

  // Summary for collapsed state
  const summaryText = useMemo(() => {
    const parts: string[] = [];
    if (tasksByStatus.in_progress.length > 0) {
      parts.push(`${tasksByStatus.in_progress.length} active`);
    }
    if (tasksByStatus.blocked.length > 0) {
      parts.push(`${tasksByStatus.blocked.length} blocked`);
    }
    if (tasksByStatus.pending.length > 0) {
      parts.push(`${tasksByStatus.pending.length} pending`);
    }
    return parts.length > 0
      ? parts.join(", ")
      : tasks.length > 0
        ? `${tasks.length} tasks`
        : "No tasks";
  }, [tasksByStatus, tasks.length]);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  // Don't render if no features exist for this project
  if (!loading && features.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg overflow-hidden mt-3">
      {/* Header - always visible */}
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <IconKanban className="w-4 h-4 text-[var(--accent-cyan)]" />
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Tasks
          </span>
          {features.length > 0 && (
            <span className="text-[10px] text-[var(--text-muted)]">
              ({features.length} features)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Summary when collapsed */}
          {isCollapsed && !loading && (
            <span className="text-xs text-[var(--text-muted)]">
              {summaryText}
            </span>
          )}

          {/* Expand/collapse icon */}
          <IconChevron
            className="w-3 h-3 text-[var(--text-muted)] transition-transform"
            direction={isCollapsed ? "down" : "up"}
          />
        </div>
      </button>

      {/* Content - collapsible */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          {/* Loading state */}
          {loading && (
            <div className="py-4 text-center">
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-1"
                style={{
                  borderColor: "var(--accent-primary)",
                  borderTopColor: "transparent",
                }}
              />
              <span className="text-[10px] text-[var(--text-muted)]">
                Loading...
              </span>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="py-3 text-center">
              <p className="text-xs text-[var(--accent-rose)]">{error}</p>
              <button
                onClick={loadData}
                className="mt-1 text-[10px] text-[var(--accent-primary)] hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>
              {/* Status columns - 3 column compact grid */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <CompactStatusColumn
                  status="pending"
                  tasks={tasksByStatus.pending}
                />
                <CompactStatusColumn
                  status="in_progress"
                  tasks={tasksByStatus.in_progress}
                />
                <CompactStatusColumn
                  status="completed"
                  tasks={tasksByStatus.completed}
                />
              </div>

              {/* View full board button */}
              {onNavigateToKanban && (
                <button
                  onClick={onNavigateToKanban}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded border border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  <span>View Kanban</span>
                  <IconExternalLink className="w-3 h-3" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
