import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getAllSessions,
  getSummary,
  getSessionDetail,
  subscribeToUpdates,
} from "./services/api";
import type {
  Session,
  SessionDetail,
  Summary,
  SessionStatus,
  ParsedMessage,
  ToolCall,
} from "./types";
import clsx from "clsx";

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
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function shortenPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 3) return path;
  return "~/" + parts.slice(-2).join("/");
}

function getProjectFolder(projectPath: string): string {
  // Keep the leading dash - folders are like "-Users-diego-Projects-base-project"
  return projectPath.replace(/\//g, "-");
}

// Group sessions by project path
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

// Tool name to icon mapping
function getToolIcon(toolName: string): string {
  const icons: Record<string, string> = {
    Read: "📖",
    Write: "✏️",
    Edit: "📝",
    Bash: "💻",
    Glob: "🔍",
    Grep: "🔎",
    Task: "📋",
    TodoWrite: "✅",
    WebFetch: "🌐",
    WebSearch: "🔍",
    AskFollowupQuestion: "❓",
  };
  return icons[toolName] || "🔧";
}

// ============================================================================
// Components
// ============================================================================

function StatusDot({ status }: { status: SessionStatus }) {
  return (
    <span
      className={clsx(
        "w-2 h-2 rounded-full flex-shrink-0",
        status === "working" && "bg-green-500 animate-pulse",
        status === "waiting" && "bg-yellow-500",
        status === "needs-approval" && "bg-orange-500 animate-pulse",
        status === "idle" && "bg-gray-400",
      )}
    />
  );
}

function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span
      className={clsx(
        "px-2 py-0.5 text-xs font-medium rounded-full",
        status === "working" && "bg-green-100 text-green-700",
        status === "waiting" && "bg-yellow-100 text-yellow-700",
        status === "needs-approval" && "bg-orange-100 text-orange-700",
        status === "idle" && "bg-gray-100 text-gray-600",
      )}
    >
      {status.replace("-", " ")}
    </span>
  );
}

