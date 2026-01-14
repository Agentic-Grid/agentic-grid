/**
 * KanbanBoard Component
 * Main Kanban board with 3 columns (To Do, In Progress, Done)
 */

import { useState, useMemo, useCallback } from "react";
import type { Task, TaskStatus } from "../../types/kanban";
import { DEFAULT_COLUMNS } from "../../types/kanban";
import { useKanban, useTasksByStatus } from "../../contexts/KanbanContext";
import { KanbanHeader } from "./KanbanHeader";
import { KanbanColumn } from "./KanbanColumn";
import { TaskDetailModal } from "./TaskDetailModal";
import {
  executeFeatureParallel,
  type ExecuteParallelOptions,
} from "../../services/api";

// =============================================================================
// TYPES
// =============================================================================

interface KanbanBoardProps {
  /** Columns to display (defaults to 3-column layout) */
  columns?: TaskStatus[];
  /** Optional callback when task is clicked */
  onTaskClick?: (task: Task) => void;
}

// =============================================================================
// ERROR MESSAGE
// =============================================================================

function ErrorMessage({
  error,
  onDismiss,
}: {
  error: string;
  onDismiss: () => void;
}) {
  return (
    <div className="kanban-error">
      <span>{error}</span>
      <button onClick={onDismiss} className="kanban-error-dismiss">
        Dismiss
      </button>
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState() {
  return (
    <div className="kanban-empty-state">
      <div className="kanban-empty-icon">
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          width="64"
          height="64"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
      </div>
      <h2 className="kanban-empty-title">No Feature Selected</h2>
      <p className="kanban-empty-text">
        Select a feature from the sidebar to view its tasks
      </p>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function KanbanBoard({
  columns = DEFAULT_COLUMNS,
  onTaskClick,
}: KanbanBoardProps) {
  const {
    selectedFeature,
    loading,
    error,
    moveTask,
    updateTaskStatus,
    refreshTasks,
    clearError,
  } = useKanban();

  const tasksByStatus = useTasksByStatus();

  // Modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Execution state
  const [executing, setExecuting] = useState(false);

  // =============================================================================
  // HANDLERS
  // =============================================================================

  /**
   * Handle task drop on column
   */
  const handleTaskDrop = useCallback(
    async (taskId: string, targetColumn: TaskStatus) => {
      try {
        await moveTask(taskId, targetColumn);
      } catch (err) {
        // Error is already handled in context
        console.error("Failed to move task:", err);
      }
    },
    [moveTask],
  );

  /**
   * Handle task click - open modal
   */
  const handleTaskClick = useCallback(
    (task: Task) => {
      setSelectedTask(task);
      setIsModalOpen(true);
      onTaskClick?.(task);
    },
    [onTaskClick],
  );

  /**
   * Handle modal close
   */
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    // Keep selectedTask for animation, clear after
    setTimeout(() => setSelectedTask(null), 200);
  }, []);

  /**
   * Handle status change from modal
   */
  const handleStatusChange = useCallback(
    async (taskId: string, status: TaskStatus) => {
      await updateTaskStatus(taskId, status);
      // Update selected task if it's the same one
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => (prev ? { ...prev, status } : null));
      }
    },
    [updateTaskStatus, selectedTask],
  );

  /**
   * Handle execute all tasks for the feature
   */
  const handleExecuteAll = useCallback(
    async (featureId: string, options?: ExecuteParallelOptions) => {
      setExecuting(true);
      try {
        const result = await executeFeatureParallel(featureId, options);
        if (result.data.success) {
          // Refresh tasks to show updated status
          await refreshTasks();
        } else {
          throw new Error("Execution failed");
        }
      } finally {
        setExecuting(false);
      }
    },
    [refreshTasks],
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  // Filter tasks for the columns being displayed
  const columnData = useMemo(() => {
    return columns.map((status) => ({
      status,
      tasks: tasksByStatus[status] || [],
    }));
  }, [columns, tasksByStatus]);

  return (
    <div
      className="kanban-board"
      role="region"
      aria-label="Project Kanban Board"
    >
      {/* Header */}
      <KanbanHeader
        feature={selectedFeature}
        onRefresh={refreshTasks}
        onExecuteAll={handleExecuteAll}
        loading={loading}
        executing={executing}
      />

      {/* Error message */}
      {error && <ErrorMessage error={error} onDismiss={clearError} />}

      {/* Board content */}
      {!selectedFeature ? (
        <EmptyState />
      ) : (
        <div className="kanban-columns">
          {columnData.map(({ status, tasks }) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasks}
              loading={loading && tasks.length === 0}
              onTaskDrop={handleTaskDrop}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>
      )}

      {/* Task detail modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export { KanbanHeader } from "./KanbanHeader";
export { KanbanColumn } from "./KanbanColumn";
export { TaskCard, TaskCardSkeleton } from "./TaskCard";
export { TaskDetailModal } from "./TaskDetailModal";
