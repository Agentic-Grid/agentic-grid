import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { clsx } from "clsx";
import type { Session, SessionDetail } from "../../types";
import { MiniSessionWindow } from "./MiniSessionWindow";
import { ChatView } from "../Chat/ChatView";
import {
  getSessionDetail,
  getSessionOrder,
  setSessionOrderBatch,
  createNewSession,
} from "../../services/api";

// Window position for animation
interface WindowRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SessionWindowsGridProps {
  sessions: Session[];
  sessionNames: Record<string, string>;
  onSessionNameChange: (sessionId: string, name: string) => void;
  onRefresh: () => void;
}

// Default mini window dimensions
const DEFAULT_WINDOW_WIDTH = 480;
const MIN_WINDOW_WIDTH = 320;
const MAX_WINDOW_WIDTH = 1000;
const DEFAULT_WINDOW_HEIGHT = 400;
const MIN_WINDOW_HEIGHT = 300;
const MAX_WINDOW_HEIGHT = 800;

// Convert project path to folder format used in API
function getProjectFolder(projectPath: string): string {
  return projectPath.replace(/\//g, "-");
}

// Group sessions by project
function groupSessionsByProject(
  sessions: Session[],
): Map<string, { sessions: Session[]; projectName: string }> {
  const groups = new Map<
    string,
    { sessions: Session[]; projectName: string }
  >();

  for (const session of sessions) {
    const key = session.projectPath;
    if (!groups.has(key)) {
      groups.set(key, {
        sessions: [],
        projectName: session.projectName,
      });
    }
    groups.get(key)!.sessions.push(session);
  }

  return groups;
}

// Folder icon component
function IconFolder({ className }: { className?: string }) {
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
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

export function SessionWindowsGrid({
  sessions,
  sessionNames,
  onSessionNameChange,
  onRefresh,
}: SessionWindowsGridProps) {
  // Session details cache - maps session.id to SessionDetail
  const [sessionDetails, setSessionDetails] = useState<
    Record<string, SessionDetail>
  >({});
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  // Maximized session state with animation tracking
  const [maximizedSession, setMaximizedSession] = useState<{
    session: SessionDetail;
    sessionId: string;
    originRect: WindowRect | null;
  } | null>(null);

  // Animation state: "expanding" | "expanded" | "collapsing" | null
  const [animationState, setAnimationState] = useState<string | null>(null);

  // Refs to track mini window positions for animation
  const miniWindowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Collapsed projects state
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(
    new Set(),
  );

  // New session modal state
  const [newSessionModal, setNewSessionModal] = useState<{
    projectPath: string;
    projectName: string;
  } | null>(null);
  const [newSessionMessage, setNewSessionMessage] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Session order state (for drag-and-drop reordering)
  const [sessionOrder, setSessionOrderState] = useState<Record<string, number>>(
    {},
  );

  // Individual window sizes state (for independent resizing)
  const [windowSizes, setWindowSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});

  // Resizing state - tracks which session is being resized
  const [resizingSession, setResizingSession] = useState<{
    sessionId: string;
    direction: "horizontal" | "vertical" | "both";
  } | null>(null);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef({ width: 0, height: 0 });

  // Drag-and-drop state
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [dragOverSessionId, setDragOverSessionId] = useState<string | null>(
    null,
  );

  // Load session order on mount
  useEffect(() => {
    const loadOrder = async () => {
      try {
        const response = await getSessionOrder();
        setSessionOrderState(response.data || {});
      } catch (err) {
        console.error("Failed to load session order:", err);
      }
    };
    loadOrder();
  }, []);

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.DragEvent, sessionId: string) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", sessionId);
      setDraggedSessionId(sessionId);
    },
    [],
  );

  // Handle drag over
  const handleDragOver = useCallback(
    (e: React.DragEvent, sessionId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (sessionId !== draggedSessionId) {
        setDragOverSessionId(sessionId);
      }
    },
    [draggedSessionId],
  );

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverSessionId(null);
  }, []);

  // Handle drop - reorder sessions
  const handleDrop = useCallback(
    async (
      e: React.DragEvent,
      targetSessionId: string,
      projectPath: string,
    ) => {
      e.preventDefault();
      const sourceSessionId = e.dataTransfer.getData("text/plain");

      if (sourceSessionId === targetSessionId) {
        setDraggedSessionId(null);
        setDragOverSessionId(null);
        return;
      }

      // Get sessions for this project
      const projectSessions = sessions.filter(
        (s) => s.projectPath === projectPath,
      );

      // Sort by current order
      const sortedSessions = [...projectSessions].sort((a, b) => {
        const orderA = sessionOrder[a.id] ?? Infinity;
        const orderB = sessionOrder[b.id] ?? Infinity;
        return orderA - orderB;
      });

      // Find indices
      const sourceIndex = sortedSessions.findIndex(
        (s) => s.id === sourceSessionId,
      );
      const targetIndex = sortedSessions.findIndex(
        (s) => s.id === targetSessionId,
      );

      if (sourceIndex === -1 || targetIndex === -1) {
        setDraggedSessionId(null);
        setDragOverSessionId(null);
        return;
      }

      // Reorder
      const [removed] = sortedSessions.splice(sourceIndex, 1);
      sortedSessions.splice(targetIndex, 0, removed);

      // Create new order map
      const newOrder: Record<string, number> = { ...sessionOrder };
      sortedSessions.forEach((session, index) => {
        newOrder[session.id] = index;
      });

      // Update state optimistically
      setSessionOrderState(newOrder);
      setDraggedSessionId(null);
      setDragOverSessionId(null);

      // Persist to backend
      try {
        await setSessionOrderBatch(newOrder);
      } catch (err) {
        console.error("Failed to save session order:", err);
      }
    },
    [sessions, sessionOrder],
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedSessionId(null);
    setDragOverSessionId(null);
  }, []);

  // Get window size for a session (with defaults)
  const getWindowSize = useCallback(
    (sessionId: string) => {
      return (
        windowSizes[sessionId] || {
          width: DEFAULT_WINDOW_WIDTH,
          height: DEFAULT_WINDOW_HEIGHT,
        }
      );
    },
    [windowSizes],
  );

  // Handle resize start for a specific session
  const handleResizeStart = useCallback(
    (
      e: React.MouseEvent,
      sessionId: string,
      direction: "horizontal" | "vertical" | "both",
    ) => {
      e.preventDefault();
      e.stopPropagation();
      const currentSize = getWindowSize(sessionId);
      setResizingSession({ sessionId, direction });
      resizeStartPos.current = { x: e.clientX, y: e.clientY };
      resizeStartSize.current = {
        width: currentSize.width,
        height: currentSize.height,
      };
    },
    [getWindowSize],
  );

  // Handle resize move
  useEffect(() => {
    if (!resizingSession) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartPos.current.x;
      const deltaY = e.clientY - resizeStartPos.current.y;

      setWindowSizes((prev) => {
        const currentSize = prev[resizingSession.sessionId] || {
          width: DEFAULT_WINDOW_WIDTH,
          height: DEFAULT_WINDOW_HEIGHT,
        };
        const newSize = { ...currentSize };

        if (
          resizingSession.direction === "horizontal" ||
          resizingSession.direction === "both"
        ) {
          newSize.width = Math.min(
            MAX_WINDOW_WIDTH,
            Math.max(MIN_WINDOW_WIDTH, resizeStartSize.current.width + deltaX),
          );
        }

        if (
          resizingSession.direction === "vertical" ||
          resizingSession.direction === "both"
        ) {
          newSize.height = Math.min(
            MAX_WINDOW_HEIGHT,
            Math.max(
              MIN_WINDOW_HEIGHT,
              resizeStartSize.current.height + deltaY,
            ),
          );
        }

        return {
          ...prev,
          [resizingSession.sessionId]: newSize,
        };
      });
    };

    const handleMouseUp = () => {
      setResizingSession(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Add cursor style to body while resizing
    document.body.style.cursor =
      resizingSession.direction === "horizontal"
        ? "ew-resize"
        : resizingSession.direction === "vertical"
          ? "ns-resize"
          : "nwse-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizingSession]);

  const projectGroups = useMemo(
    () => groupSessionsByProject(sessions),
    [sessions],
  );

  const sortedProjects = useMemo(() => {
    const entries = Array.from(projectGroups.entries());
    return entries.sort((a, b) => {
      const aLatest = Math.max(
        ...a[1].sessions.map((s) => new Date(s.lastActivityAt).getTime()),
      );
      const bLatest = Math.max(
        ...b[1].sessions.map((s) => new Date(s.lastActivityAt).getTime()),
      );
      return bLatest - aLatest;
    });
  }, [projectGroups]);

  // Load session details for visible sessions
  const loadSessionDetail = useCallback(
    async (session: Session) => {
      if (sessionDetails[session.id] || loadingDetails.has(session.id)) {
        return;
      }

      setLoadingDetails((prev) => new Set(prev).add(session.id));

      try {
        const projectFolder = getProjectFolder(session.projectPath);
        const response = await getSessionDetail(projectFolder, session.id);
        setSessionDetails((prev) => ({
          ...prev,
          [session.id]: response.data,
        }));
      } catch (err) {
        console.error("Failed to load session detail:", err);
      } finally {
        setLoadingDetails((prev) => {
          const next = new Set(prev);
          next.delete(session.id);
          return next;
        });
      }
    },
    [sessionDetails, loadingDetails],
  );

  // Load all session details on mount and when sessions change
  useEffect(() => {
    for (const session of sessions) {
      loadSessionDetail(session);
    }
  }, [sessions]);

  const toggleProject = (projectPath: string) => {
    setCollapsedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectPath)) {
        next.delete(projectPath);
      } else {
        next.add(projectPath);
      }
      return next;
    });
  };

  // Handle creating a new session
  const handleCreateSession = async () => {
    if (!newSessionModal || !newSessionMessage.trim()) return;

    setIsCreatingSession(true);
    try {
      const response = await createNewSession(
        newSessionModal.projectPath,
        newSessionMessage.trim(),
      );

      // Set new session to order -1 so it appears first
      if (response.data.sessionId) {
        const newOrder = { ...sessionOrder };
        // Shift all existing sessions up by 1
        Object.keys(newOrder).forEach((id) => {
          newOrder[id] = (newOrder[id] || 0) + 1;
        });
        // New session at position 0
        newOrder[response.data.sessionId] = 0;
        setSessionOrderState(newOrder);
        await setSessionOrderBatch(newOrder);
      }

      // Close modal and refresh
      setNewSessionModal(null);
      setNewSessionMessage("");
      onRefresh();
    } catch (err) {
      console.error("Failed to create session:", err);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleMaximize = (sessionId: string) => {
    const detail = sessionDetails[sessionId];
    if (detail) {
      // Get the position of the mini window for animation
      const miniWindowEl = miniWindowRefs.current.get(sessionId);
      let originRect: WindowRect | null = null;

      if (miniWindowEl) {
        const rect = miniWindowEl.getBoundingClientRect();
        originRect = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };
      }

      // Set initial state at mini window position
      setMaximizedSession({ session: detail, sessionId, originRect });
      setAnimationState("starting");

      // Use requestAnimationFrame to ensure the initial position is painted first
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationState("expanding");

          // After animation completes, set to expanded
          setTimeout(() => {
            setAnimationState("expanded");
          }, 300);
        });
      });
    }
  };

  const handleMinimize = () => {
    // Start collapse animation
    setAnimationState("collapsing");

    // After animation, clear the maximized state
    setTimeout(() => {
      setMaximizedSession(null);
      setAnimationState(null);
    }, 300);
  };

  // Register mini window ref
  const registerMiniWindowRef = useCallback(
    (sessionId: string, el: HTMLDivElement | null) => {
      if (el) {
        miniWindowRefs.current.set(sessionId, el);
      } else {
        miniWindowRefs.current.delete(sessionId);
      }
    },
    [],
  );

  const handleMaximizedRename = useCallback(
    async (name: string) => {
      if (!maximizedSession) return;
      onSessionNameChange(maximizedSession.sessionId, name);
    },
    [maximizedSession, onSessionNameChange],
  );

  const handleMaximizedKill = useCallback(async () => {
    // The ChatView handles kill internally, just refresh data after
    onRefresh();
  }, [onRefresh]);

  // Get animation styles based on state
  const getAnimationStyles = (): React.CSSProperties => {
    const origin = maximizedSession?.originRect;

    // Starting state - positioned at mini window location (no transition)
    if (animationState === "starting" && origin) {
      return {
        position: "fixed",
        top: origin.top,
        left: origin.left,
        width: origin.width,
        height: origin.height,
        zIndex: 50,
      };
    }

    // Expanding or expanded - full screen with transition
    if (animationState === "expanding" || animationState === "expanded") {
      return {
        position: "fixed",
        top: 16,
        left: 16,
        width: "calc(100% - 32px)",
        height: "calc(100% - 32px)",
        zIndex: 50,
        transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
      };
    }

    // Collapsing - animate back to mini window position
    if (animationState === "collapsing" && origin) {
      return {
        position: "fixed",
        top: origin.top,
        left: origin.left,
        width: origin.width,
        height: origin.height,
        zIndex: 50,
        transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
      };
    }

    // Default - full screen (fallback)
    return {
      position: "fixed",
      top: 16,
      left: 16,
      width: "calc(100% - 32px)",
      height: "calc(100% - 32px)",
      zIndex: 50,
    };
  };

  // Status badge classes for the maximized window header - uses CSS animations
  const statusBadgeClasses: Record<string, string> = {
    working: "badge badge-working", // Yellow with pulse animation
    waiting: "badge badge-waiting", // Green - available
    "needs-approval": "badge badge-needs-approval", // Rose - needs attention
    idle: "badge badge-idle", // Grey - available
  };

  // Status label text
  const statusLabels: Record<string, string> = {
    working: "Working",
    waiting: "Ready",
    "needs-approval": "Needs Approval",
    idle: "Idle",
  };

  // Render maximized window with animation
  if (maximizedSession) {
    const displayName =
      sessionNames[maximizedSession.sessionId] ||
      maximizedSession.session.firstPrompt?.slice(0, 50) ||
      `Session ${maximizedSession.sessionId.slice(0, 8)}`;

    const isAnimatingOut = animationState === "collapsing";
    const isAnimatingIn = animationState === "starting";

    return (
      <>
        {/* Backdrop */}
        <div
          className={clsx(
            "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm",
            isAnimatingOut || isAnimatingIn ? "opacity-0" : "opacity-100",
          )}
          style={{ transition: "opacity 300ms ease-out" }}
          onClick={handleMinimize}
        />

        {/* Animated Window Container */}
        <div
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] overflow-hidden flex flex-col shadow-2xl"
          style={getAnimationStyles()}
        >
          {/* Window Header - matches mini window style */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] shrink-0">
            {/* Status badge */}
            <span
              className={
                statusBadgeClasses[maximizedSession.session.status] ||
                statusBadgeClasses.idle
              }
            >
              {statusLabels[maximizedSession.session.status] ||
                statusLabels.idle}
            </span>

            {/* Title and info */}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-sm truncate">{displayName}</h2>
              <div className="text-xs text-[var(--text-tertiary)] truncate">
                {maximizedSession.session.projectName}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleMinimize}
              className="p-1.5 rounded-lg hover:bg-[var(--accent-rose)]/20 text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] transition-colors shrink-0"
              title="Minimize"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* ChatView content */}
          <div className="flex-1 overflow-hidden">
            <ChatView
              session={maximizedSession.session}
              onBack={handleMinimize}
              sessionName={sessionNames[maximizedSession.sessionId]}
              onRename={handleMaximizedRename}
              onKill={handleMaximizedKill}
              hideHeader
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-8">
      {sortedProjects.map(
        ([projectPath, { sessions: projectSessions, projectName }]) => {
          const isCollapsed = collapsedProjects.has(projectPath);
          const activeCount = projectSessions.filter(
            (s) => s.status === "working" || s.status === "needs-approval",
          ).length;

          return (
            <div key={projectPath} className="space-y-4">
              {/* Project header */}
              <div className="flex items-center gap-3 w-full group">
                <button
                  onClick={() => toggleProject(projectPath)}
                  className="flex items-center gap-2 text-left"
                >
                  <IconFolder className="w-5 h-5 text-[var(--accent-amber)]" />
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {projectName}
                  </h3>
                </button>

                {/* New Session button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setNewSessionModal({ projectPath, projectName });
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors"
                  title="Create new session"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  New
                </button>

                <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                  <span>
                    {projectSessions.length} session
                    {projectSessions.length !== 1 ? "s" : ""}
                  </span>
                  {activeCount > 0 && (
                    <span className="text-[var(--accent-emerald)]">
                      ({activeCount} active)
                    </span>
                  )}
                </div>

                <button
                  onClick={() => toggleProject(projectPath)}
                  className="ml-auto p-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <svg
                    className={clsx(
                      "w-4 h-4 text-[var(--text-tertiary)] transition-transform",
                      isCollapsed && "-rotate-90",
                    )}
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
              </div>

              {/* Sessions horizontal scroll container */}
              {!isCollapsed && (
                <div className="relative">
                  {/* Horizontally scrollable sessions list */}
                  <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[var(--border-subtle)] scrollbar-track-transparent">
                    <div
                      className="flex gap-4 items-start"
                      style={{ minWidth: "max-content" }}
                    >
                      {projectSessions
                        .sort((a, b) => {
                          // Sort by custom order first, then by last activity
                          const orderA = sessionOrder[a.id] ?? Infinity;
                          const orderB = sessionOrder[b.id] ?? Infinity;
                          if (orderA !== orderB) return orderA - orderB;
                          return (
                            new Date(b.lastActivityAt).getTime() -
                            new Date(a.lastActivityAt).getTime()
                          );
                        })
                        .map((session) => {
                          const detail = sessionDetails[session.id];
                          const isLoading = loadingDetails.has(session.id);
                          const isDragging = draggedSessionId === session.id;
                          const isDragOver = dragOverSessionId === session.id;
                          const windowSize = getWindowSize(session.id);
                          const isCurrentlyResizing =
                            resizingSession?.sessionId === session.id;

                          if (!detail) {
                            return (
                              <div
                                key={session.id}
                                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex items-center justify-center shrink-0"
                                style={{
                                  width: windowSize.width,
                                  height: windowSize.height,
                                }}
                              >
                                {isLoading ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <div
                                      className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                                      style={{
                                        borderColor: "var(--accent-primary)",
                                        borderTopColor: "transparent",
                                      }}
                                    />
                                    <span className="text-xs text-[var(--text-tertiary)]">
                                      Loading...
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-[var(--text-tertiary)]">
                                    Failed to load
                                  </span>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div
                              key={session.id}
                              ref={(el) =>
                                registerMiniWindowRef(session.id, el)
                              }
                              draggable={!isCurrentlyResizing}
                              onDragStart={(e) =>
                                handleDragStart(e, session.id)
                              }
                              onDragOver={(e) => handleDragOver(e, session.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) =>
                                handleDrop(e, session.id, projectPath)
                              }
                              onDragEnd={handleDragEnd}
                              className={clsx(
                                "shrink-0 relative group",
                                !isCurrentlyResizing &&
                                  !isDragging &&
                                  "transition-all duration-200",
                                // Dragging state - ghost effect
                                isDragging &&
                                  "opacity-40 scale-[0.98] rotate-1 shadow-2xl z-50",
                                // Drop target state - prominent highlight
                                isDragOver && [
                                  "ring-2 ring-[var(--accent-cyan)] ring-offset-4 ring-offset-[var(--bg-primary)]",
                                  "scale-[1.02]",
                                  "shadow-[0_0_30px_rgba(34,211,238,0.3)]",
                                ],
                                // When any drag is happening but this isn't the target or source
                                draggedSessionId &&
                                  !isDragging &&
                                  !isDragOver &&
                                  "opacity-70",
                              )}
                              style={{
                                width: windowSize.width,
                                height: windowSize.height,
                                // Smooth transition for drop target
                                transition: isDragOver
                                  ? "all 150ms ease-out"
                                  : isDragging
                                    ? "none"
                                    : undefined,
                              }}
                            >
                              <MiniSessionWindow
                                session={detail}
                                sessionName={sessionNames[session.id]}
                                onRename={(name) =>
                                  onSessionNameChange(session.id, name)
                                }
                                onMaximize={() => handleMaximize(session.id)}
                                onRefresh={onRefresh}
                                onDelete={onRefresh}
                              />

                              {/* Drag handle indicator - shows on hover */}
                              <div
                                className={clsx(
                                  "absolute top-2 left-2 p-1 rounded bg-[var(--bg-elevated)]/80 backdrop-blur-sm border border-[var(--border-subtle)] cursor-grab active:cursor-grabbing transition-opacity z-10",
                                  isDragging
                                    ? "opacity-0"
                                    : "opacity-0 group-hover:opacity-100",
                                )}
                                title="Drag to reorder"
                              >
                                <svg
                                  className="w-3.5 h-3.5 text-[var(--text-tertiary)]"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
                                </svg>
                              </div>

                              {/* Drop zone indicator - animated border when hovering */}
                              {isDragOver && (
                                <div className="absolute inset-0 rounded-xl border-2 border-dashed border-[var(--accent-cyan)] pointer-events-none z-30 animate-pulse">
                                  <div className="absolute inset-0 bg-[var(--accent-cyan)]/5 rounded-xl" />
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full bg-[var(--accent-cyan)] text-[var(--bg-primary)] text-xs font-medium shadow-lg">
                                    Drop here
                                  </div>
                                </div>
                              )}

                              {/* Right edge resize handle */}
                              <div
                                onMouseDown={(e) =>
                                  handleResizeStart(e, session.id, "horizontal")
                                }
                                className="absolute top-0 right-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-primary)]/20 transition-opacity z-10"
                                title="Drag to resize width"
                              />

                              {/* Bottom edge resize handle */}
                              <div
                                onMouseDown={(e) =>
                                  handleResizeStart(e, session.id, "vertical")
                                }
                                className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-primary)]/20 transition-opacity z-10"
                                title="Drag to resize height"
                              />

                              {/* Corner resize handle */}
                              <div
                                onMouseDown={(e) =>
                                  handleResizeStart(e, session.id, "both")
                                }
                                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-100 z-20 flex items-center justify-center"
                                title="Drag to resize"
                              >
                                <svg
                                  className="w-3 h-3 text-[var(--text-tertiary)]"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22ZM22 10H20V8H22V10ZM18 14H16V12H18V14ZM14 18H12V16H14V18ZM10 22H8V20H10V22Z" />
                                </svg>
                              </div>

                              {/* Size indicator - only visible while actively resizing */}
                              {isCurrentlyResizing && (
                                <div className="absolute bottom-3 left-3 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] z-10 pointer-events-none">
                                  {windowSize.width}×{windowSize.height}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        },
      )}

      {sessions.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
            No sessions yet
          </h3>
          <p className="text-sm text-[var(--text-tertiary)]">
            Create a new session from the sidebar to get started
          </p>
        </div>
      )}

      {/* New Session Modal */}
      {newSessionModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setNewSessionModal(null);
              setNewSessionMessage("");
            }}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-lg rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    New Session
                  </h2>
                  <p className="text-sm text-[var(--text-tertiary)]">
                    {newSessionModal.projectName}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNewSessionModal(null);
                    setNewSessionMessage("");
                  }}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-5">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Initial message
                </label>
                <textarea
                  value={newSessionMessage}
                  onChange={(e) => setNewSessionMessage(e.target.value)}
                  placeholder="What would you like Claude to help with?"
                  className="w-full h-32 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 resize-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      e.metaKey &&
                      newSessionMessage.trim()
                    ) {
                      handleCreateSession();
                    }
                  }}
                />
                <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                  Press Cmd+Enter to create
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => {
                    setNewSessionModal(null);
                    setNewSessionMessage("");
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!newSessionMessage.trim() || isCreatingSession}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isCreatingSession && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Create Session
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
