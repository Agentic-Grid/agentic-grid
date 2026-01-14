/**
 * TaskCard Component
 * Individual task card for Kanban board with drag-drop support
 */

import { useState, type DragEvent } from "react";
import clsx from "clsx";
import type { Task, TaskStatus, AgentType } from "../../types/kanban";
import {
  AGENT_COLORS,
  STATUS_COLORS,
  formatRelativeTime,
} from "../../types/kanban";

// =============================================================================
// TYPES
// =============================================================================

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: (e: DragEvent<HTMLDivElement>, task: Task) => void;
  onDragEnd?: (e: DragEvent<HTMLDivElement>) => void;
  onClick?: (task: Task) => void;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Status indicator dot
 */
function StatusDot({ status }: { status: TaskStatus }) {
  const config = STATUS_COLORS[status];

  return (
    <span
      className={clsx(
        "kanban-status-dot",
        status === "in_progress" && "kanban-status-dot-pulse",
      )}
      style={{
        backgroundColor: config.color,
      }}
      aria-label={`Status: ${config.label}`}
    />
  );
}

/**
 * Agent badge
 */
function AgentBadge({ agent }: { agent: AgentType }) {
  const config = AGENT_COLORS[agent];

  return (
    <span
      className="kanban-agent-badge"
      style={{
        backgroundColor: `color-mix(in srgb, ${config.color} 15%, transparent)`,
        color: config.color,
        borderColor: `color-mix(in srgb, ${config.color} 30%, transparent)`,
      }}
    >
      {config.label}
    </span>
  );
}

/**
 * Priority indicator (border-left accent)
 */
function getPriorityStyle(priority: Task["priority"]): React.CSSProperties {
  switch (priority) {
    case "high":
      return { borderLeftColor: "var(--accent-rose)", borderLeftWidth: "3px" };
    case "medium":
      return { borderLeftColor: "var(--accent-amber)", borderLeftWidth: "3px" };
    default:
      return {};
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TaskCard({
  task,
  isDragging = false,
  isDropTarget = false,
  onDragStart,
  onDragEnd,
  onClick,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Handle drag start
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(e, task);
  };

  // Handle drag end
  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    onDragEnd?.(e);
  };

  // Handle click
  const handleClick = () => {
    onClick?.(task);
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(task);
    }
  };

  return (
    <div
      className={clsx(
        "kanban-task-card",
        isDragging && "kanban-task-card-dragging",
        isDropTarget && "kanban-task-card-drop-target",
        isHovered && !isDragging && "kanban-task-card-hover",
      )}
      style={getPriorityStyle(task.priority)}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="option"
      aria-label={`${task.title}, assigned to ${task.agent}, status ${task.status}`}
      tabIndex={0}
    >
      {/* Header: Status dot + Task ID */}
      <div className="kanban-task-card-header">
        <StatusDot status={task.status} />
        <span className="kanban-task-id">{task.id}</span>
      </div>

      {/* Body: Title */}
      <div className="kanban-task-card-body">
        <h4 className="kanban-task-title">{task.title}</h4>
      </div>

      {/* Footer: Agent badge + timestamp */}
      <div className="kanban-task-card-footer">
        <AgentBadge agent={task.agent} />
        <span className="kanban-task-timestamp">
          {formatRelativeTime(task.updated_at)}
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// SKELETON LOADER
// =============================================================================

export function TaskCardSkeleton() {
  return (
    <div className="kanban-task-card kanban-task-card-skeleton">
      <div className="kanban-task-card-header">
        <span className="skeleton-dot" />
        <span className="skeleton-text skeleton-id" />
      </div>
      <div className="kanban-task-card-body">
        <span className="skeleton-text skeleton-title" />
        <span className="skeleton-text skeleton-title-short" />
      </div>
      <div className="kanban-task-card-footer">
        <span className="skeleton-badge" />
        <span className="skeleton-text skeleton-time" />
      </div>
    </div>
  );
}
