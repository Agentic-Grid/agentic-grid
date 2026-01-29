import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { clsx } from "clsx";
import type { SessionDetail, ParsedMessage, SlashCommand } from "../../types";
import {
  sendMessage,
  killSession,
  resumeSession,
  deleteSession,
} from "../../services/api";
import { MessageBubble, ClaudeThinkingIndicator } from "../Chat";
import {
  useSessionStatus,
  useSessionStatuses,
} from "../../contexts/SessionStatusContext";
import { useSlashCommands } from "../../contexts/SlashCommandsContext";
import { useSessionStream } from "../../contexts/SessionStreamContext";
import { ConfirmDialog } from "../ConfirmDialog";

interface MiniSessionWindowProps {
  session: SessionDetail;
  sessionName?: string;
  onRename: (name: string) => void;
  onMaximize: () => void;
  onRefresh?: () => void;
  onDelete?: () => void;
  /** When provided, shows a minimize button instead of delete (used in floating mode) */
  onMinimize?: () => void;
  /** When provided, shows a float/dock toggle button */
  onFloat?: () => void;
  /** Whether the window is currently floating (affects icon shown) */
  isFloating?: boolean;
}

// Convert project path to folder format used in API
function getProjectFolder(projectPath: string): string {
  return projectPath.replace(/\//g, "-");
}

// Merge messages for display:
// 1. Merge consecutive assistant tool-only messages
// 2. Attach tool results to their preceding tool call messages
// 3. Filter out redundant/verbose tool results (file contents, etc.)
function mergeToolCallMessages(messages: ParsedMessage[]): ParsedMessage[] {
  const merged: ParsedMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // Tool result messages (isToolResult=true) should be merged into the preceding tool call
    if (msg.isToolResult) {
      const lastMerged = merged[merged.length - 1];
      // Attach to last message if it has tool calls
      if (
        lastMerged &&
        lastMerged.toolCalls &&
        lastMerged.toolCalls.length > 0
      ) {
        // Add the result content to the last tool call
        const lastToolCall =
          lastMerged.toolCalls[lastMerged.toolCalls.length - 1];
        if (!lastToolCall.result && msg.content) {
          // Truncate large results for display
          const maxLen = 500;
          lastToolCall.result =
            msg.content.length > maxLen
              ? msg.content.slice(0, maxLen) + "..."
              : msg.content;
        }
      }
      // Skip adding as separate message - it's been merged
      continue;
    }

    const lastMerged = merged[merged.length - 1];

    const isToolOnlyAssistant =
      msg.role === "assistant" &&
      !msg.content &&
      msg.toolCalls &&
      msg.toolCalls.length > 0;

    const lastIsToolOnlyAssistant =
      lastMerged &&
      lastMerged.role === "assistant" &&
      !lastMerged.content &&
      lastMerged.toolCalls &&
      lastMerged.toolCalls.length > 0;

    if (isToolOnlyAssistant && lastIsToolOnlyAssistant) {
      lastMerged.toolCalls = [
        ...(lastMerged.toolCalls || []),
        ...(msg.toolCalls || []),
      ];
    } else {
      merged.push({ ...msg, toolCalls: [...(msg.toolCalls || [])] });
    }
  }

  return merged;
}

