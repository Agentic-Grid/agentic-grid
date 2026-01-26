import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { clsx } from "clsx";
import type { Session, SessionDetail } from "../../types";
import { MiniSessionWindow } from "./MiniSessionWindow";
import { ChatView } from "../Chat/ChatView";
import { ProjectKanbanWidget } from "./ProjectKanbanWidget";
import {
  getSessionDetail,
  getSessionOrder,
  setSessionOrderBatch,
  getProjectOrder,
  setProjectOrderBatch,
  createNewSession,
} from "../../services/api";
import { deleteProject } from "../../services/kanban";

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
  /** Callback to navigate to full Kanban board view */
  onNavigateToKanban?: () => void;
  /** If true, projects cannot be collapsed */
  disableCollapse?: boolean;
  /** If true, hides the Kanban widget within projects */
  hideKanban?: boolean;
  /** If true, windows float and can be dragged anywhere on screen */
  floatable?: boolean;
  /** Controlled hidden sessions state (for floating mode) */
  hiddenSessionIds?: Set<string>;
  /** Callback when hidden sessions change (for floating mode) */
  onHiddenSessionsChange?: (hiddenIds: Set<string>) => void;
}

// Floating window position
interface FloatingPosition {
  x: number;
  y: number;
  zIndex: number;
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
  onNavigateToKanban,
  disableCollapse = false,
  hideKanban = false,
  floatable = false,
  hiddenSessionIds,
  onHiddenSessionsChange,
}: SessionWindowsGridProps) {
  // Session details cache - maps session.id to SessionDetail
  const [sessionDetails, setSessionDetails] = useState<
    Record<string, SessionDetail>
  >({});
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  // Floating window positions - maps session.id to position
  const [floatingPositions, setFloatingPositions] = useState<
    Record<string, FloatingPosition>
  >({});
  const [highestZIndex, setHighestZIndex] = useState(100);

  // Dragging state for floating windows
  const [draggingWindow, setDraggingWindow] = useState<{
    sessionId: string;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  // Hidden/minimized sessions (only for floating mode)
  // Supports both controlled (via props) and uncontrolled (internal state) modes
  const [internalHiddenSessions, setInternalHiddenSessions] = useState<Set<string>>(new Set());

  // Use controlled state if provided, otherwise use internal state
  const hiddenSessions = hiddenSessionIds ?? internalHiddenSessions;
  const setHiddenSessions = onHiddenSessionsChange ?? setInternalHiddenSessions;

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

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    projectPath: string;
    projectName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Project drag-and-drop state
  const [draggedProjectPath, setDraggedProjectPath] = useState<string | null>(null);
  const [dragOverProjectPath, setDragOverProjectPath] = useState<string | null>(null);

  // Project order state (for stable ordering - not by activity)
  const [projectOrder, setProjectOrder] = useState<Record<string, number>>({});

  // Group sessions by project - defined early so it can be used by callbacks
  const projectGroups = useMemo(
    () => groupSessionsByProject(sessions),
    [sessions],
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

  // Load project order on mount
  useEffect(() => {
    const loadOrder = async () => {
      try {
        const response = await getProjectOrder();
        setProjectOrder(response.data || {});
      } catch (err) {
        console.error("Failed to load project order:", err);
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

  // Initialize floating positions for new sessions
  useEffect(() => {
    if (!floatable) return;

    setFloatingPositions((prev) => {
      const next = { ...prev };
      let newIndex = 0;
      for (const session of sessions) {
        if (!next[session.id]) {
          // Position new windows in a cascade pattern
          const offset = (newIndex % 5) * 40;
          next[session.id] = {
            x: 100 + offset,
            y: 100 + offset,
            zIndex: highestZIndex + newIndex,
          };
          newIndex++;
        }
      }
      if (newIndex > 0) {
        setHighestZIndex((prev) => prev + newIndex);
      }
      return next;
    });
  }, [floatable, sessions, highestZIndex]);

  // Handle floating window drag start
  const handleFloatingDragStart = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const pos = floatingPositions[sessionId] || { x: 100, y: 100, zIndex: 100 };

      // Bring window to front
      const newZIndex = highestZIndex + 1;
      setHighestZIndex(newZIndex);
      setFloatingPositions((prev) => ({
        ...prev,
        [sessionId]: { ...pos, zIndex: newZIndex },
      }));

      setDraggingWindow({
        sessionId,
        startX: e.clientX,
        startY: e.clientY,
        startPosX: pos.x,
        startPosY: pos.y,
      });
    },
    [floatingPositions, highestZIndex],
  );

  // Handle floating window drag move and end
  useEffect(() => {
    if (!draggingWindow) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - draggingWindow.startX;
      const deltaY = e.clientY - draggingWindow.startY;

      setFloatingPositions((prev) => ({
        ...prev,
        [draggingWindow.sessionId]: {
          ...prev[draggingWindow.sessionId],
          x: draggingWindow.startPosX + deltaX,
          y: draggingWindow.startPosY + deltaY,
        },
      }));
    };

    const handleMouseUp = () => {
      setDraggingWindow(null);
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
  }, [draggingWindow]);

  // Bring floating window to front on click
  const bringToFront = useCallback(
    (sessionId: string) => {
      if (!floatable) return;

      const pos = floatingPositions[sessionId];
      if (!pos || pos.zIndex === highestZIndex) return;

      const newZIndex = highestZIndex + 1;
      setHighestZIndex(newZIndex);
      setFloatingPositions((prev) => ({
        ...prev,
        [sessionId]: { ...prev[sessionId], zIndex: newZIndex },
      }));
    },
    [floatable, floatingPositions, highestZIndex],
  );

  // Minimize floating window (hide it)
  const handleFloatingMinimize = useCallback((sessionId: string) => {
    const next = new Set(hiddenSessions);
    next.add(sessionId);
    setHiddenSessions(next);
  }, [hiddenSessions, setHiddenSessions]);

  // Restore minimized floating window
  const handleFloatingRestore = useCallback(
    (sessionId: string) => {
      const next = new Set(hiddenSessions);
      next.delete(sessionId);
      setHiddenSessions(next);
      // Bring restored window to front
      const newZIndex = highestZIndex + 1;
      setHighestZIndex(newZIndex);
      setFloatingPositions((prev) => ({
        ...prev,
        [sessionId]: { ...prev[sessionId], zIndex: newZIndex },
      }));
    },
    [hiddenSessions, setHiddenSessions, highestZIndex],
  );

  const sortedProjects = useMemo(() => {
    const entries = Array.from(projectGroups.entries());
    return entries.sort((a, b) => {
      // Sort by custom order first, then alphabetically by project name (stable)
      const orderA = projectOrder[a[0]] ?? Infinity;
      const orderB = projectOrder[b[0]] ?? Infinity;
      if (orderA !== Infinity || orderB !== Infinity) {
        if (orderA !== orderB) return orderA - orderB;
      }
      // Fallback: alphabetical by project name (stable, not by activity)
      return a[1].projectName.localeCompare(b[1].projectName);
    });
  }, [projectGroups, projectOrder]);

  // Project drag handlers
  const handleProjectDragStart = useCallback(
    (e: React.DragEvent, projectPath: string) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `project:${projectPath}`);
      setDraggedProjectPath(projectPath);
    },
    [],
  );

  const handleProjectDragOver = useCallback(
    (e: React.DragEvent, projectPath: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (projectPath !== draggedProjectPath) {
        setDragOverProjectPath(projectPath);
      }
    },
    [draggedProjectPath],
  );

  const handleProjectDragLeave = useCallback(() => {
    setDragOverProjectPath(null);
  }, []);

  const handleProjectDrop = useCallback(
    async (e: React.DragEvent, targetProjectPath: string) => {
      e.preventDefault();
      const sourceProjectPath = draggedProjectPath;

      if (!sourceProjectPath || sourceProjectPath === targetProjectPath) {
        setDraggedProjectPath(null);
        setDragOverProjectPath(null);
        return;
      }

      // Get sorted projects
      const currentProjects = Array.from(projectGroups.keys());
      const sortedProjectPaths = [...currentProjects].sort((a, b) => {
        const orderA = projectOrder[a] ?? Infinity;
        const orderB = projectOrder[b] ?? Infinity;
        if (orderA !== Infinity || orderB !== Infinity) {
          if (orderA !== orderB) return orderA - orderB;
        }
        const nameA = projectGroups.get(a)?.projectName || a;
        const nameB = projectGroups.get(b)?.projectName || b;
        return nameA.localeCompare(nameB);
      });

      const sourceIndex = sortedProjectPaths.indexOf(sourceProjectPath);
      const targetIndex = sortedProjectPaths.indexOf(targetProjectPath);

      if (sourceIndex === -1 || targetIndex === -1) {
        setDraggedProjectPath(null);
        setDragOverProjectPath(null);
        return;
      }

      // Reorder
      const [removed] = sortedProjectPaths.splice(sourceIndex, 1);
      sortedProjectPaths.splice(targetIndex, 0, removed);

      // Create new order map
      const newOrder: Record<string, number> = {};
      sortedProjectPaths.forEach((path, index) => {
        newOrder[path] = index;
      });

      // Update state optimistically
      setProjectOrder(newOrder);
      setDraggedProjectPath(null);
      setDragOverProjectPath(null);

      // Persist to backend
      try {
        await setProjectOrderBatch(newOrder);
      } catch (err) {
        console.error("Failed to save project order:", err);
      }
    },
    [draggedProjectPath, projectGroups, projectOrder],
  );

  const handleProjectDragEnd = useCallback(() => {
    setDraggedProjectPath(null);
    setDragOverProjectPath(null);
  }, []);

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

  // Load session details only for new sessions (not already loaded)
  useEffect(() => {
    for (const session of sessions) {
      // Skip if already loaded or currently loading
      if (!sessionDetails[session.id] && !loadingDetails.has(session.id)) {
        loadSessionDetail(session);
      }
    }
    // Only depend on sessions array identity, not sessionDetails to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Handle deleting a project
  const handleDeleteProject = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      await deleteProject(deleteConfirm.projectName);
      setDeleteConfirm(null);
      onRefresh();
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setIsDeleting(false);
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
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] overflow-hidden flex flex-col window-glow-strong"
          style={getAnimationStyles()}
        >
          {/* Window Header - matches mini window style with glass reflection */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] shrink-0 window-header-glass">
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

  // Render floating windows mode
  if (floatable) {
    // Get list of minimized sessions for the tray
    const minimizedSessionsList = sessions.filter((s) => hiddenSessions.has(s.id));
    const visibleSessions = sessions.filter((s) => !hiddenSessions.has(s.id));

    return (
      <>
        {/* Floating windows container - doesn't take layout space */}
        <div className="relative">
          {visibleSessions.map((session) => {
            const detail = sessionDetails[session.id];
            const isLoading = loadingDetails.has(session.id);
            const windowSize = getWindowSize(session.id);
            const pos = floatingPositions[session.id] || { x: 100, y: 100, zIndex: 100 };
            const isDragging = draggingWindow?.sessionId === session.id;
            const isCurrentlyResizing = resizingSession?.sessionId === session.id;

            return (
              <div
                key={session.id}
                ref={(el) => registerMiniWindowRef(session.id, el)}
                className={clsx(
                  "fixed rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-lg group",
                  isDragging && "shadow-2xl",
                  !isDragging && !isCurrentlyResizing && "transition-shadow duration-200",
                )}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: windowSize.width,
                  height: windowSize.height,
                  zIndex: pos.zIndex,
                }}
                onMouseDown={() => bringToFront(session.id)}
              >
                {/* Drag handle - window title bar (excluding buttons area on right) */}
                <div
                  className={clsx(
                    "absolute top-0 left-0 right-24 h-8 cursor-grab active:cursor-grabbing z-10",
                    isDragging && "cursor-grabbing",
                  )}
                  onMouseDown={(e) => handleFloatingDragStart(e, session.id)}
                />

                {/* Window content */}
                {detail ? (
                  <MiniSessionWindow
                    session={detail}
                    sessionName={sessionNames[session.id]}
                    onRename={(name) => onSessionNameChange(session.id, name)}
                    onMaximize={() => handleMaximize(session.id)}
                    onRefresh={onRefresh}
                    onDelete={onRefresh}
                    onMinimize={() => handleFloatingMinimize(session.id)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4">
                    {isLoading ? (
                      <>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <div className="w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm text-[var(--text-muted)]">
                            Connecting to session...
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                          Session: {session.id.slice(0, 8)}...
                        </p>
                      </>
                    ) : (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        Failed to load
                      </span>
                    )}
                  </div>
                )}

                {/* Resize handles */}
                {/* Right edge resize handle */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleResizeStart(e, session.id, "horizontal");
                  }}
                  className="absolute top-0 right-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-primary)]/20 transition-opacity z-20"
                  title="Drag to resize width"
                />

                {/* Bottom edge resize handle */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleResizeStart(e, session.id, "vertical");
                  }}
                  className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-primary)]/20 transition-opacity z-20"
                  title="Drag to resize height"
                />

                {/* Corner resize handle */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleResizeStart(e, session.id, "both");
                  }}
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-100 z-30 flex items-center justify-center"
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

                {/* Move indicator - shows position when dragging */}
                {isDragging && (
                  <div className="absolute top-10 left-3 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] z-10 pointer-events-none">
                    {Math.round(pos.x)}, {Math.round(pos.y)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Minimized windows tray */}
        {minimizedSessionsList.length > 0 && (
          <div className="fixed bottom-4 left-4 flex flex-wrap gap-2 z-[9999]">
            {minimizedSessionsList.map((session) => {
              const displayName =
                sessionNames[session.id] ||
                session.projectName?.slice(0, 15) ||
                `Session ${session.id.slice(0, 6)}`;
              return (
                <button
                  key={session.id}
                  onClick={() => handleFloatingRestore(session.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] shadow-lg transition-all hover:shadow-xl group"
                  title={`Restore ${displayName}`}
                >
                  <svg
                    className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h8m-4-4v8"
                    />
                  </svg>
                  <span className="text-xs font-medium text-[var(--text-secondary)] truncate max-w-[120px]">
                    {displayName}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty state */}
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
            <div
              className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setNewSessionModal(null);
                setNewSessionMessage("");
              }}
            />
            <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
              <div
                className="w-full max-w-lg rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] window-glow-strong"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] window-header-glass">
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
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-5">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Initial message
                  </label>
                  <textarea
                    value={newSessionMessage}
                    onChange={(e) => setNewSessionMessage(e.target.value)}
                    placeholder="What would you like Claude to help with?"
                    className="w-full h-32 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)] resize-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.metaKey && newSessionMessage.trim()) {
                        handleCreateSession();
                      }
                    }}
                  />
                  <p className="mt-2 text-xs text-[var(--text-tertiary)]">Press Cmd+Enter to create</p>
                </div>
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
      </>
    );
  }

  return (
    <div className="space-y-8">
      {sortedProjects.map(
        ([projectPath, { sessions: projectSessions, projectName }]) => {
          // When disableCollapse is true, never collapse
          const isCollapsed = disableCollapse ? false : collapsedProjects.has(projectPath);
          const activeCount = projectSessions.filter(
            (s) => s.status === "working" || s.status === "needs-approval",
          ).length;

          const isProjectDragging = draggedProjectPath === projectPath;
          const isProjectDragOver = dragOverProjectPath === projectPath;

          return (
            <div
              key={projectPath}
              className={clsx(
                "space-y-4 transition-all duration-200",
                isProjectDragging && "opacity-50",
                isProjectDragOver && "ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-primary)] rounded-xl"
              )}
              draggable
              onDragStart={(e) => handleProjectDragStart(e, projectPath)}
              onDragOver={(e) => handleProjectDragOver(e, projectPath)}
              onDragLeave={handleProjectDragLeave}
              onDrop={(e) => handleProjectDrop(e, projectPath)}
              onDragEnd={handleProjectDragEnd}
            >
              {/* Project header */}
              <div className="flex items-center gap-3 w-full group">
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] p-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                  </svg>
                </div>
                {disableCollapse ? (
                  <div className="flex items-center gap-2">
                    <IconFolder className="w-5 h-5 text-[var(--accent-amber)]" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {projectName}
                    </h3>
                  </div>
                ) : (
                  <button
                    onClick={() => toggleProject(projectPath)}
                    className="flex items-center gap-2 text-left"
                  >
                    <IconFolder className="w-5 h-5 text-[var(--accent-amber)]" />
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {projectName}
                    </h3>
                  </button>
                )}

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

                {/* Delete Project button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm({ projectPath, projectName });
                  }}
                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/10 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete project"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
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

                {!disableCollapse && (
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
                )}
              </div>

              {/* Expanded content: Kanban widget + Sessions */}
              {!isCollapsed && (
                <>
                  {/* Per-project Kanban widget */}
                  {!hideKanban && (
                    <ProjectKanbanWidget
                      projectId={projectName}
                      onNavigateToKanban={onNavigateToKanban}
                    />
                  )}

                  {/* Sessions horizontal scroll container */}
                  <div className="relative mt-4">
                    {/* Horizontally scrollable sessions list */}
                    <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[var(--border-subtle)] scrollbar-track-transparent">
                      <div
                        className="flex gap-4 items-start"
                        style={{ minWidth: "max-content" }}
                      >
                        {projectSessions
                          .sort((a, b) => {
                            // Sort by custom order first, then by session name (stable)
                            const orderA = sessionOrder[a.id] ?? Infinity;
                            const orderB = sessionOrder[b.id] ?? Infinity;
                            if (orderA !== orderB) return orderA - orderB;
                            // Fallback: alphabetical by session ID (stable, not by activity)
                            return a.id.localeCompare(b.id);
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
                                    <div className="flex flex-col items-center gap-2 p-4">
                                      <div className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm text-[var(--text-muted)]">
                                          Connecting to session...
                                        </span>
                                      </div>
                                      <p className="text-xs text-[var(--text-muted)]">
                                        Session: {session.id.slice(0, 8)}...
                                      </p>
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
                                onDragOver={(e) =>
                                  handleDragOver(e, session.id)
                                }
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
                                    handleResizeStart(
                                      e,
                                      session.id,
                                      "horizontal",
                                    )
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
                </>
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
              className="w-full max-w-lg rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] window-glow-strong"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with glass reflection */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] window-header-glass">
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
                  className="w-full h-32 px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)] resize-none"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] window-glow-strong"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with glass reflection */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-subtle)] window-header-glass">
                <div className="p-2 rounded-full bg-[var(--accent-rose)]/10">
                  <svg
                    className="w-5 h-5 text-[var(--accent-rose)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    Delete Project
                  </h2>
                  <p className="text-sm text-[var(--text-tertiary)]">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="px-5 py-4">
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-[var(--text-primary)]">
                    {deleteConfirm.projectName}
                  </span>
                  ?
                </p>
                <div className="text-xs text-[var(--text-tertiary)] space-y-1">
                  <p>This will permanently delete:</p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li>The project folder and all files</li>
                    <li>All Claude session files for this project</li>
                    <li>All features and tasks data</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--accent-rose)] text-white hover:bg-[var(--accent-rose)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isDeleting && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Delete Project
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
