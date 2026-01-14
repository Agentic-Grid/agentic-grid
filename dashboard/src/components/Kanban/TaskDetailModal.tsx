/**
 * TaskDetailModal Component
 * Modal showing full task details, instructions, progress log, and QA checklist
 */

import { useEffect, useState } from "react";
import clsx from "clsx";
import type { Task, TaskStatus, QAChecklistItem } from "../../types/kanban";
import {
  AGENT_COLORS,
  STATUS_COLORS,
  COLUMN_CONFIG,
  formatRelativeTime,
} from "../../types/kanban";

// =============================================================================
// TYPES
// =============================================================================

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => Promise<void>;
}

// =============================================================================
// ICONS
// =============================================================================

function IconClose({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      width="20"
      height="20"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
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
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
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
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// =============================================================================
// STATUS ACTIONS
// =============================================================================

interface StatusAction {
  status: TaskStatus;
  label: string;
  variant: "primary" | "success" | "danger" | "ghost";
}

function getAvailableActions(currentStatus: TaskStatus): StatusAction[] {
  switch (currentStatus) {
    case "pending":
      return [
        { status: "in_progress", label: "Start Task", variant: "primary" },
      ];
    case "in_progress":
      return [
        { status: "blocked", label: "Mark Blocked", variant: "danger" },
        { status: "qa", label: "Submit for QA", variant: "primary" },
        { status: "completed", label: "Mark Complete", variant: "success" },
      ];
    case "blocked":
      return [
        { status: "in_progress", label: "Resume Task", variant: "primary" },
      ];
    case "qa":
      return [
        { status: "in_progress", label: "Needs Work", variant: "danger" },
        {
          status: "completed",
          label: "Approve & Complete",
          variant: "success",
        },
      ];
    case "completed":
      return [{ status: "in_progress", label: "Reopen", variant: "ghost" }];
    default:
      return [];
  }
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/**
 * Task metadata row
 */
function MetadataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="task-detail-meta-row">
      <span className="task-detail-meta-label">{label}</span>
      <span className="task-detail-meta-value">{children}</span>
    </div>
  );
}

/**
 * Progress entry component
 */
function ProgressEntry({ entry }: { entry: Task["progress"][0] }) {
  const agentColor =
    entry.agent === "ORCHESTRATOR" || entry.agent === "USER"
      ? "var(--text-tertiary)"
      : AGENT_COLORS[entry.agent]?.color || "var(--text-tertiary)";

  return (
    <div className="task-detail-progress-entry">
      <div className="task-detail-progress-time">
        {formatRelativeTime(entry.timestamp)}
      </div>
      <div className="task-detail-progress-content">
        <span
          className="task-detail-progress-agent"
          style={{ color: agentColor }}
        >
          {entry.agent}
        </span>
        {entry.action && (
          <span className="task-detail-progress-action">{entry.action}</span>
        )}
        <span className="task-detail-progress-note">{entry.note}</span>
      </div>
    </div>
  );
}

/**
 * QA Checklist item
 */
function QAChecklistItemRow({ item }: { item: string | QAChecklistItem }) {
  const isObject = typeof item !== "string";
  const text = isObject ? item.item : item;
  const passed = isObject ? item.passed : null;

  return (
    <div className="task-detail-qa-item">
      <span
        className={clsx(
          "task-detail-qa-check",
          passed === true && "task-detail-qa-check-passed",
          passed === false && "task-detail-qa-check-failed",
          passed === null && "task-detail-qa-check-pending",
        )}
      >
        {passed === true && <IconCheck />}
        {passed === false && <IconClose className="w-3 h-3" />}
      </span>
      <span className="task-detail-qa-text">{text}</span>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onStatusChange,
}: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "progress" | "qa">(
    "details",
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Reset tab when task changes
  useEffect(() => {
    setActiveTab("details");
  }, [task?.id]);

  if (!isOpen || !task) {
    return null;
  }

  const statusConfig = STATUS_COLORS[task.status];
  const agentConfig = AGENT_COLORS[task.agent];
  const actions = getAvailableActions(task.status);

  const handleStatusAction = async (status: TaskStatus) => {
    if (!onStatusChange) return;

    setIsUpdating(true);
    try {
      await onStatusChange(task.id, status);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="modal-backdrop animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-title"
    >
      <div className="modal-content animate-slide-up task-detail-modal">
        {/* Header */}
        <div className="modal-header task-detail-header">
          <div className="task-detail-header-left">
            <span className="task-detail-id">{task.id}</span>
            <h2 id="task-detail-title" className="task-detail-title">
              {task.title}
            </h2>
          </div>
          <button
            className="task-detail-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <IconClose />
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={clsx("tab", activeTab === "details" && "active")}
            onClick={() => setActiveTab("details")}
          >
            Details
          </button>
          <button
            className={clsx("tab", activeTab === "progress" && "active")}
            onClick={() => setActiveTab("progress")}
          >
            Progress ({task.progress.length})
          </button>
          <button
            className={clsx("tab", activeTab === "qa" && "active")}
            onClick={() => setActiveTab("qa")}
          >
            QA Checklist
          </button>
        </div>

        {/* Body */}
        <div className="modal-body task-detail-body">
          {activeTab === "details" && (
            <div className="task-detail-content">
              {/* Metadata */}
              <div className="task-detail-section">
                <h3 className="task-detail-section-title">Metadata</h3>
                <div className="task-detail-meta">
                  <MetadataRow label="Status">
                    <span
                      className="task-detail-status-badge"
                      style={{
                        backgroundColor: statusConfig.bgColor,
                        color: statusConfig.color,
                        borderColor: statusConfig.borderColor,
                      }}
                    >
                      {COLUMN_CONFIG[task.status].title}
                    </span>
                  </MetadataRow>
                  <MetadataRow label="Agent">
                    <span style={{ color: agentConfig.color }}>
                      {agentConfig.label}
                    </span>
                  </MetadataRow>
                  <MetadataRow label="Priority">
                    <span
                      className={clsx(
                        "task-detail-priority",
                        task.priority === "high" && "task-detail-priority-high",
                        task.priority === "medium" &&
                          "task-detail-priority-medium",
                      )}
                    >
                      {task.priority}
                    </span>
                  </MetadataRow>
                  <MetadataRow label="Phase">{task.phase}</MetadataRow>
                  <MetadataRow label="Type">{task.type}</MetadataRow>
                  {task.estimated_minutes && (
                    <MetadataRow label="Estimated">
                      <IconClock className="inline mr-1" />
                      {task.estimated_minutes} min
                    </MetadataRow>
                  )}
                  <MetadataRow label="Updated">
                    {formatRelativeTime(task.updated_at)}
                  </MetadataRow>
                </div>
              </div>

              {/* Instructions */}
              <div className="task-detail-section">
                <h3 className="task-detail-section-title">Instructions</h3>
                <div className="task-detail-instructions">
                  <pre>{task.instructions}</pre>
                </div>
              </div>

              {/* Dependencies */}
              {(task.depends_on.length > 0 || task.blocks.length > 0) && (
                <div className="task-detail-section">
                  <h3 className="task-detail-section-title">Dependencies</h3>
                  {task.depends_on.length > 0 && (
                    <div className="task-detail-deps">
                      <span className="task-detail-deps-label">
                        Depends on:
                      </span>
                      {task.depends_on.map((dep) => (
                        <span key={dep} className="task-detail-dep-tag">
                          {dep}
                        </span>
                      ))}
                    </div>
                  )}
                  {task.blocks.length > 0 && (
                    <div className="task-detail-deps">
                      <span className="task-detail-deps-label">Blocks:</span>
                      {task.blocks.map((dep) => (
                        <span key={dep} className="task-detail-dep-tag">
                          {dep}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "progress" && (
            <div className="task-detail-progress">
              {task.progress.length === 0 ? (
                <div className="task-detail-empty">No progress entries yet</div>
              ) : (
                task.progress
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <ProgressEntry key={index} entry={entry} />
                  ))
              )}
            </div>
          )}

          {activeTab === "qa" && (
            <div className="task-detail-qa">
              <div className="task-detail-qa-status">
                <span className="task-detail-qa-status-label">QA Status:</span>
                <span
                  className={clsx(
                    "task-detail-qa-status-value",
                    task.qa.status === "passed" && "text-emerald",
                    task.qa.status === "failed" && "text-rose",
                    task.qa.status === "pending" && "text-muted",
                  )}
                >
                  {task.qa.status}
                </span>
              </div>

              {task.qa.checklist.length === 0 ? (
                <div className="task-detail-empty">No QA checklist items</div>
              ) : (
                <div className="task-detail-qa-list">
                  {task.qa.checklist.map((item, index) => (
                    <QAChecklistItemRow key={index} item={item} />
                  ))}
                </div>
              )}

              {task.qa.notes && (
                <div className="task-detail-qa-notes">
                  <span className="task-detail-qa-notes-label">Notes:</span>
                  <p>{task.qa.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer task-detail-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <div className="task-detail-actions">
            {actions.map((action) => (
              <button
                key={action.status}
                className={clsx("btn", `btn-${action.variant}`)}
                onClick={() => handleStatusAction(action.status)}
                disabled={isUpdating}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
