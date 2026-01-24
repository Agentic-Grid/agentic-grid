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

  // Floating session window state - default to floating mode
  const [isSessionFloating, setIsSessionFloating] = useState(true);
  // Position in lower-left corner: x = 20px from left, y calculated from bottom
  const [floatingPosition, setFloatingPosition] = useState(() => ({
    x: 20,
    y: typeof window !== "undefined" ? window.innerHeight - 400 - 20 : 100,
  }));
  const [floatingSize, setFloatingSize] = useState({ width: 480, height: 400 });
  // Z-index for floating window - starts at 150 to be above SessionWindowsGrid windows (which start at 100)
  const [floatingZIndex, setFloatingZIndex] = useState(150);
  const [isDraggingSession, setIsDraggingSession] = useState<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);
  const [isResizingSession, setIsResizingSession] = useState<{
    direction: "horizontal" | "vertical" | "both";
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  // Load session from feature.session_id when feature ID changes (not on every object update)
  const currentFeatureId = selectedFeature?.id;
  const currentSessionId = selectedFeature?.session_id;

  useEffect(() => {
    if (!currentFeatureId) {
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
    if (currentSessionId) {
      setFeatureSessionId(currentSessionId);
      setFeatureSessionName(currentFeatureId);
      setIsSessionMinimized(false); // Show session window when loading stored session
    } else {
      // No session associated - clear state
      setFeatureSessionId(null);
      setFeatureSessionDetail(null);
      setFeatureSessionName("");
    }
  }, [currentFeatureId, currentSessionId]);

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
   * Toggle floating mode for session window
   */
  const handleToggleFloating = useCallback(() => {
    setIsSessionFloating((prev) => {
      // When enabling floating mode, position in lower-left corner
      if (!prev) {
        setFloatingPosition({
          x: 20,
          y: window.innerHeight - floatingSize.height - 20,
        });
      }
      return !prev;
    });
  }, [floatingSize.height]);

  /**
   * Bring floating window to front when clicked
   */
  const bringFloatingToFront = useCallback(() => {
    // Increment z-index to ensure window is on top of all others
    setFloatingZIndex((prev) => prev + 1);
  }, []);

  /**
   * Handle floating window drag start
   */
  const handleFloatingDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingSession({
        startX: e.clientX,
        startY: e.clientY,
        startPosX: floatingPosition.x,
        startPosY: floatingPosition.y,
      });
    },
    [floatingPosition]
  );

  /**
   * Handle floating window resize start
   */
  const handleFloatingResizeStart = useCallback(
    (e: React.MouseEvent, direction: "horizontal" | "vertical" | "both") => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizingSession({
        direction,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: floatingSize.width,
        startHeight: floatingSize.height,
      });
    },
    [floatingSize]
  );

  // Handle drag move and end for floating window
  useEffect(() => {
    if (!isDraggingSession) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - isDraggingSession.startX;
      const deltaY = e.clientY - isDraggingSession.startY;
      setFloatingPosition({
        x: isDraggingSession.startPosX + deltaX,
        y: isDraggingSession.startPosY + deltaY,
      });
    };

    const handleMouseUp = () => {
      setIsDraggingSession(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDraggingSession]);

  // Handle resize move and end for floating window
  useEffect(() => {
    if (!isResizingSession) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - isResizingSession.startX;
      const deltaY = e.clientY - isResizingSession.startY;

      setFloatingSize((prev) => {
        const newSize = { ...prev };
        if (isResizingSession.direction === "horizontal" || isResizingSession.direction === "both") {
          newSize.width = Math.max(320, Math.min(1000, isResizingSession.startWidth + deltaX));
        }
        if (isResizingSession.direction === "vertical" || isResizingSession.direction === "both") {
          newSize.height = Math.max(300, Math.min(800, isResizingSession.startHeight + deltaY));
        }
        return newSize;
      });
    };

    const handleMouseUp = () => {
      setIsResizingSession(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor =
      isResizingSession.direction === "horizontal"
        ? "ew-resize"
        : isResizingSession.direction === "vertical"
          ? "ns-resize"
          : "nwse-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingSession]);

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
  // Note: Task polling is handled by centralized KanbanDataContext
  // No need for separate polling here

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
          {featureSessionId && projectPath && !isMaximized && !isSessionFloating && (
            <div className="px-4 pb-4">
              {isSessionMinimized ? (
                /* Minimized session bar - click to expand */
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExpandSession}
                    className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
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
                  {/* Float button */}
                  <button
                    onClick={handleToggleFloating}
                    className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Float window"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </button>
                </div>
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
                  {/* Float button overlay */}
                  <button
                    onClick={handleToggleFloating}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    title="Float window"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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

          {/* Floating session window */}
          {featureSessionId && projectPath && !isMaximized && isSessionFloating && (
            <div
              className={`fixed rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-2xl group ${
                isDraggingSession ? "shadow-2xl" : ""
              } ${!isDraggingSession && !isResizingSession ? "transition-shadow duration-200" : ""}`}
              style={{
                left: floatingPosition.x,
                top: floatingPosition.y,
                width: floatingSize.width,
                height: floatingSize.height,
                zIndex: floatingZIndex,
              }}
              onMouseDown={bringFloatingToFront}
            >
              {/* Drag handle - window title bar (excluding buttons area on right) */}
              <div
                className={`absolute top-0 left-0 right-24 h-8 cursor-grab active:cursor-grabbing z-10 ${
                  isDraggingSession ? "cursor-grabbing" : ""
                }`}
                onMouseDown={handleFloatingDragStart}
              />

              {/* Dock button - return to embedded mode */}
              <button
                onClick={handleToggleFloating}
                className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                title="Dock window"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>

              {/* Window content */}
              {featureSessionDetail ? (
                <MiniSessionWindow
                  session={featureSessionDetail}
                  sessionName={featureSessionName}
                  onRename={handleSessionNameChange}
                  onMaximize={handleMaximize}
                  onRefresh={refreshTasks}
                  onDelete={handleClearSession}
                  onMinimize={() => {
                    setIsSessionFloating(false);
                    setIsSessionMinimized(true);
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-[var(--text-muted)]">
                      Connecting to session...
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Session: {featureSessionId}
                  </p>
                </div>
              )}

              {/* Resize handles */}
              {/* Right edge resize handle */}
              <div
                onMouseDown={(e) => handleFloatingResizeStart(e, "horizontal")}
                className="absolute top-0 right-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-primary)]/20 transition-opacity z-20"
                title="Drag to resize width"
              />

              {/* Bottom edge resize handle */}
              <div
                onMouseDown={(e) => handleFloatingResizeStart(e, "vertical")}
                className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-primary)]/20 transition-opacity z-20"
                title="Drag to resize height"
              />

              {/* Corner resize handle */}
              <div
                onMouseDown={(e) => handleFloatingResizeStart(e, "both")}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-100 z-30 flex items-center justify-center"
                title="Drag to resize"
              >
                <svg className="w-3 h-3 text-[var(--text-tertiary)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22ZM22 10H20V8H22V10ZM18 14H16V12H18V14ZM14 18H12V16H14V18ZM10 22H8V20H10V22Z" />
                </svg>
              </div>

              {/* Size indicator - only visible while actively resizing */}
              {isResizingSession && (
                <div className="absolute bottom-3 left-3 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] z-10 pointer-events-none">
                  {floatingSize.width}×{floatingSize.height}
                </div>
              )}

              {/* Move indicator - shows position when dragging */}
              {isDraggingSession && (
                <div className="absolute top-10 left-3 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] z-10 pointer-events-none">
                  {Math.round(floatingPosition.x)}, {Math.round(floatingPosition.y)}
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
          <div className="fixed inset-0 z-50 glass-heavy backdrop-blur-xl">
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
