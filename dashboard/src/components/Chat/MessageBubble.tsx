import { useState, memo } from "react";
import { clsx } from "clsx";
import type { ParsedMessage, ToolCall } from "../../types";
import { ToolCallCard } from "./ToolCallCard";
import { MarkdownContent } from "./MarkdownContent";
import { ApprovalCard } from "./ApprovalCard";

interface MessageBubbleProps {
  message: ParsedMessage;
  isLastMessage?: boolean;
  sessionId?: string;
  projectPath?: string;
  onApproved?: () => void;
}

// Tool icons by category
const toolIcons: Record<string, string> = {
  Read: "📖",
  Write: "✏️",
  Edit: "🔧",
  Bash: "💻",
  Glob: "🔍",
  Grep: "🔎",
  Task: "📋",
  WebFetch: "🌐",
  WebSearch: "🔍",
  TodoWrite: "✅",
  AskUserQuestion: "❓",
};

// Threshold for when to show collapsed view (excluding TodoWrite)
const COLLAPSE_THRESHOLD = 2;

// Collapsible tool call group component
function ToolCallGroup({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Separate TodoWrite calls from other tools
  const todoWriteCalls = toolCalls.filter((t) => t.name === "TodoWrite");
  const otherToolCalls = toolCalls.filter((t) => t.name !== "TodoWrite");

  // If fewer than threshold non-TodoWrite tools, show all normally
  if (otherToolCalls.length < COLLAPSE_THRESHOLD) {
    return (
      <div className="w-full space-y-2">
        {toolCalls.map((tool, index) => (
          <ToolCallCard key={tool.id || index} toolCall={tool} />
        ))}
      </div>
    );
  }

  // Find the last non-TodoWrite tool (most recent / currently executing)
  const lastTool = otherToolCalls[otherToolCalls.length - 1];
  const lastToolIcon = toolIcons[lastTool.name] || "🔧";
  const isRunning = lastTool.status === "running";

  // Count tools by status (excluding TodoWrite)
  const completedCount = otherToolCalls.filter(
    (t) => t.status === "complete",
  ).length;
  const runningCount = otherToolCalls.filter(
    (t) => t.status === "running",
  ).length;

  return (
    <div className="w-full">
      {/* Collapsed header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
          "glass border border-[var(--border-subtle)]",
          "hover:bg-[var(--bg-tertiary)]",
        )}
      >
        {/* Tool count badge */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {otherToolCalls.length}
          </span>
          <span className="text-xs text-[var(--text-tertiary)]">tools</span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-[var(--border-subtle)]" />

        {/* Current tool indicator */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isRunning ? (
            <>
              <span className="text-xs text-[var(--text-tertiary)]">
                executing
              </span>
              <span className="text-base">{lastToolIcon}</span>
              <span className="font-mono text-sm text-[var(--accent-cyan)] truncate">
                {lastTool.name}
              </span>
              <span className="animate-pulse text-[var(--accent-cyan)]">
                ...
              </span>
            </>
          ) : (
            <>
              <span className="text-xs text-[var(--text-tertiary)]">last:</span>
              <span className="text-base">{lastToolIcon}</span>
              <span className="font-mono text-sm text-[var(--text-secondary)] truncate">
                {lastTool.name}
              </span>
            </>
          )}
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {runningCount > 0 && (
            <span className="text-xs text-[var(--accent-cyan)]">
              {runningCount} running
            </span>
          )}
          <span className="text-xs text-[var(--accent-emerald)]">
            {completedCount}/{otherToolCalls.length}
          </span>
        </div>

        {/* Expand/collapse chevron */}
        <svg
          className={clsx(
            "w-4 h-4 text-[var(--text-tertiary)] transition-transform",
            isExpanded && "rotate-180",
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

      {/* Expanded tool list */}
      {isExpanded && (
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-[var(--border-subtle)]">
          {otherToolCalls.map((tool, index) => (
            <ToolCallCard key={tool.id || index} toolCall={tool} />
          ))}
        </div>
      )}

      {/* TodoWrite calls always shown separately */}
      {todoWriteCalls.length > 0 && (
        <div className="mt-2 space-y-2">
          {todoWriteCalls.map((tool, index) => (
            <ToolCallCard key={tool.id || `todo-${index}`} toolCall={tool} />
          ))}
        </div>
      )}
    </div>
  );
}

// Icons for system context types
const contextTypeIcons: Record<string, React.ReactNode> = {
  command: (
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
        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  skill: (
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
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  ),
  agent: (
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
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  mode: (
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
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
};

// Labels for system context types
const contextTypeLabels: Record<string, string> = {
  command: "Executing Command",
  skill: "Loading Skill",
  agent: "Entering Agent Mode",
  mode: "Loading Mode",
};

// Icons for local command types
const localCommandIcons: Record<string, React.ReactNode> = {
  stdout: (
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
        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  stderr: (
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
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  caveat: (
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
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  reminder: (
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
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

// Labels for local command types
const localCommandLabels: Record<string, string> = {
  stdout: "Command Output",
  stderr: "Command Error",
  caveat: "System Notice",
  reminder: "System Reminder",
};

// Colors for local command types
const localCommandColors: Record<
  string,
  { border: string; bg: string; icon: string; text: string }
> = {
  stdout: {
    border: "border-[var(--accent-cyan)]/30",
    bg: "bg-[var(--accent-cyan)]/5",
    icon: "text-[var(--accent-cyan)]",
    text: "text-[var(--accent-cyan)]",
  },
  stderr: {
    border: "border-[var(--accent-rose)]/30",
    bg: "bg-[var(--accent-rose)]/5",
    icon: "text-[var(--accent-rose)]",
    text: "text-[var(--accent-rose)]",
  },
  caveat: {
    border: "border-[var(--accent-amber)]/30",
    bg: "bg-[var(--accent-amber)]/5",
    icon: "text-[var(--accent-amber)]",
    text: "text-[var(--accent-amber)]",
  },
  reminder: {
    border: "border-[var(--text-tertiary)]/30",
    bg: "bg-[var(--bg-tertiary)]",
    icon: "text-[var(--text-tertiary)]",
    text: "text-[var(--text-tertiary)]",
  },
};

// Memoized to prevent re-renders during typing in parent components
export const MessageBubble = memo(function MessageBubble({
  message,
  isLastMessage = false,
  sessionId,
  projectPath,
  onApproved,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSummary = message.isSummary;
  const isSystemContext = message.isSystemContext;
  const isLocalCommand = message.isLocalCommand;
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
  const needsApproval = message.needsApproval && isLastMessage;

  // System context messages (loading .md files for commands/skills/agents)
  if (isSystemContext) {
    const contextType = message.systemContextType || "mode";
    const contextName = message.systemContextName || "Unknown";
    const contextFile = message.systemContextFile || "";
    const icon = contextTypeIcons[contextType] || contextTypeIcons.mode;
    const label = contextTypeLabels[contextType] || "Loading Context";

    return (
      <div className="flex flex-col gap-2 max-w-[95%] mx-auto items-center">
        {/* Header with timestamp */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <span className="font-medium">System</span>
          <span>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* System context card */}
        <div
          className={clsx(
            "w-full rounded-xl px-4 py-3 border",
            "border-[var(--accent-violet)]/30 bg-[var(--accent-violet)]/5",
          )}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="shrink-0 mt-0.5 text-[var(--accent-violet)]">
              {icon}
            </div>

            <div className="flex-1 min-w-0">
              {/* Title */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-[var(--accent-violet)]">
                  {label}
                </span>
                <span className="text-sm font-mono text-[var(--text-primary)]">
                  /{contextName}
                </span>
              </div>

              {/* File path subtitle */}
              {contextFile && (
                <div className="text-xs text-[var(--text-tertiary)] font-mono mb-2">
                  {contextFile}
                </div>
              )}

              {/* Collapsible content */}
              <details className="group">
                <summary className="cursor-pointer text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] select-none flex items-center gap-1">
                  <svg
                    className="w-3 h-3 transition-transform group-open:rotate-90"
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
                  <span className="group-open:hidden">Show definition...</span>
                  <span className="hidden group-open:inline">
                    Hide definition
                  </span>
                </summary>
                <div className="mt-2 p-3 rounded-lg bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] max-h-64 overflow-y-auto">
                  <MarkdownContent content={message.content} />
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Local command messages (stdout, caveat, reminder)
  if (isLocalCommand) {
    const commandType = message.localCommandType || "stdout";
    const icon = localCommandIcons[commandType] || localCommandIcons.stdout;
    const label = localCommandLabels[commandType] || "System Message";
    const colors = localCommandColors[commandType] || localCommandColors.stdout;

    return (
      <div className="flex flex-col gap-2 max-w-[95%] mx-auto items-center">
        {/* Header with timestamp */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <span className="font-medium">System</span>
          <span>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Local command card */}
        <div
          className={clsx(
            "w-full rounded-xl px-4 py-3 border",
            colors.border,
            colors.bg,
          )}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={clsx("shrink-0 mt-0.5", colors.icon)}>{icon}</div>

            <div className="flex-1 min-w-0">
              {/* Title */}
              <div className={clsx("text-sm font-medium mb-2", colors.text)}>
                {label}
              </div>

              {/* Content */}
              <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Summary messages are displayed as system/Claude messages with special styling
  if (isSummary) {
    return (
      <div className="flex flex-col gap-2 max-w-[95%] mx-auto items-center">
        {/* Summary header */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <span className="font-medium">Context Restored</span>
          <span>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* Summary content */}
        <div
          className={clsx(
            "w-full rounded-xl px-4 py-3 border-2 border-dashed",
            "border-[var(--accent-amber)]/40 bg-[var(--accent-amber)]/5",
          )}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              <svg
                className="w-5 h-5 text-[var(--accent-amber)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--accent-amber)] mb-2">
                Session Continued from Previous Context
              </div>
              <details className="group">
                <summary className="cursor-pointer text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] select-none">
                  <span className="group-open:hidden">Show summary...</span>
                  <span className="hidden group-open:inline">Hide summary</span>
                </summary>
                <div className="mt-2 text-xs text-[var(--text-secondary)] whitespace-pre-wrap max-h-96 overflow-y-auto">
                  <MarkdownContent content={message.content} />
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex flex-col gap-2 max-w-[85%]",
        isUser ? "ml-auto items-end" : "mr-auto items-start",
      )}
    >
      {/* Message header */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <span className="font-medium">{isUser ? "You" : "Claude"}</span>
        <span>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Message content */}
      {message.content && (
        <div
          className={clsx(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-[var(--accent-primary)] text-white"
              : "glass border border-[var(--border-subtle)]",
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
          ) : (
            <MarkdownContent content={message.content} />
          )}
        </div>
      )}

      {/* Tool calls - use collapsible group */}
      {hasToolCalls && <ToolCallGroup toolCalls={message.toolCalls!} />}

      {/* Approval card - only shown on last message when approval is needed */}
      {needsApproval && sessionId && projectPath && (
        <ApprovalCard
          command={message.approvalCommand || "Unknown command"}
          pattern={message.approvalPattern || "Unknown pattern"}
          sessionId={sessionId}
          projectPath={projectPath}
          onApproved={onApproved}
        />
      )}

      {/* Thinking indicator */}
      {message.thinking && (
        <details className="w-full">
          <summary className="cursor-pointer text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
            Show thinking...
          </summary>
          <div className="mt-2 p-3 rounded-lg bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] whitespace-pre-wrap max-h-40 overflow-y-auto">
            {message.thinking}
          </div>
        </details>
      )}
    </div>
  );
});