// Tool Call Display Component
function ToolCallDisplay({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden my-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span>{getToolIcon(toolCall.name)}</span>
        <span className="font-mono text-sm font-medium text-gray-700">
          {toolCall.name}
        </span>
        <span className="ml-auto text-gray-400 text-xs">
          {expanded ? "▼" : "▶"}
        </span>
      </button>
      {expanded && (
        <div className="p-3 bg-white border-t border-gray-200">
          <div className="mb-2">
            <span className="text-xs font-medium text-gray-500">Input:</span>
            <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.result && (
            <div>
              <span className="text-xs font-medium text-gray-500">Result:</span>
              <pre className="mt-1 text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Message Component
function MessageDisplay({ message }: { message: ParsedMessage }) {
  const isUser = message.role === "user";
  const [showThinking, setShowThinking] = useState(false);

  return (
    <div
      className={clsx(
        "mb-4 p-4 rounded-lg",
        isUser
          ? "bg-blue-50 border border-blue-100"
          : "bg-white border border-gray-200",
      )}
    >
      {/* Message Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "text-xs font-semibold uppercase",
              isUser ? "text-blue-600" : "text-gray-600",
            )}
          >
            {isUser ? "User" : "Assistant"}
          </span>
          {message.thinking && (
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="text-xs text-purple-600 hover:text-purple-800"
            >
              {showThinking ? "Hide thinking" : "Show thinking"}
            </button>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>

      {/* Thinking Block */}
      {showThinking && message.thinking && (
        <div className="mb-3 p-3 bg-purple-50 border border-purple-100 rounded text-sm text-purple-800 italic">
          <div className="text-xs font-medium text-purple-600 mb-1">
            Thinking:
          </div>
          <div className="whitespace-pre-wrap max-h-60 overflow-y-auto">
            {message.thinking}
          </div>
        </div>
      )}

      {/* Message Content */}
      {message.content && (
        <div className="text-sm text-gray-800 whitespace-pre-wrap">
          {message.content}
        </div>
      )}

      {/* Tool Calls */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-gray-500 mb-1">
            Tool Calls ({message.toolCalls.length}):
          </div>
          {message.toolCalls.map((tc, idx) => (
            <ToolCallDisplay key={idx} toolCall={tc} />
          ))}
        </div>
      )}
    </div>
  );
}

// Session Detail Modal
function SessionDetailModal({
  session,
  detail,
  loading,
  error,
  onClose,
}: {
  session: Session;
  detail: SessionDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusDot status={session.status} />
              <h2 className="text-lg font-semibold text-gray-900">
                Session Details
              </h2>
              <StatusBadge status={session.status} />
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-500"
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

          {/* Session Info */}
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Project:</span>
              <span className="ml-2 font-mono text-gray-800">
                {session.projectPath}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Session ID:</span>
              <span className="ml-2 font-mono text-gray-800 text-xs">
                {session.id}
              </span>
            </div>
            {session.gitBranch && (
              <div>
                <span className="text-gray-500">Branch:</span>
                <span className="ml-2 font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-800">
                  {session.gitBranch}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Started:</span>
              <span className="ml-2 text-gray-800">
                {new Date(session.startedAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Last Activity:</span>
              <span className="ml-2 text-gray-800">
                {formatTimeAgo(session.lastActivityAt)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Stats:</span>
              <span className="ml-2 text-gray-800">
                {session.messageCount} messages, {session.toolCallCount} tool
                calls
              </span>
            </div>
          </div>

          {/* First Prompt */}
          {session.firstPrompt && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-xs font-medium text-blue-600">
                Initial Prompt:
              </span>
              <p className="mt-1 text-sm text-blue-900">
                {session.firstPrompt}
              </p>
            </div>
          )}
        </div>

        {/* Modal Body - Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading messages...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                <div className="font-medium">Failed to load session</div>
                <div className="text-sm mt-1">{error}</div>
              </div>
            </div>
          ) : detail?.messages && detail.messages.length > 0 ? (
            <div>
              <div className="text-sm text-gray-500 mb-4">
                {detail.messages.length} message
                {detail.messages.length !== 1 ? "s" : ""} in conversation
              </div>
              {detail.messages.map((msg) => (
                <MessageDisplay key={msg.id} message={msg} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No messages found in this session
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(session.id);
                }}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                title="Copy session ID"
              >
                Copy ID
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(session.projectPath);
                }}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                title="Copy project path"
              >
                Copy Path
              </button>
              <button
                onClick={() => {
                  // Open in terminal command
                  const cmd = `cd "${session.projectPath}" && claude`;
                  navigator.clipboard.writeText(cmd);
                }}
                className="px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                title="Copy command to open Claude in this project"
              >
                Copy Claude Cmd
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-mono truncate max-w-[300px]">
                {session.logFile}
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionCard({
  session,
  onClick,
}: {
  session: Session;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-white rounded-lg border p-3 hover:shadow-md transition-all cursor-pointer",
        session.status === "working" &&
          "border-green-200 hover:border-green-300",
        session.status === "needs-approval" &&
          "border-orange-200 hover:border-orange-300",
        session.status === "waiting" &&
          "border-yellow-200 hover:border-yellow-300",
        session.status === "idle" && "border-gray-200 hover:border-gray-300",
      )}
    >
      {/* Header: Path + Time */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={session.status} />
          <span className="text-xs text-gray-500 font-mono truncate">
            {shortenPath(session.projectPath)}
          </span>
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {formatTimeAgo(session.lastActivityAt)}
        </span>
      </div>

      {/* First Prompt / Goal */}
      {session.firstPrompt && (
        <p className="text-sm text-gray-800 line-clamp-2 mb-2">
          {session.firstPrompt}
        </p>
      )}

      {/* Last Output Preview */}
      {session.lastOutput && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2 italic">
          {session.lastOutput}
        </p>
      )}

      {/* Footer: Branch + Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {session.gitBranch && (
            <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[120px]">
              {session.gitBranch}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>{session.messageCount} msgs</span>
          <span>{session.toolCallCount} tools</span>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  title,
  sessions,
  color,
  onSessionClick,
}: {
  title: string;
  sessions: Session[];
  color: "green" | "orange" | "yellow" | "gray";
  onSessionClick: (session: Session) => void;
}) {
  const colorClasses = {
    green: "bg-green-50 border-green-200",
    orange: "bg-orange-50 border-orange-200",
    yellow: "bg-yellow-50 border-yellow-200",
    gray: "bg-gray-50 border-gray-200",
  };

  const headerColors = {
    green: "text-green-700",
    orange: "text-orange-700",
    yellow: "text-yellow-700",
    gray: "text-gray-600",
  };

  return (
    <div
      className={clsx(
        "flex-1 min-w-[280px] max-w-[320px] rounded-lg border p-3",
        colorClasses[color],
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={clsx("text-sm font-semibold", headerColors[color])}>
          {title}
        </h3>
        <span
          className={clsx(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            color === "green" && "bg-green-100 text-green-700",
            color === "orange" && "bg-orange-100 text-orange-700",
            color === "yellow" && "bg-yellow-100 text-yellow-700",
            color === "gray" && "bg-gray-100 text-gray-600",
          )}
        >
          {sessions.length}
        </span>
      </div>

      <div className="space-y-2 max-h-[420px] overflow-y-auto">
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onClick={() => onSessionClick(session)}
            />
          ))
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">
            No sessions
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectSection({
  projectPath,
  projectName,
  sessions,
  onSessionClick,
}: {
  projectPath: string;
  projectName: string;
  sessions: Session[];
  onSessionClick: (session: Session) => void;
}) {
  const working = sessions.filter((s) => s.status === "working");
  const needsApproval = sessions.filter((s) => s.status === "needs-approval");
  const waiting = sessions.filter((s) => s.status === "waiting");
  const idle = sessions.filter((s) => s.status === "idle");

  const recentCount = sessions.filter((s) => {
    const elapsed = Date.now() - new Date(s.lastActivityAt).getTime();
    return elapsed < 60 * 60 * 1000;
  }).length;
  const isHot = recentCount > 2;

  return (
    <div className="mb-8">
      {/* Project Header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-gray-900">{projectName}</h2>
        {isHot && <span className="text-orange-500">🔥</span>}
        <span className="text-sm text-gray-500">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </span>
        <span className="text-xs text-gray-400 font-mono">{projectPath}</span>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <KanbanColumn
          title="Working"
          sessions={working}
          color="green"
          onSessionClick={onSessionClick}
        />
        <KanbanColumn
          title="Needs Approval"
          sessions={needsApproval}
          color="orange"
          onSessionClick={onSessionClick}
        />
        <KanbanColumn
          title="Waiting"
          sessions={waiting}
          color="yellow"
          onSessionClick={onSessionClick}
        />
        <KanbanColumn
          title="Idle"
          sessions={idle}
          color="gray"
          onSessionClick={onSessionClick}
        />
      </div>

      <div className="border-b border-gray-200 mt-6" />
    </div>
  );
}

function SummaryBar({ summary }: { summary: Summary }) {
  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-gray-600">{summary.workingSessions} working</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-yellow-500" />
        <span className="text-gray-600">{summary.waitingSessions} waiting</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        <span className="text-gray-600">{summary.idleSessions} idle</span>
      </div>
      <div className="text-gray-400">|</div>
      <span className="text-gray-600">{summary.totalProjects} projects</span>
      <span className="text-gray-600">{summary.totalSessions} sessions</span>
      <span className="text-gray-600">
        {summary.totalMessages.toLocaleString()} messages
      </span>
      <span className="text-gray-600">
        {summary.totalToolCalls.toLocaleString()} tool calls
      </span>
    </div>
  );
}

// ============================================================================
// Main App
// ============================================================================

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [sessionsRes, summaryRes] = await Promise.all([
        getAllSessions(),
        getSummary(),
      ]);

      setSessions(sessionsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load session detail when a session is selected
  const handleSessionClick = useCallback(async (session: Session) => {
    setSelectedSession(session);
    setSessionDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    try {
      const projectFolder = getProjectFolder(session.projectPath);
      console.log("Fetching from folder:", projectFolder);
      const response = await getSessionDetail(projectFolder, session.id);
      setSessionDetail(response.data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load";
      console.error("Failed to load session detail:", errorMsg);
      setDetailError(errorMsg);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedSession(null);
    setSessionDetail(null);
    setDetailError(null);
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToUpdates((data) => {
      if (data.type === "update" || data.type === "new_session") {
        loadData();
      }
    });

    return unsubscribe;
  }, [loadData]);

  // Periodic refresh for time-based status updates (every 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 60000);

    return () => clearInterval(interval);
  }, [loadData]);

  // Group sessions by project
  const projectGroups = useMemo(
    () => groupSessionsByProject(sessions),
    [sessions],
  );

  // Sort projects by most recent activity
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

  if (loading && sessions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error}
          <button
            onClick={loadData}
            className="ml-4 text-red-600 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Claude Code Dashboard
              </h1>
              <p className="text-sm text-gray-500">
                Monitoring native session logs from ~/.claude/projects
              </p>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors font-medium"
            >
              Refresh
            </button>
          </div>
          {summary && <SummaryBar summary={summary} />}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {sortedProjects.length > 0 ? (
          sortedProjects.map(([projectPath, { sessions, projectName }]) => (
            <ProjectSection
              key={projectPath}
              projectPath={projectPath}
              projectName={projectName}
              sessions={sessions}
              onSessionClick={handleSessionClick}
            />
          ))
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg mb-2">No sessions found</p>
            <p className="text-gray-400 text-sm">
              Start a Claude Code session to see it appear here
            </p>
          </div>
        )}
      </main>

      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          detail={sessionDetail}
          loading={detailLoading}
          error={detailError}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default App;
