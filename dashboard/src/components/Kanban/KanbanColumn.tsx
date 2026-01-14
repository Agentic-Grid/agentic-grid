/**
 * KanbanColumn Component
 * A single column in the Kanban board representing a task status
 */

import { useState, type DragEvent } from "react";
import clsx from "clsx";
import type { Task, TaskStatus } from "../../types/kanban";
import { COLUMN_CONFIG, STATUS_COLORS } from "../../types/kanban";
import { TaskCard, TaskCardSkeleton } from "./TaskCard";

// =============================================================================
// TYPES
// =============================================================================

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  loading?: boolean;
  onTaskDrop?: (taskId: string, targetColumn: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
  onAddTask?: (column: TaskStatus) => void;
}

// =============================================================================
// ICONS
// =============================================================================

function IconPlus({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      width="16"
      height="16"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

function IconInbox({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      width="32"
      height="32"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function ColumnEmptyState({ status }: { status: TaskStatus }) {
  return (
    <div className="kanban-column-empty">
      <IconInbox className="kanban-column-empty-icon" />
      <span className="kanban-column-empty-text">No tasks</span>
      <span className="kanban-column-empty-hint">
        {status === "pending"
          ? "Drag tasks here or click + to add"
          : "Drag tasks here"}
      </span>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function KanbanColumn({
  status,
  tasks,
  loading = false,
  onTaskDrop,
  onTaskClick,
  onAddTask,
}: KanbanColumnProps) {
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const config = COLUMN_CONFIG[status];
  const statusColor = STATUS_COLORS[status];

  // =============================================================================
  // DRAG AND DROP HANDLERS
  // =============================================================================

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDropTarget(true);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDropTarget(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // Only set false if leaving the column entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDropTarget(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDropTarget(false);

    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId && onTaskDrop) {
      onTaskDrop(taskId, status);
    }
  };

  const handleTaskDragStart = (_e: DragEvent, task: Task) => {
    setDraggingTaskId(task.id);
  };

  const handleTaskDragEnd = () => {
    setDraggingTaskId(null);
    setIsDropTarget(false);
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div
      className={clsx(
        "kanban-column",
        isDropTarget && "kanban-column-drop-target",
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="listbox"
      aria-label={`${config.title} tasks, ${tasks.length} items`}
    >
      {/* Column Header */}
      <div
        className="kanban-column-header"
        style={{ borderBottomColor: statusColor.color }}
      >
        <div className="kanban-column-header-left">
          <h3 className="kanban-column-title">{config.title}</h3>
          <span className="kanban-column-count">{tasks.length}</span>
        </div>
        {status === "pending" && onAddTask && (
          <button
            className="kanban-column-add-btn"
            onClick={() => onAddTask(status)}
            aria-label="Add task"
          >
            <IconPlus />
          </button>
        )}
      </div>

      {/* Column Body */}
      <div className="kanban-column-body">
        {loading ? (
          // Loading skeleton
          <>
            <TaskCardSkeleton />
            <TaskCardSkeleton />
            <TaskCardSkeleton />
          </>
        ) : tasks.length === 0 ? (
          // Empty state
          <ColumnEmptyState status={status} />
        ) : (
          // Task cards
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDragging={draggingTaskId === task.id}
              onDragStart={handleTaskDragStart}
              onDragEnd={handleTaskDragEnd}
              onClick={onTaskClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
