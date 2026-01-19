/**
 * KanbanBoard Component
 * Main Kanban board with 3 columns (To Do, In Progress, Done)
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Task, TaskStatus } from "../../types/kanban";
import type { SessionDetail } from "../../types";
import { DEFAULT_COLUMNS } from "../../types/kanban";
import { useKanban, useTasksByStatus } from "../../contexts/KanbanContext";
import { KanbanHeader } from "./KanbanHeader";
import { KanbanColumn } from "./KanbanColumn";
import { TaskDetailModal } from "./TaskDetailModal";
import { MiniSessionWindow } from "../Dashboard/MiniSessionWindow";
import { ChatView } from "../Chat/ChatView";
import {
  getSessionDetail,
  encodeProjectPath,
  setSessionName as apiSetSessionName,
} from "../../services/api";
import { updateFeatureSession as apiUpdateFeatureSession } from "../../services/kanban";

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
// LOADING STATE
// =============================================================================

function BoardLoadingSkeleton() {
  return (
    <div className="kanban-columns">
      {["To Do", "In Progress", "Done"].map((title) => (
        <div key={title} className="kanban-column">
          <div className="kanban-column-header">
            <div className="kanban-column-title">
              <div className="h-5 w-20 bg-[var(--bg-hover)] rounded animate-pulse" />
            </div>
            <div className="h-6 w-6 bg-[var(--bg-hover)] rounded-full animate-pulse" />
          </div>
          <div className="kanban-column-content space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-16 bg-[var(--bg-hover)] rounded animate-pulse" />
                  <div className="h-5 w-12 bg-[var(--bg-hover)] rounded-full animate-pulse" />
                </div>
                <div className="h-5 w-full bg-[var(--bg-hover)] rounded animate-pulse mb-2" />
                <div className="h-4 w-3/4 bg-[var(--bg-hover)] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function HeaderLoadingSkeleton() {
  return (
    <div className="kanban-header">
      <div className="kanban-header-left">
        <div className="w-6 h-6 bg-[var(--bg-hover)] rounded animate-pulse" />
        <div>
          <div className="h-6 w-48 bg-[var(--bg-hover)] rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-[var(--bg-hover)] rounded animate-pulse" />
        </div>
      </div>
      <div className="kanban-header-right">
        <div className="h-9 w-28 bg-[var(--bg-hover)] rounded-lg animate-pulse" />
      </div>
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
    projectName,
    projectPath,
    moveTask,
    updateTaskStatus,
    refreshTasks,
    clearError,
  } = useKanban();

  const tasksByStatus = useTasksByStatus();

  // Modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Feature execution tracking
  const [featureSessionId, setFeatureSessionId] = useState<string | null>(null);
  const [featureSessionDetail, setFeatureSessionDetail] =
    useState<SessionDetail | null>(null);
  const [featureSessionName, setFeatureSessionName] = useState<string>("");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSessionMinimized, setIsSessionMinimized] = useState(false);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);
  const sessionFetchInterval = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  // Load session from feature.session_id when feature changes
  useEffect(() => {
    if (!selectedFeature) {
      // Clear session state when no feature selected
      setFeatureSessionId(null);
      setFeatureSessionDetail(null);
      setFeatureSessionName("");
      setIsMaximized(false);
      setIsSessionMinimized(false);
      setSessionLoadError(null);
      return;
    }

    // Check if the feature has an associated session_id
    if (selectedFeature.session_id) {
      setFeatureSessionId(selectedFeature.session_id);
      setFeatureSessionName(selectedFeature.id);
      setIsSessionMinimized(false); // Show session window when loading stored session
    } else {
      // No session associated - clear state
      setFeatureSessionId(null);
      setFeatureSessionDetail(null);
      setFeatureSessionName("");
    }
  }, [selectedFeature]);

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
   * Handle feature execution started
   * Note: Backend already saves session_id to feature YAML in the start route
   */
  const handleFeatureStarted = useCallback(
    (_featureId: string, sessionId: string) => {
      setFeatureSessionId(sessionId);
      setFeatureSessionDetail(null);
      setSessionLoadError(null);
      setIsSessionMinimized(false);
      // Set initial session name based on feature
      if (selectedFeature) {
        setFeatureSessionName(selectedFeature.id);
      }
      // Refresh tasks to show updated status
      refreshTasks();
    },
    [refreshTasks, selectedFeature],
  );

  /**
   * Handle session name change
   */
  const handleSessionNameChange = useCallback(
    async (name: string) => {
      if (!featureSessionId) return;
      try {
        await apiSetSessionName(featureSessionId, name);
        setFeatureSessionName(name);
      } catch (err) {
        console.error("Failed to save session name:", err);
      }
    },
    [featureSessionId],
  );

  /**
   * Handle maximize session (show full ChatView)
   */
  const handleMaximize = useCallback(() => {
    setIsMaximized(true);
  }, []);

  /**
   * Handle closing maximized view (back to mini window)
   */
  const handleBackFromMaximized = useCallback(() => {
    setIsMaximized(false);
  }, []);

  /**
   * Handle minimizing session window (keeps session associated with feature)
   */
  const handleMinimizeSession = useCallback(() => {
    setIsSessionMinimized(true);
    setIsMaximized(false);
  }, []);

  /**
   * Handle expanding minimized session window
   */
  const handleExpandSession = useCallback(() => {
    setIsSessionMinimized(false);
  }, []);

  /**
   * Handle completely clearing session tracking (removes association from feature YAML)
   */
  const handleClearSession = useCallback(async () => {
    // Clear session_id from feature YAML via API
    if (selectedFeature) {
      try {
        await apiUpdateFeatureSession(selectedFeature.id, null);
      } catch (err) {
        console.error("Failed to clear feature session:", err);
      }
    }
    setFeatureSessionId(null);
    setFeatureSessionDetail(null);
    setFeatureSessionName("");
    setIsMaximized(false);
    setIsSessionMinimized(false);
    // Clear any polling interval
    if (sessionFetchInterval.current) {
      clearInterval(sessionFetchInterval.current);
      sessionFetchInterval.current = null;
    }
  }, [selectedFeature]);

  // Fetch session details when feature execution starts
  useEffect(() => {
    if (!featureSessionId || !projectPath) {
      // Clear interval when session ends
      if (sessionFetchInterval.current) {
        clearInterval(sessionFetchInterval.current);
        sessionFetchInterval.current = null;
      }
      return;
    }

    // Initial fetch with retries (session file may not exist immediately)
    let retryCount = 0;
    const maxRetries = 10;

    const attemptFetch = async () => {
      try {
        const encodedFolder = encodeProjectPath(projectPath);
        const response = await getSessionDetail(
          encodedFolder,
          featureSessionId,
        );
        if (response.data) {
          setFeatureSessionDetail(response.data);
          setSessionLoadError(null);
          return true;
        }
      } catch (err) {
        retryCount++;
        if (retryCount >= maxRetries) {
          setSessionLoadError("Session not ready yet. Retrying...");
        }
        return false;
      }
      return false;
    };

    // Start polling for initial load
    const initialPoll = setInterval(async () => {
      const success = await attemptFetch();
      if (success) {
        clearInterval(initialPoll);
      } else if (retryCount >= maxRetries) {
        clearInterval(initialPoll);
      }
    }, 1000);

    // Cleanup
    return () => {
      clearInterval(initialPoll);
    };
  }, [featureSessionId, projectPath]);

  // Poll for task status updates while feature session is active
  useEffect(() => {
    if (!featureSessionId) {
      return;
    }

    // Poll every 5 seconds to refresh task statuses
    const taskPollInterval = setInterval(() => {
      refreshTasks();
    }, 5000);

    // Cleanup
    return () => {
      clearInterval(taskPollInterval);
    };
  }, [featureSessionId, refreshTasks]);

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
      {loading && !selectedFeature ? (
        <HeaderLoadingSkeleton />
      ) : (
        <KanbanHeader
          feature={selectedFeature}
          projectId={projectName ?? undefined}
          onRefresh={refreshTasks}
          onFeatureStarted={handleFeatureStarted}
          loading={loading}
          hasActiveSession={!!featureSessionId}
        />
      )}

      {/* Error message */}
      {error && <ErrorMessage error={error} onDismiss={clearError} />}

      {/* Board content */}
      {!selectedFeature ? (
        loading ? (
          /* Show skeleton while loading feature data */
          <BoardLoadingSkeleton />
        ) : (
          <EmptyState />
        )
      ) : (
        <>
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

          {/* Feature execution session window (using same component as dashboard) */}
          {featureSessionId && projectPath && !isMaximized && (
            <div className="px-4 pb-4">
              {isSessionMinimized ? (
                /* Minimized session bar - click to expand */
                <button
                  onClick={handleExpandSession}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-emerald)] animate-pulse" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {featureSessionName || "Feature Session"}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Click to expand
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-[var(--text-tertiary)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </div>
                </button>
              ) : featureSessionDetail ? (
                <div className="h-[400px] relative">
                  {/* Minimize button overlay */}
                  <button
                    onClick={handleMinimizeSession}
                    className="absolute top-2 right-14 z-10 p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Minimize session"
                  >
                    <svg
                      className="w-4 h-4"
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
                  </button>
                  <MiniSessionWindow
                    session={featureSessionDetail}
                    sessionName={featureSessionName}
                    onRename={handleSessionNameChange}
                    onMaximize={handleMaximize}
                    onRefresh={refreshTasks}
                    onDelete={handleClearSession}
                  />
                </div>
              ) : sessionLoadError ? (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                  <div className="text-center">
                    <p className="text-sm text-[var(--accent-rose)] mb-2">
                      {sessionLoadError}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Session: {featureSessionId}
                    </p>
                    <button
                      onClick={handleClearSession}
                      className="btn btn-ghost btn-sm mt-3"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                  <div className="flex items-center justify-center gap-2 py-6">
                    <div className="w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-[var(--text-muted)]">
                      Connecting to session...
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[var(--text-muted)]">
                      Session: {featureSessionId}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Task detail modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onStatusChange={handleStatusChange}
        projectPath={projectPath ?? undefined}
      />

      {/* Maximized session view (full ChatView) */}
      {featureSessionId &&
        projectPath &&
        featureSessionDetail &&
        isMaximized && (
          <div className="fixed inset-0 z-50 bg-[var(--bg-primary)]">
            <ChatView
              session={featureSessionDetail}
              onBack={handleBackFromMaximized}
              sessionName={featureSessionName}
              onRename={handleSessionNameChange}
              onKill={() => {}}
              onDelete={handleClearSession}
            />
          </div>
        )}
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
