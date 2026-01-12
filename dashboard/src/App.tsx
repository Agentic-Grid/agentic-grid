import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getAllSessions,
  getSummary,
  getSessionDetail,
  getSessionProcess,
  killSession,
  resumeSession,
  deleteSession,
  subscribeToUpdates,
  getSessionNames,
  setSessionName as apiSetSessionName,
  createNewSession,
  type ClaudeProcess,
} from "./services/api";
import { Terminal } from "./components/Terminal";
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
  onCreated: () => void;
}) {
  const [sessionName, setSessionName] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await createNewSession(projectPath, sessionName || undefined);
      setSessionId(res.data.sessionId);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sessionId) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {sessionId ? "New Session" : "Create New Session"}
              </h2>
              <p className="text-sm text-gray-500">{projectName}</p>
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
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden">
          {!sessionId ? (
            <div className="p-6">
              <div className="mb-4">
                <label
                  htmlFor="sessionName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Session Name (optional)
                </label>
                <input
                  type="text"
                  id="sessionName"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g., Fix authentication bug"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !creating) {
                      handleCreate();
                    }
                  }}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Give this session a name to easily identify it later
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Start Session"}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full p-4" style={{ minHeight: "500px" }}>
              <Terminal
                sessionId={sessionId}
                projectPath={projectPath}
                mode="new"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Session Detail Modal
