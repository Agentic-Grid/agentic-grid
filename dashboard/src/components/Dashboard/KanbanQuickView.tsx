/**
 * KanbanQuickView Component
 * Collapsible dashboard widget showing task summary
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import clsx from "clsx";
import type { Task, TaskStatus, Feature } from "../../types/kanban";
import {
  STATUS_COLORS,
  AGENT_COLORS,
  formatRelativeTime,
} from "../../types/kanban";
import * as kanbanApi from "../../services/kanban";

// =============================================================================
// TYPES
// =============================================================================

interface TaskSummary {
  pending: number;
  in_progress: number;
  blocked: number;
  qa: number;
  completed: number;
}

interface KanbanQuickViewProps {
  /** Callback when user wants to navigate to full Kanban board */
  onNavigateToKanban?: () => void;
}

// =============================================================================
// STORAGE KEY
// =============================================================================

const COLLAPSED_STORAGE_KEY = "kanban-quick-view-collapsed";

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
      className="p-2 rounded-md bg-[var(--bg-tertiary)] border-l-2 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
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
// STATUS COLUMN
// =============================================================================

function StatusColumn({
  status,
  tasks,
  onViewAll,
}: {
  status: TaskStatus;
  tasks: Task[];
  onViewAll?: () => void;
}) {
  const config = STATUS_COLORS[status];
  const displayTasks = tasks.slice(0, 3);
  const hasMore = tasks.length > 3;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          {config.label}
        </span>
        <span className="text-sm font-bold" style={{ color: config.color }}>
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      <div className="flex-1 space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-subtle)] scrollbar-track-transparent">
        {displayTasks.length > 0 ? (
          displayTasks.map((task) => <MiniTaskCard key={task.id} task={task} />)
        ) : (
          <div className="py-4 text-center text-[10px] text-[var(--text-muted)]">
            No tasks
          </div>
        )}
      </div>

      {/* View all link */}
      {hasMore && onViewAll && (
        <button
          onClick={onViewAll}
          className="mt-2 text-xs text-[var(--accent-primary)] hover:text-[var(--accent-primary-dim)] transition-colors"
        >
          +{tasks.length - 3} more
        </button>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function KanbanQuickView({ onNavigateToKanban }: KanbanQuickViewProps) {
  // State
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY);
    return stored === "true";
  });
  const [features, setFeatures] = useState<Feature[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load features first
      const featuresData = await kanbanApi.getFeatures();
      setFeatures(featuresData);

      // Load tasks for all active features
      const activeFeatures = featuresData.filter(
        (f) => f.status === "in_progress" || f.status === "approved",
      );

      if (activeFeatures.length > 0) {
        // Load tasks for the first active feature as a sample
        // In a real app, you might want to aggregate across all features
        const tasksData = await kanbanApi.getTasks(activeFeatures[0].id);
        setTasks(tasksData);
      } else {
        setTasks([]);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load data";
      setError(message);
      console.error("Failed to load kanban data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Calculate summary
  const summary: TaskSummary = useMemo(
    () => ({
      pending: tasksByStatus.pending.length,
      in_progress: tasksByStatus.in_progress.length,
      blocked: tasksByStatus.blocked.length,
      qa: tasksByStatus.qa.length,
      completed: tasksByStatus.completed.length,
    }),
    [tasksByStatus],
  );

  // Summary text for collapsed state
  const summaryText = useMemo(() => {
    const parts: string[] = [];
    if (summary.in_progress > 0) {
      parts.push(`${summary.in_progress} in progress`);
    }
    if (summary.blocked > 0) {
      parts.push(`${summary.blocked} blocked`);
    }
    if (summary.pending > 0) {
      parts.push(`${summary.pending} pending`);
    }
    if (summary.completed > 0) {
      parts.push(`${summary.completed} done`);
    }
    return parts.length > 0 ? parts.join(", ") : "No tasks";
  }, [summary]);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  // Don't render if no features exist
  if (!loading && features.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <IconKanban className="w-5 h-5 text-[var(--accent-primary)]" />
          <span className="font-medium text-[var(--text-primary)]">
            Project Tasks
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Summary when collapsed */}
          {isCollapsed && !loading && (
            <span className="text-sm text-[var(--text-tertiary)]">
              {summaryText}
            </span>
          )}

          {/* Expand/collapse icon */}
          <IconChevron
            className="w-4 h-4 text-[var(--text-tertiary)] transition-transform"
            direction={isCollapsed ? "down" : "up"}
          />
        </div>
      </button>

      {/* Content - collapsible */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          {/* Loading state */}
          {loading && (
            <div className="py-8 text-center">
              <div
                className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
                style={{
                  borderColor: "var(--accent-primary)",
                  borderTopColor: "transparent",
                }}
              />
              <span className="text-sm text-[var(--text-tertiary)]">
                Loading tasks...
              </span>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="py-4 text-center">
              <p className="text-sm text-[var(--accent-rose)]">{error}</p>
              <button
                onClick={loadData}
                className="mt-2 text-xs text-[var(--accent-primary)] hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>
              {/* Status columns */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <StatusColumn
                  status="pending"
                  tasks={tasksByStatus.pending}
                  onViewAll={onNavigateToKanban}
                />
                <StatusColumn
                  status="in_progress"
                  tasks={tasksByStatus.in_progress}
                  onViewAll={onNavigateToKanban}
                />
                <StatusColumn
                  status="completed"
                  tasks={tasksByStatus.completed}
                  onViewAll={onNavigateToKanban}
                />
              </div>

              {/* View full board button */}
              {onNavigateToKanban && (
                <button
                  onClick={onNavigateToKanban}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <span>View full Kanban board</span>
                  <IconExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
