import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getAllSessions,
  getSummary,
  getSessionDetail,
  killSession,
  deleteSession,
  subscribeToUpdates,
  getSessionNames,
  setSessionName as apiSetSessionName,
  createNewSession,
} from "./services/api";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ChatView } from "./components/Chat/ChatView";
import { MarketplaceView } from "./components/Marketplace/MarketplaceView";
import { AgentsView } from "./components/Agents/AgentsView";
import { WebhooksView } from "./components/Webhooks/WebhooksView";
import { SessionWindowsGrid } from "./components/Dashboard/SessionWindowsGrid";
import { NewProjectWizard } from "./components/ProjectWizard";
import { KanbanView } from "./components/Kanban";
import { KanbanQuickView } from "./components/Dashboard/KanbanQuickView";
import { useSessionStatuses } from "./contexts/SessionStatusContext";
import { KanbanDataProvider } from "./contexts/KanbanDataContext";
import type { Session, SessionDetail, Summary, SessionStatus } from "./types";
import clsx from "clsx";

// ============================================================================
// Types
// ============================================================================

type NavView = "dashboard" | "marketplace" | "agents" | "webhooks" | "kanban";

// ============================================================================
// Utility Functions
// ============================================================================

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getProjectFolder(projectPath: string): string {
  return projectPath.replace(/\//g, "-");
}

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

// ============================================================================
// Icon Components
// ============================================================================

function IconPlus({ className }: { className?: string }) {
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
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}

function IconRefresh({ className }: { className?: string }) {
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
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function IconChevron({
  className,
  direction = "right",
}: {
  className?: string;
  direction?: "up" | "down" | "left" | "right";
}) {
  const rotation = { up: -90, down: 90, left: 180, right: 0 };
  return (
    <svg
      className={className}
      style={{ transform: `rotate(${rotation[direction]}deg)` }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function IconStore({ className }: { className?: string }) {
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
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function IconRobot({ className }: { className?: string }) {
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
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function IconWebhook({ className }: { className?: string }) {
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
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

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

function IconDashboard({ className }: { className?: string }) {
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
        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
      />
    </svg>
  );
}

function IconKanban({ className }: { className?: string }) {
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
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

// StatusDot that uses real-time status from SessionStatusContext
function SessionStatusDot({ sessionId }: { sessionId: string }) {
  const { getEffectiveStatus } = useSessionStatuses();
  const status = getEffectiveStatus(sessionId);

  return (
    <span
      className={clsx(
        "w-2 h-2 rounded-full flex-shrink-0",
        status === "working" && "bg-[var(--accent-amber)] status-working",
        status === "waiting" && "bg-[var(--accent-emerald)]",
        status === "needs-approval" && "bg-[var(--accent-rose)]",
        status === "idle" && "bg-[var(--text-tertiary)]",
      )}
    />
  );
}

function StatCard({
  value,
  label,
  accent,
}: {
  value: number | string;
  label: string;
  accent?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={accent ? { color: accent } : {}}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// Collapse/Expand Icon
function IconCollapse({
  className,
  collapsed,
}: {
  className?: string;
  collapsed?: boolean;
}) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      style={{ transform: collapsed ? "rotate(180deg)" : undefined }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
      />
    </svg>
  );
}

// Sidebar Component
function Sidebar({
  currentView,
  onViewChange,
  sessions,
  sessionNames,
  selectedSession,
  onSessionSelect,
  onSessionDelete,
  onNewSession,
  onNewProject,
  isCollapsed,
  onToggleCollapse,
}: {
  currentView: NavView;
  onViewChange: (view: NavView) => void;
  sessions: Session[];
  sessionNames: Record<string, string>;
  selectedSession: Session | null;
  onSessionSelect: (session: Session) => void;
  onSessionDelete: (session: Session) => void;
  onNewSession: (projectPath: string, projectName: string) => void;
  onNewProject: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const projectGroups = useMemo(
    () => groupSessionsByProject(sessions),
    [sessions],
  );

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    new Set(),
  );

  const toggleProject = (projectPath: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectPath)) {
        next.delete(projectPath);
      } else {
        next.add(projectPath);
      }
      return next;
    });
  };

  // Auto-expand project when session is selected
  useEffect(() => {
    if (selectedSession) {
      setExpandedProjects((prev) => {
        const next = new Set(prev);
        next.add(selectedSession.projectPath);
        return next;
      });
    }
  }, [selectedSession]);

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

  return (
    <aside
      className={clsx(
        "h-screen flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
        {!isCollapsed && (
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">
              Claude Platform
            </h1>
            <p className="text-xs text-[var(--text-tertiary)]">
              AI Development Hub
            </p>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className={clsx(
            "p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors",
            isCollapsed && "mx-auto",
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <IconCollapse className="w-4 h-4" collapsed={isCollapsed} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-3 border-b border-[var(--border-subtle)]">
        <button
          onClick={() => onViewChange("dashboard")}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            currentView === "dashboard"
              ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
            isCollapsed && "justify-center px-2",
          )}
          title={isCollapsed ? "Dashboard" : undefined}
        >
          <IconDashboard className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && "Dashboard"}
        </button>
        <button
          onClick={() => onViewChange("marketplace")}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            currentView === "marketplace"
              ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
            isCollapsed && "justify-center px-2",
          )}
          title={isCollapsed ? "Marketplace" : undefined}
        >
          <IconStore className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && "Marketplace"}
        </button>
        <button
          onClick={() => onViewChange("agents")}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            currentView === "agents"
              ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
            isCollapsed && "justify-center px-2",
          )}
          title={isCollapsed ? "Agents" : undefined}
        >
          <IconRobot className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && "Agents"}
        </button>
        <button
          onClick={() => onViewChange("webhooks")}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            currentView === "webhooks"
              ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
            isCollapsed && "justify-center px-2",
          )}
          title={isCollapsed ? "Webhooks" : undefined}
        >
          <IconWebhook className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && "Webhooks"}
        </button>
        <button
          onClick={() => onViewChange("kanban")}
          className={clsx(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            currentView === "kanban"
              ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
            isCollapsed && "justify-center px-2",
          )}
          title={isCollapsed ? "Kanban" : undefined}
        >
          <IconKanban className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && "Kanban"}
        </button>
      </nav>

      {/* Projects - hidden when collapsed */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Projects
            </span>
            <button
              onClick={onNewProject}
              className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
              title="New Project"
            >
              <IconPlus className="w-4 h-4" />
            </button>
          </div>

          <div className="px-2 space-y-1">
            {sortedProjects.map(
              ([projectPath, { sessions: projectSessions, projectName }]) => (
                <div key={projectPath}>
                  <button
                    onClick={() => toggleProject(projectPath)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-[var(--bg-tertiary)] group"
                  >
                    <IconChevron
                      className="w-3 h-3 text-[var(--text-tertiary)] transition-transform"
                      direction={
                        expandedProjects.has(projectPath) ? "down" : "right"
                      }
                    />
                    <IconFolder className="w-4 h-4 text-[var(--accent-amber)]" />
                    <span className="truncate flex-1 text-left text-[var(--text-secondary)]">
                      {projectName}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {projectSessions.length}
                    </span>
                  </button>

                  {expandedProjects.has(projectPath) && (
                    <div className="ml-4 pl-2 border-l border-[var(--border-subtle)] space-y-0.5">
                      {projectSessions
                        .sort(
                          (a, b) =>
                            new Date(b.lastActivityAt).getTime() -
                            new Date(a.lastActivityAt).getTime(),
                        )
                        .map((session) => (
                          <div
                            key={session.id}
                            className={clsx(
                              "group w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors cursor-pointer",
                              selectedSession?.id === session.id
                                ? "bg-[var(--accent-primary)]/20 text-[var(--text-primary)] font-medium border border-[var(--accent-primary)]/30"
                                : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
                            )}
                            onClick={() => onSessionSelect(session)}
                          >
                            <SessionStatusDot sessionId={session.id} />
                            <span className="truncate flex-1">
                              {sessionNames[session.id] ||
                                session.firstPrompt?.slice(0, 30) ||
                                `Session ${session.id.slice(0, 6)}`}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSessionDelete(session);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--accent-rose)]/20 text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] transition-all"
                              title="Delete session"
                            >
                              <svg
                                className="w-3 h-3"
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
                          </div>
                        ))}
                      <button
                        onClick={() => onNewSession(projectPath, projectName)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)]"
                      >
                        <IconPlus className="w-3 h-3" />
                        <span>New Session</span>
                      </button>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

// Dashboard View (main view with session overview)
function DashboardView({
  summary,
  sessions,
  sessionNames,
  onSessionClick,
  onSessionNameChange,
  onRefresh,
  onNavigateToKanban,
}: {
  summary: Summary | null;
  sessions: Session[];
  sessionNames: Record<string, string>;
  onSessionClick: (session: Session) => void;
  onSessionNameChange: (sessionId: string, name: string) => void;
  onRefresh: () => void;
  onNavigateToKanban?: () => void;
}) {
  // View mode: "grid" for mini-windows, "list" for classic list view
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Get real-time statuses from context
  const { getEffectiveStatus } = useSessionStatuses();

  const projectGroups = useMemo(
    () => groupSessionsByProject(sessions),
    [sessions],
  );

  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort(
        (a, b) =>
          new Date(b.lastActivityAt).getTime() -
          new Date(a.lastActivityAt).getTime(),
      )
      .slice(0, 10);
  }, [sessions]);

  // Calculate stats using real-time status from context
  const realTimeStats = useMemo(() => {
    let working = 0;
    let waiting = 0;
    let idle = 0;

    for (const session of sessions) {
      const status = getEffectiveStatus(session.id);
      if (status === "working") {
        working++;
      } else if (status === "waiting" || status === "needs-approval") {
        waiting++;
      } else {
        idle++;
      }
    }

    return { working, waiting, idle };
  }, [sessions, getEffectiveStatus]);

  const activeSessions = useMemo(() => {
    return sessions.filter((s) => {
      const status = getEffectiveStatus(s.id);
      return status === "working" || status === "needs-approval";
    });
  }, [sessions, getEffectiveStatus]);

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Dashboard
          </h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            Overview of all your Claude sessions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-[var(--border-subtle)] p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
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
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          <button onClick={onRefresh} className="btn btn-ghost">
            <IconRefresh className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Stats - use real-time status from context for session counts */}
        <div className="grid grid-cols-6 gap-4">
          <StatCard
            value={realTimeStats.working}
            label="Working"
            accent="var(--accent-amber)"
          />
          <StatCard
            value={realTimeStats.waiting}
            label="Waiting"
            accent="var(--accent-emerald)"
          />
          <StatCard value={realTimeStats.idle} label="Idle" />
          <StatCard
            value={summary?.totalProjects ?? projectGroups.size}
            label="Projects"
            accent="var(--accent-primary)"
          />
          <StatCard value={summary?.totalMessages ?? 0} label="Messages" />
          <StatCard value={summary?.totalToolCalls ?? 0} label="Tool Calls" />
        </div>

        {/* Kanban Quick View Widget */}
        <KanbanQuickView onNavigateToKanban={onNavigateToKanban} />

        {/* Grid View - Mini Windows */}
        {viewMode === "grid" && (
          <SessionWindowsGrid
            sessions={sessions}
            sessionNames={sessionNames}
            onSessionNameChange={onSessionNameChange}
            onRefresh={onRefresh}
            onNavigateToKanban={onNavigateToKanban}
          />
        )}

        {/* List View - Classic */}
        {viewMode === "list" && (
          <>
            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                  Active Sessions
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => onSessionClick(session)}
                      className={clsx(
                        "card p-4 cursor-pointer hover:border-[var(--accent-primary)] transition-colors",
                        session.status === "working" &&
                          "border-[var(--accent-amber)] border-opacity-50",
                        session.status === "needs-approval" &&
                          "border-[var(--accent-rose)] border-opacity-50",
                      )}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <SessionStatusDot sessionId={session.id} />
                        <span className="font-medium text-[var(--text-primary)] truncate">
                          {sessionNames[session.id] ||
                            session.firstPrompt?.slice(0, 40) ||
                            `Session ${session.id.slice(0, 8)}`}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        {session.projectName} •{" "}
                        {formatTimeAgo(session.lastActivityAt)}
                      </div>
                      {session.lastOutput && (
                        <p className="text-sm text-[var(--text-secondary)] mt-2 truncate">
                          {session.lastOutput}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Sessions */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                Recent Sessions
              </h2>
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => onSessionClick(session)}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors"
                  >
                    <SessionStatusDot sessionId={session.id} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-[var(--text-primary)] truncate">
                        {sessionNames[session.id] ||
                          session.firstPrompt?.slice(0, 50) ||
                          `Session ${session.id.slice(0, 8)}`}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        {session.projectName}
                      </div>
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {session.messageCount} msgs • {session.toolCallCount}{" "}
                      tools
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)]">
                      {formatTimeAgo(session.lastActivityAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Projects Summary */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                Projects ({projectGroups.size})
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {Array.from(projectGroups.entries())
                  .sort((a, b) => b[1].sessions.length - a[1].sessions.length)
                  .slice(0, 6)
                  .map(
                    ([
                      projectPath,
                      { sessions: projectSessions, projectName },
                    ]) => {
                      const working = projectSessions.filter(
                        (s) => s.status === "working",
                      ).length;
                      const needsApproval = projectSessions.filter(
                        (s) => s.status === "needs-approval",
                      ).length;
                      return (
                        <div key={projectPath} className="card p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <IconFolder className="w-4 h-4 text-[var(--accent-amber)]" />
                            <span className="font-medium text-[var(--text-primary)] truncate">
                              {projectName}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)] flex gap-3">
                            <span>{projectSessions.length} sessions</span>
                            {working > 0 && (
                              <span className="text-[var(--accent-amber)]">
                                {working} active
                              </span>
                            )}
                            {needsApproval > 0 && (
                              <span className="text-[var(--accent-rose)]">
                                {needsApproval} pending
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// New Session Modal
function NewSessionModal({
  projectPath,
  projectName,
  onClose,
  onCreated,
}: {
  projectPath: string;
  projectName: string;
  onClose: () => void;
  onCreated: (sessionId: string) => void;
}) {
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleCreate = async () => {
    if (!message.trim()) {
      setError("Please enter a message to start the session");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const response = await createNewSession(projectPath, message.trim());
      onCreated(response.data.sessionId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="modal-backdrop animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content animate-slide-up"
        style={{ maxWidth: "500px" }}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-1">New Session</h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            {projectName}
          </p>

          <div className="mb-4">
            <label className="block text-sm mb-2 text-[var(--text-secondary)]">
              What would you like Claude to help with?
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g., Help me fix the authentication bug in the login form..."
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] outline-none focus:border-[var(--accent-primary)] resize-none"
              rows={4}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.metaKey && !creating) handleCreate();
              }}
              autoFocus
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Press Cmd+Enter to start
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--accent-rose)] bg-opacity-10 text-[var(--accent-rose)] text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !message.trim()}
              className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {creating ? "Starting..." : "Start Session"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main App
// ============================================================================

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sessionNames, setSessionNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<NavView>("dashboard");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const [newSessionProject, setNewSessionProject] = useState<{
    path: string;
    name: string;
  } | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [sessionsRes, summaryRes, namesRes] = await Promise.all([
        getAllSessions(),
        getSummary(),
        getSessionNames(),
      ]);

      setSessions(sessionsRes.data);
      setSummary(summaryRes.data);
      setSessionNames(namesRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSessionClick = useCallback(
    async (session: Session, retryCount = 0) => {
      setSelectedSession(session);
      setSessionDetail(null);
      setDetailLoading(true);
      setCurrentView("dashboard");

      try {
        const projectFolder = getProjectFolder(session.projectPath);
        const response = await getSessionDetail(projectFolder, session.id);
        setSessionDetail(response.data);
      } catch (err) {
        // For new sessions, the JSONL file might not exist yet - retry a few times
        if (retryCount < 5) {
          console.log(
            `Session not ready yet, retrying in 1s... (attempt ${retryCount + 1}/5)`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return handleSessionClick(session, retryCount + 1);
        }
        console.error("Failed to load session detail:", err);
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  const handleBackFromChat = useCallback(() => {
    setSelectedSession(null);
    setSessionDetail(null);
  }, []);

  const handleSessionNameChange = useCallback(
    async (sessionId: string, name: string) => {
      try {
        await apiSetSessionName(sessionId, name);
        setSessionNames((prev) => ({ ...prev, [sessionId]: name }));
      } catch (err) {
        console.error("Failed to save name:", err);
      }
    },
    [],
  );

  const handleKillSession = useCallback(async () => {
    if (!selectedSession) return;

    try {
      await killSession(selectedSession.id, selectedSession.projectPath);
      loadData();
    } catch (err) {
      console.error("Failed to kill session:", err);
    }
  }, [selectedSession, loadData]);

  const handleDeleteSession = useCallback(() => {
    // Called after session is deleted - clear selection and refresh
    setSelectedSession(null);
    setSessionDetail(null);
    loadData();
  }, [loadData]);

  const confirmDeleteSession = useCallback(async () => {
    if (!sessionToDelete) return;

    setIsDeleting(true);
    try {
      const projectFolder = getProjectFolder(sessionToDelete.projectPath);
      await deleteSession(projectFolder, sessionToDelete.id);
      // If this was the selected session, clear it
      if (selectedSession?.id === sessionToDelete.id) {
        setSelectedSession(null);
        setSessionDetail(null);
      }
      loadData();
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setIsDeleting(false);
      setSessionToDelete(null);
    }
  }, [sessionToDelete, selectedSession, loadData]);

  const handleNewSession = useCallback(
    (projectPath: string, projectName: string) => {
      setNewSessionProject({ path: projectPath, name: projectName });
    },
    [],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = subscribeToUpdates((data) => {
      if (data.type === "update" || data.type === "new_session") {
        loadData();
      }
    });
    return unsubscribe;
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => loadData(), 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading && sessions.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{
              borderColor: "var(--accent-primary)",
              borderTopColor: "transparent",
            }}
          />
          <div style={{ color: "var(--text-muted)" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div
          className="p-6 rounded-xl"
          style={{ background: "var(--accent-rose-glow)" }}
        >
          <div style={{ color: "var(--accent-rose)" }}>{error}</div>
          <button onClick={loadData} className="btn btn-ghost mt-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render main content based on view
  const renderMainContent = () => {
    // If a session is selected and we have details, show ChatView
    if (selectedSession && sessionDetail) {
      return (
        <ChatView
          session={sessionDetail}
          onBack={handleBackFromChat}
          sessionName={sessionNames[selectedSession.id]}
          onRename={(name) => handleSessionNameChange(selectedSession.id, name)}
          onKill={handleKillSession}
          onDelete={handleDeleteSession}
        />
      );
    }

    // If session selected but still loading
    if (selectedSession && detailLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              style={{
                borderColor: "var(--accent-primary)",
                borderTopColor: "transparent",
              }}
            />
            <div style={{ color: "var(--text-muted)" }}>Loading session...</div>
          </div>
        </div>
      );
    }

    // Otherwise show the selected view
    switch (currentView) {
      case "marketplace":
        return <MarketplaceView />;
      case "agents":
        return <AgentsView />;
      case "webhooks":
        return <WebhooksView />;
      case "kanban":
        return <KanbanView />;
      default:
        return (
          <DashboardView
            summary={summary}
            sessions={sessions}
            sessionNames={sessionNames}
            onSessionClick={handleSessionClick}
            onSessionNameChange={handleSessionNameChange}
            onRefresh={loadData}
            onNavigateToKanban={() => setCurrentView("kanban")}
          />
        );
    }
  };

  return (
    <KanbanDataProvider pollInterval={5000}>
      <div
        className="flex h-screen"
        style={{ background: "var(--bg-primary)" }}
      >
        <Sidebar
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view);
            setSelectedSession(null);
            setSessionDetail(null);
          }}
          sessions={sessions}
          sessionNames={sessionNames}
          selectedSession={selectedSession}
          onSessionSelect={handleSessionClick}
          onSessionDelete={(session) => setSessionToDelete(session)}
          onNewSession={handleNewSession}
          onNewProject={() => setShowNewProject(true)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="flex-1 h-screen overflow-hidden">
          {renderMainContent()}
        </main>

        {/* Modals */}
        {newSessionProject && (
          <NewSessionModal
            projectPath={newSessionProject.path}
            projectName={newSessionProject.name}
            onClose={() => setNewSessionProject(null)}
            onCreated={async (sessionId: string) => {
              // Reload sessions to get the new one
              await loadData();
              // Navigate to the new session
              const newSession: Session = {
                id: sessionId,
                projectPath: newSessionProject.path,
                projectName: newSessionProject.name,
                startedAt: new Date().toISOString(),
                lastActivityAt: new Date().toISOString(),
                messageCount: 1,
                toolCallCount: 0,
                status: "working" as SessionStatus,
                hasPendingToolUse: false,
                firstPrompt: "",
                lastOutput: "",
                logFile: "",
                fileSize: 0,
              };
              handleSessionClick(newSession);
            }}
          />
        )}

        {showNewProject && (
          <NewProjectWizard
            onClose={() => setShowNewProject(false)}
            onCreated={loadData}
          />
        )}

        {/* Delete session confirmation dialog */}
        <ConfirmDialog
          isOpen={!!sessionToDelete}
          title="Delete Session"
          message={`Are you sure you want to delete "${sessionToDelete ? sessionNames[sessionToDelete.id] || sessionToDelete.firstPrompt?.slice(0, 30) || sessionToDelete.id.slice(0, 8) : ""}"? This action cannot be undone.`}
          confirmLabel={isDeleting ? "Deleting..." : "Delete"}
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={confirmDeleteSession}
          onCancel={() => setSessionToDelete(null)}
        />
      </div>
    </KanbanDataProvider>
  );
}

export default App;