// Mini command picker - compact version for mini window
// Memoized to prevent re-renders when parent input state changes
const MiniCommandPicker = memo(function MiniCommandPicker({
  commands,
  filter,
  onSelect,
  onClose,
  visible,
}: {
  commands: SlashCommand[];
  filter: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  visible: boolean;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter commands based on input - memoized
  const filteredCommands = useMemo(
    () =>
      commands.filter((cmd) =>
        cmd.name.toLowerCase().includes(filter.toLowerCase()),
      ),
    [commands, filter],
  );

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Scroll selected item into view
  useEffect(() => {
    if (containerRef.current && filteredCommands.length > 0) {
      const selectedElement = containerRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, filteredCommands.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredCommands.length - 1),
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, selectedIndex, filteredCommands, onSelect, onClose]);

  if (!visible || filteredCommands.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-1 max-h-40 overflow-y-auto rounded-lg command-picker-opaque z-50"
    >
      <div className="py-0.5">
        {filteredCommands.slice(0, 6).map((command, index) => (
          <button
            key={`${command.source}-${command.name}`}
            onClick={() => onSelect(command)}
            className={clsx(
              "w-full px-2 py-1.5 text-left flex items-center gap-2 transition-colors text-xs",
              index === selectedIndex
                ? "bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
            )}
          >
            <span className="font-mono font-medium text-[var(--accent-cyan)]">
              /{command.name}
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] truncate flex-1">
              {command.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

export function MiniSessionWindow({
  session,
  sessionName,
  onRename,
  onMaximize,
  onRefresh,
  onDelete,
  onMinimize,
  onFloat,
  isFloating,
}: MiniSessionWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [messages, setMessages] = useState<ParsedMessage[]>(session.messages);
  const seenMessageIds = useRef<Set<string>>(new Set());

  // Use shared session status from context (single source of truth)
  const { status: currentStatus } = useSessionStatus(session.id);
  const { refresh: refreshStatuses } = useSessionStatuses();

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Subscribe to live session updates via shared multiplexed SSE stream
  const { subscribe } = useSessionStream();

  // Use shared slash commands from context (loaded once per project)
  const { getProjectCommands, loadProjectCommands } = useSlashCommands();
  const projectFolder = getProjectFolder(session.projectPath);
  const commands = getProjectCommands(projectFolder);

  // Load commands once when component mounts (context handles deduplication)
  useEffect(() => {
    loadProjectCommands(projectFolder);
  }, [projectFolder, loadProjectCommands]);

  // Editable session name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(sessionName || "");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Message sending state
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const lastUserMessageTime = useRef<number>(0);

  // Auto-scroll tracking - only scroll when user is near bottom
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  const lastMessageCount = useRef(messages.length);

  // Command picker state
  const [showCommandPicker, setShowCommandPicker] = useState(false);
  const [commandFilter, setCommandFilter] = useState("");
  const [selectedCommand, setSelectedCommand] = useState<SlashCommand | null>(
    null,
  );
  // Separate state for command arguments to avoid circular updates
  const [commandArgs, setCommandArgs] = useState("");

  // Initialize seen message IDs from initial messages
  useEffect(() => {
    const ids = new Set(session.messages.map((m) => m.id));
    seenMessageIds.current = ids;
    setMessages(session.messages);
    // Scroll to bottom after messages are set
    requestAnimationFrame(() => {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }, [session.id, session.messages]);

  // Subscribe to live updates via shared multiplexed SSE stream
  // This uses a single connection for all sessions to avoid hitting browser connection limits
  useEffect(() => {
    const unsubscribe = subscribe(session.id, (data) => {
      if (data.type === "message" && data.message) {
        const msg = data.message;
        // Only add message if we haven't seen it before
        if (!seenMessageIds.current.has(msg.id)) {
          seenMessageIds.current.add(msg.id);
          setMessages((prev) => {
            // Also check for optimistic messages with temp- prefix that match this content
            // Remove the optimistic version if we're getting the real one
            const withoutOptimistic = prev.filter((m) => {
              if (m.id.startsWith("temp-") && m.role === msg.role) {
                // Same role and similar content = replace optimistic with real
                return m.content !== msg.content;
              }
              return true;
            });
            return [...withoutOptimistic, msg];
          });
        }
      }
    });

    return unsubscribe;
  }, [session.id, subscribe]);

  // Update isNearBottom when user scrolls
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const threshold = 50; // pixels from bottom
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottom.current = distanceFromBottom < threshold;
  }, []);

  // Scroll to bottom on initial mount
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      // Scroll to bottom immediately on mount to show last messages
      container.scrollTop = container.scrollHeight;
    }
  }, []); // Only run on mount

  // Scroll to bottom when new messages arrive AND user is near bottom
  useEffect(() => {
    // Only scroll if new messages were added
    if (messages.length > lastMessageCount.current && isNearBottom.current) {
      const container = messagesContainerRef.current;
      if (container) {
        // Use scrollTop instead of scrollIntoView to avoid scrolling the page
        container.scrollTop = container.scrollHeight;
      }
    }
    lastMessageCount.current = messages.length;
  }, [messages.length]);

  // Merge consecutive tool-only assistant messages
  const mergedMessages = useMemo(
    () => mergeToolCallMessages(messages),
    [messages],
  );

  // Update edited name when sessionName prop changes
  useEffect(() => {
    setEditedName(sessionName || "");
  }, [sessionName]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Track when we receive a new assistant message to clear waiting state
  useEffect(() => {
    if (isWaitingForResponse && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage.role === "assistant" &&
        new Date(lastMessage.timestamp).getTime() > lastUserMessageTime.current
      ) {
        setIsWaitingForResponse(false);
      }
    }
  }, [messages, isWaitingForResponse]);

  // Detect slash command input
  useEffect(() => {
    if (inputValue.startsWith("/") && !selectedCommand) {
      const filter = inputValue.slice(1).split(" ")[0];
      setCommandFilter(filter);
      setShowCommandPicker(true);
    } else if (!inputValue.startsWith("/")) {
      setShowCommandPicker(false);
      setCommandFilter("");
    }
  }, [inputValue, selectedCommand]);

  const displayName =
    sessionName ||
    session.firstPrompt?.slice(0, 30) ||
    `Session ${session.id.slice(0, 6)}`;

  const handleNameSubmit = () => {
    const trimmedName = editedName.trim();
    if (trimmedName !== sessionName) {
      onRename(trimmedName);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSubmit();
    } else if (e.key === "Escape") {
      setEditedName(sessionName || "");
      setIsEditingName(false);
    }
  };

  const handleKill = useCallback(async () => {
    try {
      await killSession(session.id, session.projectPath);
      setIsWaitingForResponse(false);
      // Trigger status refresh to pick up the stopped process
      setTimeout(() => refreshStatuses(), 500);
      onRefresh?.();
    } catch (err) {
      console.error("Failed to kill session:", err);
    }
  }, [session.id, session.projectPath, onRefresh, refreshStatuses]);

  const handleResume = useCallback(async () => {
    try {
      await resumeSession(session.id, session.projectPath);
      // Trigger status refresh to pick up the running process
      setTimeout(() => refreshStatuses(), 500);
      onRefresh?.();
    } catch (err) {
      console.error("Failed to resume session:", err);
    }
  }, [session.id, session.projectPath, onRefresh, refreshStatuses]);

  const handleDeleteSession = useCallback(async () => {
    setIsDeleting(true);
    try {
      const projectFolder = getProjectFolder(session.projectPath);
      await deleteSession(projectFolder, session.id);
      setShowDeleteConfirm(false);
      onDelete?.();
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setIsDeleting(false);
    }
  }, [session.id, session.projectPath, onDelete]);

  const handleSendMessage = useCallback(
    async (messageToSend?: string) => {
      // Build the full message: if we have a selected command, prepend it
      let fullMessage = messageToSend;
      if (!fullMessage) {
        if (selectedCommand) {
          const args = commandArgs.trim();
          fullMessage = args
            ? `/${selectedCommand.name} ${args}`
            : `/${selectedCommand.name}`;
        } else {
          fullMessage = inputValue;
        }
      }

      const trimmed = fullMessage.trim();
      if (!trimmed || isSending || currentStatus === "working") return;

      setIsSending(true);

      // Optimistically add user message
      const optimisticId = `temp-${Date.now()}`;
      const userMessage: ParsedMessage = {
        id: optimisticId,
        role: "user",
        timestamp: new Date().toISOString(),
        content: trimmed,
        toolCalls: [],
      };
      setMessages((prev) => [...prev, userMessage]);
      seenMessageIds.current.add(optimisticId);
      lastUserMessageTime.current = Date.now();
      setInputValue("");
      setCommandArgs("");
      setSelectedCommand(null);
      setShowCommandPicker(false);

      try {
        await sendMessage(session.id, session.projectPath, trimmed);
        setIsWaitingForResponse(true);
        // Trigger status refresh to pick up the running process
        setTimeout(() => refreshStatuses(), 500);
      } catch (err) {
        console.error("Failed to send message:", err);
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        seenMessageIds.current.delete(optimisticId);
        setInputValue(trimmed); // Restore input
      } finally {
        setIsSending(false);
      }
    },
    [
      inputValue,
      commandArgs,
      selectedCommand,
      isSending,
      currentStatus,
      session.id,
      session.projectPath,
      refreshStatuses,
    ],
  );

  const handleCommandSelect = useCallback(
    (command: SlashCommand) => {
      setShowCommandPicker(false);
      setSelectedCommand(command);
      setCommandArgs("");
      setInputValue("");

      if (command.hasArguments) {
        // Focus input for arguments
        inputRef.current?.focus();
      } else {
        // Send immediately for commands without arguments
        handleSendMessage(`/${command.name}`);
      }
    },
    [handleSendMessage],
  );

  const handleCloseCommandPicker = useCallback(() => {
    setShowCommandPicker(false);
  }, []);

  // Status dot classes (matches sidebar SessionStatusDot)
  const statusDotClasses = {
    working:
      "w-2 h-2 rounded-full flex-shrink-0 bg-[var(--accent-amber)] status-working",
    waiting: "w-2 h-2 rounded-full flex-shrink-0 bg-[var(--accent-emerald)]",
    "needs-approval":
      "w-2 h-2 rounded-full flex-shrink-0 bg-[var(--accent-rose)]",
    idle: "w-2 h-2 rounded-full flex-shrink-0 bg-[var(--text-tertiary)]",
  };

  // Status label classes (colored text)
  const statusLabelClasses = {
    working: "text-[10px] font-medium text-[var(--accent-amber)]",
    waiting: "text-[10px] font-medium text-[var(--accent-emerald)]",
    "needs-approval": "text-[10px] font-medium text-[var(--accent-emerald)]",
    idle: "text-[10px] font-medium text-[var(--text-tertiary)]",
  };

  // Get effective status considering local sending/waiting state
  const effectiveStatus =
    isWaitingForResponse || isSending ? "working" : currentStatus;

  // Status label text
  const statusLabel = {
    working: "Working",
    waiting: "Free",
    "needs-approval": "Free",
    idle: "Idle",
  };

  return (
    <div className="flex flex-col h-full rounded-2xl glass border border-[var(--border-subtle)] overflow-hidden transition-all duration-300 group/window relative window-glow">
      {/* Gradient border overlay */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover/window:opacity-100 transition-opacity duration-300" style={{ background: "linear-gradient(135deg, rgba(81, 112, 255, 0.2) 0%, transparent 50%, rgba(124, 14, 36, 0.15) 100%)", mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", padding: "1px" }} />

      {/* Header with subtle gradient and glass reflection */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border-subtle)] bg-gradient-to-r from-[var(--accent-primary)]/5 via-transparent to-[var(--color-wine-medium)]/3 relative z-10 window-header-glass">
        <span className={statusDotClasses[effectiveStatus]} />

        {/* Editable name */}
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyDown}
            placeholder="Session name..."
            className="flex-1 text-xs font-medium bg-transparent border-b border-[var(--accent-primary)] outline-none min-w-0"
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="flex-1 text-xs font-medium truncate text-left hover:text-[var(--accent-primary)] transition-colors"
            title="Click to edit name"
          >
            {displayName}
          </button>
        )}

        {/* Status label */}
        <span className={statusLabelClasses[effectiveStatus]}>
          {statusLabel[effectiveStatus]}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-1">
          {currentStatus === "working" || isWaitingForResponse || isSending ? (
            <button
              onClick={handleKill}
              className="p-1 rounded hover:bg-[var(--accent-rose)]/20 text-[var(--accent-rose)] transition-colors"
              title="Stop"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleResume}
              className="p-1 rounded hover:bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)] transition-colors"
              title="Resume"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}

          <button
            onClick={onMaximize}
            className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            title="Maximize"
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
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>

          {/* Float/Dock toggle button */}
          {onFloat && (
            <button
              onClick={onFloat}
              className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              title={isFloating ? "Dock window" : "Float window"}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isFloating ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                )}
              </svg>
            </button>
          )}

          {/* Show minimize button in floating mode, delete button otherwise */}
          {onMinimize ? (
            <button
              onClick={onMinimize}
              className="p-1 rounded hover:bg-[var(--accent-amber)]/20 text-[var(--text-tertiary)] hover:text-[var(--accent-amber)] transition-colors"
              title="Minimize"
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
                  d="M20 12H4"
                />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1 rounded hover:bg-[var(--accent-rose)]/20 text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] transition-colors"
              title="Delete session"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Session"
        message={`Are you sure you want to delete "${sessionName || session.firstPrompt?.slice(0, 30) || session.id.slice(0, 8)}"? This action cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteSession}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Messages - using same MessageBubble as session chat page */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10"
      >
        {mergedMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-[var(--text-tertiary)]">
            No messages yet
          </div>
        ) : (
          mergedMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onSendMessage={handleSendMessage}
            />
          ))
        )}

        {/* Thinking indicator - matches ChatView styling */}
        {(currentStatus === "working" || isWaitingForResponse || isSending) && (
          <ClaudeThinkingIndicator
            isSending={isSending}
            showStopButton
            onStop={handleKill}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - with premium styling */}
      <div className="border-t border-[var(--border-subtle)] p-3 bg-gradient-to-t from-[var(--glass-bg)] to-transparent relative z-10">
        <div className="relative flex flex-col gap-2">
          <MiniCommandPicker
            commands={commands}
            filter={commandFilter}
            onSelect={handleCommandSelect}
            onClose={handleCloseCommandPicker}
            visible={showCommandPicker}
          />

          {/* Command badge */}
          {selectedCommand && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 w-fit">
              <span className="font-mono text-xs text-[var(--accent-cyan)] font-medium">
                /{selectedCommand.name}
              </span>
              <button
                onClick={() => {
                  setCommandArgs("");
                  setSelectedCommand(null);
                }}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors hover:scale-110"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 input-glow-wrapper rounded-xl">
              <textarea
                ref={inputRef}
                value={selectedCommand ? commandArgs : inputValue}
                onChange={(e) => {
                  if (selectedCommand) {
                    setCommandArgs(e.target.value);
                  } else {
                    setInputValue(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  // Let CommandPicker handle navigation keys when visible
                  if (
                    showCommandPicker &&
                    ["ArrowUp", "ArrowDown", "Tab"].includes(e.key)
                  ) {
                    return;
                  }

                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }

                  // Clear selected command on backspace if args are empty
                  if (e.key === "Backspace" && selectedCommand && !commandArgs) {
                    e.preventDefault();
                    setSelectedCommand(null);
                  }

                  // Escape to cancel command
                  if (
                    e.key === "Escape" &&
                    (showCommandPicker || selectedCommand)
                  ) {
                    e.preventDefault();
                    setShowCommandPicker(false);
                    if (selectedCommand) {
                      setCommandArgs("");
                      setSelectedCommand(null);
                    }
                  }
                }}
                placeholder={
                  currentStatus === "working"
                    ? "Claude is working..."
                    : selectedCommand
                      ? "Enter arguments..."
                      : "Type a message or / for commands..."
                }
                disabled={currentStatus === "working" || isSending}
                rows={2}
                className={clsx(
                  "w-full px-3 py-2 rounded-xl text-sm bg-[var(--glass-bg)] border-0 outline-none disabled:opacity-50 resize-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)]",
                  selectedCommand && "pl-2",
                )}
              />
            </div>
            <button
              onClick={() => handleSendMessage()}
              disabled={
                currentStatus === "working" ||
                isSending ||
                (!inputValue.trim() && !selectedCommand)
              }
              className="px-3 py-2 rounded-xl text-sm btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed self-end transition-all hover:shadow-[0_0_20px_var(--accent-primary-glow)]"
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