function SessionDetailModal({
  session,
  detail,
  loading,
  error,
  sessionName,
  onClose,
  onRefresh,
  onNameChange,
}: {
  session: Session;
  detail: SessionDetail | null;
  loading: boolean;
  error: string | null;
  sessionName: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onNameChange: (name: string) => void;
}) {
  const [process, setProcess] = useState<ClaudeProcess | null>(null);
  const [processLoading, setProcessLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"messages" | "terminal">(
    "messages",
  );
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(sessionName || "");

  const handleNameSave = async () => {
    try {
      await apiSetSessionName(session.id, nameInput);
      onNameChange(nameInput);
      setEditingName(false);
    } catch (err) {
      console.error("Failed to save session name:", err);
    }
  };

  // Check for running process
  useEffect(() => {
    async function checkProcess() {
      setProcessLoading(true);
      try {
        const res = await getSessionProcess(session.id, session.projectPath);
        setProcess(res.data);
      } catch {
        setProcess(null);
      } finally {
        setProcessLoading(false);
      }
    }
    checkProcess();
  }, [session.id, session.projectPath]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleKill = async () => {
    if (!confirm("Are you sure you want to kill this session?")) return;
    setActionLoading("kill");
    setActionMessage(null);
    try {
      await killSession(session.id, session.projectPath);
      setActionMessage("Session killed successfully");
      setProcess(null);
      onRefresh();
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : "Failed to kill session",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    setActionLoading("resume");
    setActionMessage(null);
    try {
      await resumeSession(session.id, session.projectPath);
      setActionMessage("Session resumed in Terminal");
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : "Failed to resume session",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this session? This will permanently delete the session log file.",
      )
    )
      return;
    setActionLoading("delete");
    setActionMessage(null);
    try {
      const projectFolder = getProjectFolder(session.projectPath);
      await deleteSession(projectFolder, session.id);
      setActionMessage("Session deleted successfully");
      onRefresh();
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setActionMessage(
        err instanceof Error ? err.message : "Failed to delete session",
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusDot status={session.status} />
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Session name..."
                    className="px-2 py-1 text-lg font-semibold border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNameSave();
                      if (e.key === "Escape") {
                        setEditingName(false);
                        setNameInput(sessionName || "");
                      }
                    }}
                  />
                  <button
                    onClick={handleNameSave}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setNameInput(sessionName || "");
                    }}
                    className="p-1 text-gray-400 hover:bg-gray-100 rounded"
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
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {sessionName || "Untitled Session"}
                  </h2>
                  <button
                    onClick={() => setEditingName(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    title="Edit session name"
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
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                </div>
              )}
              <StatusBadge status={session.status} />
              {/* Process Status Badge */}
              {processLoading ? (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                  Checking...
                </span>
              ) : process ? (
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                  PID: {process.pid}
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                  Not running
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Control Buttons */}
              {process ? (
                <button
                  onClick={handleKill}
                  disabled={actionLoading === "kill"}
                  className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors disabled:opacity-50"
                >
                  {actionLoading === "kill" ? "Killing..." : "Kill Session"}
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  disabled={actionLoading === "resume"}
                  className="px-3 py-1.5 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors disabled:opacity-50"
                >
                  {actionLoading === "resume"
                    ? "Resuming..."
                    : "Resume Session"}
                </button>
              )}
              <button
                onClick={handleDelete}
                disabled={!!actionLoading}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-700 rounded transition-colors disabled:opacity-50"
                title="Delete session log"
              >
                {actionLoading === "delete" ? "Deleting..." : "Delete"}
              </button>
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

          {/* Action Message */}
          {actionMessage && (
            <div
              className={clsx(
                "mt-3 p-2 rounded text-sm",
                actionMessage.includes("success") ||
                  actionMessage.includes("Terminal")
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700",
              )}
            >
              {actionMessage}
            </div>
          )}

          {/* Tabs */}
          <div className="mt-4 flex gap-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("messages")}
              className={clsx(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === "messages"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              )}
            >
              Messages
            </button>
            <button
              onClick={() => setActiveTab("terminal")}
              className={clsx(
                "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === "terminal"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700",
              )}
            >
              Terminal
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "messages" ? (
            <div className="h-full overflow-y-auto px-6 py-4 bg-gray-50">
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
          ) : (
            <div className="h-full p-4">
              <Terminal
                sessionId={session.id}
                projectPath={session.projectPath}
              />
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
  sessionName,
  onClick,
  onDelete,
  onNameChange,
}: {
  session: Session;
  sessionName: string | null;
  onClick: () => void;
  onDelete: () => void;
  onNameChange: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(sessionName || "");

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        "Are you sure you want to delete this session? This cannot be undone.",
      )
    ) {
      onDelete();
    }
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
    setNameInput(sessionName || "");
  };

  const handleNameSave = async () => {
    try {
      await apiSetSessionName(session.id, nameInput);
      onNameChange(nameInput);
      setEditing(false);
    } catch (err) {
      console.error("Failed to save name:", err);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      handleNameSave();
    } else if (e.key === "Escape") {
      setEditing(false);
      setNameInput(sessionName || "");
    }
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-white rounded-lg border p-3 hover:shadow-md transition-all cursor-pointer group relative",
        session.status === "working" &&
          "border-green-200 hover:border-green-300",
        session.status === "needs-approval" &&
          "border-orange-200 hover:border-orange-300",
        session.status === "waiting" &&
          "border-yellow-200 hover:border-yellow-300",
        session.status === "idle" && "border-gray-200 hover:border-gray-300",
      )}
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all"
        title="Delete session"
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

      {/* Header: Name/Path + Time */}
      <div className="flex items-center justify-between gap-2 mb-2 pr-6">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StatusDot status={session.status} />
          {editing ? (
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={handleNameKeyDown}
              onBlur={handleNameSave}
              onClick={(e) => e.stopPropagation()}
              placeholder="Session name..."
              className="flex-1 px-1 py-0.5 text-sm font-medium border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-0"
              autoFocus
            />
          ) : (
            <span
              onClick={handleNameClick}
              className={clsx(
                "truncate cursor-text hover:bg-gray-100 px-1 py-0.5 rounded -mx-1 transition-colors",
                sessionName
                  ? "text-sm font-medium text-gray-900"
                  : "text-xs text-gray-400 italic",
              )}
              title="Click to edit name"
            >
              {sessionName || "Click to name..."}
            </span>
          )}
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
  sessionNames,
  color,
  onSessionClick,
  onSessionDelete,
  onSessionNameChange,
}: {
  title: string;
  sessions: Session[];
  sessionNames: Record<string, string>;
  color: "green" | "orange" | "yellow" | "gray";
  onSessionClick: (session: Session) => void;
  onSessionDelete: (session: Session) => void;
  onSessionNameChange: (sessionId: string, name: string) => void;
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
              sessionName={sessionNames[session.id] || null}
              onClick={() => onSessionClick(session)}
              onDelete={() => onSessionDelete(session)}
              onNameChange={(name) => onSessionNameChange(session.id, name)}
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
  sessionNames,
  onSessionClick,
  onSessionDelete,
  onNewSession,
  onSessionNameChange,
}: {
  projectPath: string;
  projectName: string;
  sessions: Session[];
  sessionNames: Record<string, string>;
  onSessionClick: (session: Session) => void;
  onSessionDelete: (session: Session) => void;
  onNewSession: () => void;
  onSessionNameChange: (sessionId: string, name: string) => void;
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
        <button
          onClick={onNewSession}
          className="ml-auto px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Session
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <KanbanColumn
          title="Working"
          sessions={working}
          sessionNames={sessionNames}
          color="green"
          onSessionClick={onSessionClick}
          onSessionDelete={onSessionDelete}
          onSessionNameChange={onSessionNameChange}
        />
        <KanbanColumn
          title="Needs Approval"
          sessions={needsApproval}
          sessionNames={sessionNames}
          color="orange"
          onSessionClick={onSessionClick}
          onSessionDelete={onSessionDelete}
          onSessionNameChange={onSessionNameChange}
        />
        <KanbanColumn
          title="Waiting"
          sessions={waiting}
          sessionNames={sessionNames}
          color="yellow"
          onSessionClick={onSessionClick}
          onSessionDelete={onSessionDelete}
          onSessionNameChange={onSessionNameChange}
        />
        <KanbanColumn
          title="Idle"
          sessions={idle}
          sessionNames={sessionNames}
          color="gray"
          onSessionClick={onSessionClick}
          onSessionDelete={onSessionDelete}
          onSessionNameChange={onSessionNameChange}
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
  const [sessionNames, setSessionNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // New session modal state
  const [newSessionProject, setNewSessionProject] = useState<{
    path: string;
    name: string;
  } | null>(null);

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

  const handleSessionDelete = useCallback(
    async (session: Session) => {
      try {
        const projectFolder = getProjectFolder(session.projectPath);
        await deleteSession(projectFolder, session.id);
        loadData();
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
    },
    [loadData],
  );

  const handleNewSession = useCallback(
    (projectPath: string, projectName: string) => {
      setNewSessionProject({ path: projectPath, name: projectName });
    },
    [],
  );

  const handleCloseNewSession = useCallback(() => {
    setNewSessionProject(null);
  }, []);

  const handleSessionNameChange = useCallback(
    (sessionId: string, name: string) => {
      setSessionNames((prev) => ({
        ...prev,
        [sessionId]: name,
      }));
    },
    [],
  );

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
              sessionNames={sessionNames}
              onSessionClick={handleSessionClick}
              onSessionDelete={handleSessionDelete}
              onNewSession={() => handleNewSession(projectPath, projectName)}
              onSessionNameChange={handleSessionNameChange}
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
          sessionName={sessionNames[selectedSession.id] || null}
          onClose={handleCloseModal}
          onRefresh={loadData}
          onNameChange={(name) =>
            handleSessionNameChange(selectedSession.id, name)
          }
        />
      )}

      {/* New Session Modal */}
      {newSessionProject && (
        <NewSessionModal
          projectPath={newSessionProject.path}
          projectName={newSessionProject.name}
          onClose={handleCloseNewSession}
          onCreated={loadData}
        />
      )}
    </div>
  );
}

export default App;
