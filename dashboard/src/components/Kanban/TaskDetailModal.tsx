/**
 * TaskDetailModal Component
 * Modal showing full task details, instructions, progress log, and QA checklist
 */

import { useEffect, useState, useRef } from "react";
import clsx from "clsx";
import type { Task, TaskStatus, QAChecklistItem } from "../../types/kanban";
import {
  AGENT_COLORS,
  STATUS_COLORS,
  COLUMN_CONFIG,
  formatRelativeTime,
} from "../../types/kanban";
import { startTask } from "../../services/kanban";
import { getSessionDetail, encodeProjectPath } from "../../services/api";
import type { ParsedMessage } from "../../types";

// =============================================================================
// TYPES
// =============================================================================

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => Promise<void>;
  /** Callback after task session is spawned */
  onTaskStarted?: (taskId: string, sessionId: string) => void;
  /** Project path for fetching session details */
  projectPath?: string;
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

function IconPlay({ className }: { className?: string }) {
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
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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

/**
 * Mini Session Window for tracking task execution
 */
function MiniSessionWindow({
  sessionId,
  projectPath,
}: {
  sessionId: string;
  projectPath: string;
}) {
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll for messages
  useEffect(() => {
    let isMounted = true;
    const encodedFolder = encodeProjectPath(projectPath);

    const fetchMessages = async () => {
      try {
        const result = await getSessionDetail(encodedFolder, sessionId);
        if (isMounted && result.data?.messages) {
          setMessages(result.data.messages);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch session",
          );
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchMessages();

    // Poll every 2 seconds
    const interval = setInterval(fetchMessages, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, projectPath]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Get abbreviated content
  const getMessagePreview = (msg: ParsedMessage) => {
    // Skip system context messages and tool results
    if (msg.isSystemContext || msg.isToolResult) return null;

    let content = msg.content || "";

    // Truncate long messages
    if (content.length > 300) {
      content = content.substring(0, 300) + "...";
    }

    return content;
  };

  // Filter and process messages for display
  const displayMessages = messages
    .map((msg) => ({
      ...msg,
      preview: getMessagePreview(msg),
    }))
    .filter((msg) => msg.preview);

  return (
    <div className="task-execution-window">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-[var(--accent-emerald)] animate-pulse" />
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Claude Session Live
        </span>
        <span className="text-[10px] text-[var(--text-muted)] ml-auto">
          {messages.length} messages
        </span>
      </div>
      <div
        ref={scrollRef}
        className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-lg p-3 max-h-[300px] overflow-y-auto"
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[var(--text-muted)]">
              Connecting to session...
            </span>
          </div>
        ) : error ? (
          <div className="text-xs text-[var(--text-muted)] text-center py-6">
            <p className="text-[var(--accent-rose)] mb-1">{error}</p>
            <p>Waiting for session to start...</p>
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[var(--text-muted)]">
              Waiting for Claude to respond...
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {displayMessages.slice(-15).map((msg) => (
              <div
                key={msg.id}
                className={clsx(
                  "text-xs",
                  msg.role === "assistant"
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] bg-[var(--bg-hover)] p-2 rounded",
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {msg.role === "assistant" ? (
                    <span className="font-semibold text-[var(--accent-primary)]">
                      Claude
                    </span>
                  ) : (
                    <span className="font-semibold text-[var(--text-tertiary)]">
                      System
                    </span>
                  )}
                  <span className="text-[var(--text-muted)] text-[10px]">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap break-words">
                  {msg.preview}
                </p>
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.toolCalls.slice(0, 5).map((tool, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--bg-hover)] rounded text-[10px] text-[var(--text-tertiary)]"
                      >
                        <svg
                          className="w-2.5 h-2.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {tool.name}
                      </span>
                    ))}
                    {msg.toolCalls.length > 5 && (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        +{msg.toolCalls.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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
  onTaskStarted,
  projectPath,
}: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState<
    "details" | "progress" | "qa" | "execution"
  >("details");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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

  // Reset tab, error, and session when task changes
  useEffect(() => {
    setActiveTab("details");
    setStartError(null);
    setActiveSessionId(null);
  }, [task?.id]);

  if (!isOpen || !task) {
    return null;
  }

  const statusConfig = STATUS_COLORS[task.status];
  const agentConfig = AGENT_COLORS[task.agent];
  const actions = getAvailableActions(task.status);

  // Check if task can be started (pending or blocked)
  const canStartTask = task.status === "pending" || task.status === "blocked";

  const handleStatusAction = async (status: TaskStatus) => {
    if (!onStatusChange) return;

    setIsUpdating(true);
    try {
      await onStatusChange(task.id, status);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartTask = async () => {
    setIsStarting(true);
    setStartError(null);
    try {
      const result = await startTask(task.id, false); // Don't skip permissions by default
      if (result.success && result.sessionId) {
        // Store session ID and switch to execution tab
        setActiveSessionId(result.sessionId);
        setActiveTab("execution");
        onTaskStarted?.(task.id, result.sessionId);
        // Update status to in_progress locally - the server already did this
        if (onStatusChange) {
          await onStatusChange(task.id, "in_progress");
        }
      }
    } catch (err) {
      setStartError(
        err instanceof Error ? err.message : "Failed to start task",
      );
    } finally {
      setIsStarting(false);
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
            Progress ({task.progress?.length ?? 0})
          </button>
          <button
            className={clsx("tab", activeTab === "qa" && "active")}
            onClick={() => setActiveTab("qa")}
          >
            QA Checklist
          </button>
          {activeSessionId && projectPath && (
            <button
              className={clsx("tab", activeTab === "execution" && "active")}
              onClick={() => setActiveTab("execution")}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-emerald)] animate-pulse" />
                Execution
              </span>
            </button>
          )}
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
              {((task.depends_on?.length ?? 0) > 0 ||
                (task.blocks?.length ?? 0) > 0) && (
                <div className="task-detail-section">
                  <h3 className="task-detail-section-title">Dependencies</h3>
                  {(task.depends_on?.length ?? 0) > 0 && (
                    <div className="task-detail-deps">
                      <span className="task-detail-deps-label">
                        Depends on:
                      </span>
                      {task.depends_on?.map((dep) => (
                        <span key={dep} className="task-detail-dep-tag">
                          {dep}
                        </span>
                      ))}
                    </div>
                  )}
                  {(task.blocks?.length ?? 0) > 0 && (
                    <div className="task-detail-deps">
                      <span className="task-detail-deps-label">Blocks:</span>
                      {task.blocks?.map((dep) => (
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
              {(task.progress?.length ?? 0) === 0 ? (
                <div className="task-detail-empty">No progress entries yet</div>
              ) : (
                (task.progress ?? [])
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
                    task.qa?.status === "passed" && "text-emerald",
                    task.qa?.status === "failed" && "text-rose",
                    task.qa?.status === "pending" && "text-muted",
                  )}
                >
                  {task.qa?.status ?? "pending"}
                </span>
              </div>

              {(task.qa?.checklist?.length ?? 0) === 0 ? (
                <div className="task-detail-empty">No QA checklist items</div>
              ) : (
                <div className="task-detail-qa-list">
                  {task.qa?.checklist?.map((item, index) => (
                    <QAChecklistItemRow key={index} item={item} />
                  ))}
                </div>
              )}

              {task.qa?.notes && (
                <div className="task-detail-qa-notes">
                  <span className="task-detail-qa-notes-label">Notes:</span>
                  <p>{task.qa.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "execution" && activeSessionId && projectPath && (
            <div className="task-detail-execution">
              <MiniSessionWindow
                sessionId={activeSessionId}
                projectPath={projectPath}
              />
            </div>
          )}
        </div>

        {/* Error message for start task */}
        {startError && (
          <div className="px-6 py-2 bg-[var(--accent-rose-glow)] border-t border-[var(--accent-rose)]/30">
            <p className="text-sm text-[var(--accent-rose)]">{startError}</p>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer task-detail-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <div className="task-detail-actions">
            {/* Start in Claude button - primary action for pending/blocked tasks */}
            {canStartTask && (
              <button
                className="btn btn-primary flex items-center gap-2"
                onClick={handleStartTask}
                disabled={isStarting || isUpdating}
              >
                {isStarting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <IconPlay className="w-4 h-4" />
                    Start in Claude
                  </>
                )}
              </button>
            )}
            {actions.map((action) => (
              <button
                key={action.status}
                className={clsx("btn", `btn-${action.variant}`)}
                onClick={() => handleStatusAction(action.status)}
                disabled={isUpdating || isStarting}
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
