import { useState, useMemo } from "react";
import { clsx } from "clsx";
import type { Session } from "../../types";
import { useSessionStatuses } from "../../contexts/SessionStatusContext";
import { SessionWindowsGrid } from "../Dashboard/SessionWindowsGrid";

// ============================================================================
// Types
// ============================================================================

type ViewMode = "windows" | "list" | "grid";

interface ProjectSummaryViewProps {
  projectPath: string;
  projectName: string;
  sessions: Session[];
  sessionNames: Record<string, string>;
  onSessionClick: (session: Session) => void;
  onBack: () => void;
  onNavigateToKanban?: () => void;
  onSessionNameChange: (sessionId: string, name: string) => void;
  onRefresh: () => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ============================================================================
// Icons
// ============================================================================

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function IconFolder({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

// ============================================================================
// Stat Card Component
// ============================================================================

interface SessionStatDetail {
  name: string;
  value: number;
}

function StatCard({
  value,
  label,
  accent,
  details,
}: {
  value: number;
  label: string;
  accent?: string;
  details?: SessionStatDetail[];
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="card p-4 flex flex-col relative cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className="text-3xl font-bold"
        style={{ color: accent || "var(--text-primary)" }}
      >
        {value}
      </span>
      <span className="text-sm text-[var(--text-tertiary)]">{label}</span>

      {/* Tooltip */}
      {showTooltip && details && details.length > 0 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 max-h-48 overflow-y-auto">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg shadow-xl p-3">
            <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">
              {label} per Session
            </div>
            <div className="space-y-1.5">
              {details.map((detail, index) => (
                <div key={index} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--text-secondary)] truncate flex-1">{detail.name}</span>
                  <span className="font-mono text-[var(--text-primary)] flex-shrink-0" style={{ color: accent }}>
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[var(--border-subtle)]" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Session Status Dot Component
// ============================================================================

function SessionStatusDot({ sessionId }: { sessionId: string }) {
  const { getEffectiveStatus } = useSessionStatuses();
  const status = getEffectiveStatus(sessionId);

  const colors = {
    working: "bg-[var(--accent-amber)] shadow-[0_0_8px_var(--accent-amber)]",
    waiting: "bg-[var(--accent-emerald)]",
    "needs-approval": "bg-[var(--accent-rose)] animate-pulse",
    idle: "bg-[var(--text-tertiary)]",
  };

  return (
    <span
      className={clsx(
        "inline-block w-2 h-2 rounded-full flex-shrink-0",
        colors[status] || colors.idle
      )}
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ProjectSummaryView({
  projectPath,
  projectName,
  sessions,
  sessionNames,
  onSessionClick,
  onBack,
  onNavigateToKanban,
  onSessionNameChange,
  onRefresh,
}: ProjectSummaryViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("windows");
  const { getEffectiveStatus } = useSessionStatuses();

  // Filter sessions for this project only
  const projectSessions = useMemo(() => {
    return sessions.filter((s) => s.projectPath === projectPath);
  }, [sessions, projectPath]);

  // Calculate stats for this project with per-session details for tooltips
  const stats = useMemo(() => {
    // Helper to get session display name
    const getSessionDisplayName = (session: typeof projectSessions[0]) => {
      return sessionNames[session.id] || session.firstPrompt?.slice(0, 30) || `Session ${session.id.slice(0, 8)}`;
    };

    let working = 0;
    let waiting = 0;
    let idle = 0;
    let totalMessages = 0;
    let totalToolCalls = 0;

    const workingSessions: SessionStatDetail[] = [];
    const waitingSessions: SessionStatDetail[] = [];
    const idleSessions: SessionStatDetail[] = [];
    const messageDetails: SessionStatDetail[] = [];
    const toolCallDetails: SessionStatDetail[] = [];

    for (const session of projectSessions) {
      const status = getEffectiveStatus(session.id);
      const name = getSessionDisplayName(session);

      if (status === "working") {
        working++;
        workingSessions.push({ name, value: 1 });
      } else if (status === "waiting" || status === "needs-approval") {
        waiting++;
        waitingSessions.push({ name, value: 1 });
      } else {
        idle++;
        idleSessions.push({ name, value: 1 });
      }
      totalMessages += session.messageCount;
      totalToolCalls += session.toolCallCount;

      if (session.messageCount > 0) {
        messageDetails.push({ name, value: session.messageCount });
      }
      if (session.toolCallCount > 0) {
        toolCallDetails.push({ name, value: session.toolCallCount });
      }
    }

    // Sort details by value descending
    messageDetails.sort((a, b) => b.value - a.value);
    toolCallDetails.sort((a, b) => b.value - a.value);

    return {
      working,
      waiting,
      idle,
      totalMessages,
      totalToolCalls,
      workingSessions,
      waitingSessions,
      idleSessions,
      messageDetails,
      toolCallDetails,
    };
  }, [projectSessions, getEffectiveStatus, sessionNames]);

  // Sort sessions by activity
  const sortedSessions = useMemo(() => {
    return [...projectSessions].sort(
      (a, b) =>
        new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );
  }, [projectSessions]);

  // Active sessions (working or needs-approval)
  const activeSessions = useMemo(() => {
    return projectSessions.filter((s) => {
      const status = getEffectiveStatus(s.id);
      return status === "working" || status === "needs-approval";
    });
  }, [projectSessions, getEffectiveStatus]);

  return (
    <div className="h-full overflow-y-auto">
      {/* Header with glass reflection */}
      <div className="px-8 py-6 border-b border-[var(--border-subtle)] flex items-center justify-between window-header-glass">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
            title="Back"
          >
            <IconArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-amber)]/20 flex items-center justify-center">
              <IconFolder className="w-5 h-5 text-[var(--accent-amber)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">{projectName}</h1>
              <p className="text-sm text-[var(--text-tertiary)]">Project Summary</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-[var(--border-subtle)] p-0.5">
            <button
              onClick={() => setViewMode("windows")}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                viewMode === "windows"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
              title="Mini Windows"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
              title="List View"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-[var(--accent-primary)] text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
              title="Grid View"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <StatCard value={stats.working} label="Working" accent="var(--accent-amber)" details={stats.workingSessions} />
          <StatCard value={stats.waiting} label="Waiting" accent="var(--accent-emerald)" details={stats.waitingSessions} />
          <StatCard value={stats.idle} label="Idle" details={stats.idleSessions} />
          <StatCard value={stats.totalMessages} label="Messages" details={stats.messageDetails} />
          <StatCard value={stats.totalToolCalls} label="Tool Calls" details={stats.toolCallDetails} />
        </div>

        {/* Mini Windows View */}
        {viewMode === "windows" && (
          <SessionWindowsGrid
            sessions={projectSessions}
            disableCollapse
            hideKanban
            sessionNames={sessionNames}
            onSessionNameChange={onSessionNameChange}
            onRefresh={onRefresh}
            onNavigateToKanban={onNavigateToKanban}
          />
        )}

        {/* Active Sessions (for list/grid modes) */}
        {viewMode !== "windows" && activeSessions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
              Active Sessions ({activeSessions.length})
            </h2>
            <div className={clsx(viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-2")}>
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSessionClick(session)}
                  className={clsx(
                    "cursor-pointer transition-colors",
                    viewMode === "grid"
                      ? clsx(
                          "card p-4 hover:border-[var(--accent-primary)]",
                          getEffectiveStatus(session.id) === "working" &&
                            "border-[var(--accent-amber)] border-opacity-50",
                          getEffectiveStatus(session.id) === "needs-approval" &&
                            "border-[var(--accent-rose)] border-opacity-50"
                        )
                      : "flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--bg-tertiary)]"
                  )}
                >
                  {viewMode === "grid" ? (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <SessionStatusDot sessionId={session.id} />
                        <span className="font-medium text-[var(--text-primary)] truncate">
                          {sessionNames[session.id] ||
                            session.firstPrompt?.slice(0, 40) ||
                            `Session ${session.id.slice(0, 8)}`}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        {formatTimeAgo(session.lastActivityAt)}
                      </div>
                      {session.lastOutput && (
                        <p className="text-sm text-[var(--text-secondary)] mt-2 truncate">
                          {session.lastOutput}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <SessionStatusDot sessionId={session.id} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-[var(--text-primary)] truncate">
                          {sessionNames[session.id] ||
                            session.firstPrompt?.slice(0, 50) ||
                            `Session ${session.id.slice(0, 8)}`}
                        </div>
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        {session.messageCount} msgs • {session.toolCallCount} tools
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        {formatTimeAgo(session.lastActivityAt)}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Sessions (for list/grid modes) */}
        {viewMode !== "windows" && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
            All Sessions ({projectSessions.length})
          </h2>
          {projectSessions.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-tertiary)]">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                <IconFolder className="w-8 h-8 text-[var(--text-tertiary)]" />
              </div>
              <p className="mb-2">No sessions for this project</p>
              <p className="text-sm">Start a new session to get started.</p>
            </div>
          ) : (
            <div className={clsx(viewMode === "grid" ? "grid grid-cols-2 gap-4" : "space-y-2")}>
              {sortedSessions.map((session) => {
                const status = getEffectiveStatus(session.id);
                const isActive = status === "working" || status === "needs-approval";

                return (
                  <div
                    key={session.id}
                    onClick={() => onSessionClick(session)}
                    className={clsx(
                      "cursor-pointer transition-colors",
                      viewMode === "grid"
                        ? clsx(
                            "card p-4 hover:border-[var(--accent-primary)]",
                            status === "working" && "border-[var(--accent-amber)]/50",
                            status === "needs-approval" && "border-[var(--accent-rose)]/50"
                          )
                        : "flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--bg-tertiary)]"
                    )}
                  >
                    {viewMode === "grid" ? (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <SessionStatusDot sessionId={session.id} />
                          <span className="font-medium text-[var(--text-primary)] truncate flex-1">
                            {sessionNames[session.id] ||
                              session.firstPrompt?.slice(0, 40) ||
                              `Session ${session.id.slice(0, 8)}`}
                          </span>
                          {isActive && (
                            <span
                              className={clsx(
                                "px-2 py-0.5 text-xs rounded",
                                status === "working"
                                  ? "bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]"
                                  : "bg-[var(--accent-rose)]/20 text-[var(--accent-rose)]"
                              )}
                            >
                              {status === "working" ? "Working" : "Approval"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                          <span>{session.messageCount} messages</span>
                          <span>•</span>
                          <span>{session.toolCallCount} tool calls</span>
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-1">
                          {formatTimeAgo(session.lastActivityAt)}
                        </div>
                        {session.lastOutput && (
                          <p className="text-sm text-[var(--text-secondary)] mt-2 truncate">
                            {session.lastOutput}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <SessionStatusDot sessionId={session.id} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-[var(--text-primary)] truncate">
                            {sessionNames[session.id] ||
                              session.firstPrompt?.slice(0, 50) ||
                              `Session ${session.id.slice(0, 8)}`}
                          </div>
                        </div>
                        {isActive && (
                          <span
                            className={clsx(
                              "px-2 py-0.5 text-xs rounded",
                              status === "working"
                                ? "bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]"
                                : "bg-[var(--accent-rose)]/20 text-[var(--accent-rose)]"
                            )}
                          >
                            {status === "working" ? "Working" : "Approval"}
                          </span>
                        )}
                        <div className="text-xs text-[var(--text-tertiary)]">
                          {session.messageCount} msgs • {session.toolCallCount} tools
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)]">
                          {formatTimeAgo(session.lastActivityAt)}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
