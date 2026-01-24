/**
 * TaskCard Component - Premium Glassmorphism Design
 * Individual task card for Kanban board with drag-drop support
 * Design inspired by reference images with colored glows per agent
 */

import { useState, type DragEvent, type ReactNode } from "react";
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
// AGENT ICONS
// =============================================================================

const AgentIcons: Record<AgentType, ReactNode> = {
  DISCOVERY: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  DESIGNER: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  FRONTEND: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  BACKEND: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  DATA: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  DEVOPS: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  QA: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Agent icon with colored background
 */
function AgentIcon({ agent }: { agent: AgentType }) {
  const config = AGENT_COLORS[agent];

  return (
    <div
      className="task-card-icon"
      style={{
        backgroundColor: `color-mix(in srgb, ${config.color} 20%, transparent)`,
        color: config.color,
        boxShadow: `0 0 20px ${config.glow}`,
      }}
    >
      {AgentIcons[agent]}
    </div>
  );
}

/**
 * Status badge with glow
 */
function StatusBadge({ status }: { status: TaskStatus }) {
  const config = STATUS_COLORS[status];

  return (
    <span
      className={clsx(
        "task-card-status-badge",
        status === "in_progress" && "task-card-status-pulse"
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${config.color} 15%, transparent)`,
        color: config.color,
        borderColor: `color-mix(in srgb, ${config.color} 30%, transparent)`,
      }}
    >
      <span
        className="task-card-status-dot"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}

/**
 * Priority indicator line (colored top edge)
 */
function getPriorityColor(priority: Task["priority"]): string {
  switch (priority) {
    case "high":
      return "var(--accent-rose)";
    case "medium":
      return "var(--accent-amber)";
    default:
      return "transparent";
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
  const agentConfig = AGENT_COLORS[task.agent];

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
        "task-card",
        isDragging && "task-card-dragging",
        isDropTarget && "task-card-drop-target",
        isHovered && !isDragging && "task-card-hover",
      )}
      style={{
        "--card-accent": agentConfig.color,
        "--card-glow": agentConfig.glow,
      } as React.CSSProperties}
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
      {/* Top glow edge - colored by agent */}
      <div
        className="task-card-glow-edge"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${agentConfig.color} 50%, transparent 100%)`,
        }}
      />

      {/* Priority indicator line */}
      {task.priority !== "low" && (
        <div
          className="task-card-priority-line"
          style={{ backgroundColor: getPriorityColor(task.priority) }}
        />
      )}

      {/* Card content */}
      <div className="task-card-content">
        {/* Header: Icon + ID + Status */}
        <div className="task-card-header">
          <AgentIcon agent={task.agent} />
          <div className="task-card-meta">
            <span className="task-card-id">{task.id}</span>
            <StatusBadge status={task.status} />
          </div>
        </div>

        {/* Body: Title + Description */}
        <div className="task-card-body">
          <h4 className="task-card-title">{task.title}</h4>
          {/* Show specification objective or instructions preview */}
          {(task.specification?.objective || task.instructions) && (
            <p className="task-card-description">
              {task.specification?.objective || task.instructions}
            </p>
          )}
        </div>

        {/* Meta row: Files + Dependencies */}
        {((task.files?.create?.length || task.files?.modify?.length) ||
          task.depends_on?.length > 0 || task.blocks?.length > 0) && (
          <div className="task-card-meta-row">
            {/* Files indicator */}
            {(task.files?.create?.length || task.files?.modify?.length) ? (
              <span className="task-card-files">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {(task.files?.create?.length || 0) + (task.files?.modify?.length || 0)} files
              </span>
            ) : null}
            {/* Dependencies indicator */}
            {task.depends_on?.length > 0 && (
              <span className="task-card-deps has-deps">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {task.depends_on.length} deps
              </span>
            )}
            {/* Blocks indicator */}
            {task.blocks?.length > 0 && (
              <span className="task-card-deps has-blockers">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                blocks {task.blocks.length}
              </span>
            )}
          </div>
        )}

        {/* Footer: Agent label + timestamp */}
        <div className="task-card-footer">
          <span
            className="task-card-agent"
            style={{ color: agentConfig.color }}
          >
            {agentConfig.label}
          </span>
          <span className="task-card-timestamp">
            {formatRelativeTime(task.updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SKELETON LOADER
// =============================================================================

export function TaskCardSkeleton() {
  return (
    <div className="task-card task-card-skeleton">
      <div className="task-card-glow-edge" style={{ opacity: 0.3 }} />
      <div className="task-card-content">
        <div className="task-card-header">
          <div className="task-card-icon skeleton-pulse" />
          <div className="task-card-meta">
            <span className="skeleton-text skeleton-id" />
            <span className="skeleton-badge" />
          </div>
        </div>
        <div className="task-card-body">
          <span className="skeleton-text skeleton-title" />
          <span className="skeleton-text skeleton-title-short" />
        </div>
        <div className="task-card-footer">
          <span className="skeleton-text skeleton-agent" />
          <span className="skeleton-text skeleton-time" />
        </div>
      </div>
    </div>
  );
}
