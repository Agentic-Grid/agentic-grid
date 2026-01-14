import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import type { SessionDetail, ParsedMessage } from "../../types";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import {
  subscribeToSession,
  sendMessage,
  deleteSession,
} from "../../services/api";
import {
  useSessionStatus,
  useSessionStatuses,
} from "../../contexts/SessionStatusContext";
import { useSlashCommands } from "../../contexts/SlashCommandsContext";
import { ConfirmDialog } from "../ConfirmDialog";

const MESSAGES_PER_PAGE = 10;

interface ChatViewProps {
  session: SessionDetail;
  onBack: () => void;
  sessionName?: string;
  onRename: (name: string) => void;
  onKill: () => void;
  onDelete?: () => void;
  hideHeader?: boolean;
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

    // Check if this is a tool-only assistant message (no text content)
    const isToolOnlyAssistant =
      msg.role === "assistant" &&
      !msg.content &&
      msg.toolCalls &&
      msg.toolCalls.length > 0;

    // Check if the last merged message is also a tool-only assistant message
    const lastIsToolOnlyAssistant =
      lastMerged &&
      lastMerged.role === "assistant" &&
      !lastMerged.content &&
      lastMerged.toolCalls &&
      lastMerged.toolCalls.length > 0;

    if (isToolOnlyAssistant && lastIsToolOnlyAssistant) {
      // Merge tool calls into the last message
      lastMerged.toolCalls = [
        ...(lastMerged.toolCalls || []),
        ...(msg.toolCalls || []),
      ];
    } else {
      // Add as new message
      merged.push({ ...msg, toolCalls: [...(msg.toolCalls || [])] });
    }
  }

  return merged;
}

export function ChatView({
  session,
  onBack,
  sessionName,
  onRename,
  onKill,
  onDelete,
  hideHeader = false,
}: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ParsedMessage[]>(session.messages);
  const [isConnected, setIsConnected] = useState(false);
  const seenMessageIds = useRef<Set<string>>(new Set());

  // Use shared session status from context (single source of truth)
  const { status: currentStatus } = useSessionStatus(session.id);
  const { refresh: refreshStatuses } = useSessionStatuses();

  // Pagination state - how many messages to display (from the end)
  const [displayedCount, setDisplayedCount] = useState(MESSAGES_PER_PAGE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const previousScrollHeight = useRef<number>(0);

  // Editable session name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(sessionName || "");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Initialize seen message IDs from initial messages
  useEffect(() => {
    const ids = new Set(session.messages.map((m) => m.id));
    seenMessageIds.current = ids;
    setMessages(session.messages);
  }, [session.id, session.messages]);

  // Subscribe to real-time session updates (messages only - status comes from shared context)
  useEffect(() => {
    const projectFolder = getProjectFolder(session.projectPath);

    const unsubscribe = subscribeToSession(
      projectFolder,
      session.id,
      (data) => {
        if (data.type === "connected") {
          setIsConnected(true);
        } else if (data.type === "message" && data.message) {
          // Only add if we haven't seen this message
          if (!seenMessageIds.current.has(data.message.id)) {
            seenMessageIds.current.add(data.message.id);
            setMessages((prev) => [...prev, data.message!]);
          }
        }
        // Note: Status updates now come from SessionStatusContext (shared batch polling)
      },
    );

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [session.id, session.projectPath]);

  // Status polling is now handled by SessionStatusContext (single batch call for all sessions)

  // Track if user is near bottom to auto-scroll on new messages
  const isNearBottom = useRef(true);
  const lastMessageCount = useRef(messages.length);

  // Update isNearBottom when user scrolls
  const updateIsNearBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const threshold = 100; // pixels from bottom
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottom.current = distanceFromBottom < threshold;
  }, []);

  // Scroll to bottom only when new messages arrive AND user is near bottom
  useEffect(() => {
    // Only scroll if new messages were added (not removed/filtered)
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

  // Calculate which messages to display (paginated from end)
  const displayedMessages = useMemo(() => {
    const total = mergedMessages.length;
    const startIndex = Math.max(0, total - displayedCount);
    return mergedMessages.slice(startIndex);
  }, [mergedMessages, displayedCount]);

  const hasMoreMessages = displayedCount < mergedMessages.length;

  // Load more messages when scrolling to top, and track scroll position
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Update whether user is near bottom (for auto-scroll behavior)
    updateIsNearBottom();

    // Don't process load-more if already loading or no more messages
    if (isLoadingMore || !hasMoreMessages) return;

    // Check if scrolled near the top (within 50px)
    if (container.scrollTop < 50) {
      setIsLoadingMore(true);
      // Store current scroll height before adding more messages
      previousScrollHeight.current = container.scrollHeight;

      // Use timeout to simulate loading and allow UI to update smoothly
      setTimeout(() => {
        setDisplayedCount((prev) =>
          Math.min(prev + MESSAGES_PER_PAGE, mergedMessages.length),
        );
        setIsLoadingMore(false);
      }, 100);
    }
  }, [
    isLoadingMore,
    hasMoreMessages,
    mergedMessages.length,
    updateIsNearBottom,
  ]);

  // Maintain scroll position after loading more messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container && previousScrollHeight.current > 0) {
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - previousScrollHeight.current;
      container.scrollTop = scrollDiff;
      previousScrollHeight.current = 0;
    }
  }, [displayedMessages]);

  // Reset displayed count when session changes
  useEffect(() => {
    setDisplayedCount(MESSAGES_PER_PAGE);
  }, [session.id]);

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

  const displayName =
    sessionName ||
    session.firstPrompt?.slice(0, 50) ||
    `Session ${session.id.slice(0, 8)}`;

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

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(session.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  };

  // Status dot classes (matches sidebar SessionStatusDot)
  const statusDotClasses = {
    working: "w-2 h-2 rounded-full bg-[var(--accent-amber)] status-working",
    waiting: "w-2 h-2 rounded-full bg-[var(--accent-emerald)]",
    "needs-approval": "w-2 h-2 rounded-full bg-[var(--accent-rose)]",
    idle: "w-2 h-2 rounded-full bg-[var(--text-tertiary)]",
  };

  // Status label classes (colored text)
  const statusLabelClasses = {
    working: "text-xs font-medium text-[var(--accent-amber)]",
    waiting: "text-xs font-medium text-[var(--accent-emerald)]",
    "needs-approval": "text-xs font-medium text-[var(--accent-emerald)]",
    idle: "text-xs font-medium text-[var(--text-tertiary)]",
  };

  const [isSending, setIsSending] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const lastUserMessageTime = useRef<number>(0);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use shared slash commands from context (loaded once per project)
  const { getProjectCommands, loadProjectCommands } = useSlashCommands();
  const projectFolder = getProjectFolder(session.projectPath);
  const commands = getProjectCommands(projectFolder);

  // Load commands once when component mounts (context handles deduplication)
  useEffect(() => {
    loadProjectCommands(projectFolder);
  }, [projectFolder, loadProjectCommands]);

  // Track when we receive a new assistant message to clear waiting state
  useEffect(() => {
    if (isWaitingForResponse && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // If we got an assistant message after our last user message, stop waiting
      if (
        lastMessage.role === "assistant" &&
        new Date(lastMessage.timestamp).getTime() > lastUserMessageTime.current
      ) {
        setIsWaitingForResponse(false);
      }
    }
  }, [messages, isWaitingForResponse]);

  const handleSendMessage = async (messageContent: string) => {
    setIsSending(true);
    setSendError(null);

    // Optimistically add user message to UI
    const optimisticId = `temp-${Date.now()}`;
    const userMessage: ParsedMessage = {
      id: optimisticId,
      role: "user",
      timestamp: new Date().toISOString(),
      content: messageContent,
      toolCalls: [],
    };
    setMessages((prev) => [...prev, userMessage]);
    seenMessageIds.current.add(optimisticId);
    lastUserMessageTime.current = Date.now();

    try {
      await sendMessage(session.id, session.projectPath, messageContent);
      // Message sent - Claude will process it and the SSE stream will update
      // Trigger a status refresh after a short delay to pick up the running process
      setIsWaitingForResponse(true);
      setTimeout(() => refreshStatuses(), 500);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      setSendError(errorMessage);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      seenMessageIds.current.delete(optimisticId);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteSession = async () => {
    setIsDeleting(true);
    try {
      await deleteSession(projectFolder, session.id);
      setShowDeleteConfirm(false);
      onDelete?.();
    } catch (err) {
      console.error("Failed to delete session:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header - conditionally hidden when embedded in a window container */}
      {!hideHeader && (
        <div className="flex items-center gap-4 px-6 py-4 border-b border-[var(--border-subtle)]">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <svg
              className="w-5 h-5 text-[var(--text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={statusDotClasses[currentStatus]} />
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyDown={handleNameKeyDown}
                  placeholder="Enter session name..."
                  className="font-semibold bg-transparent border-b border-[var(--accent-primary)] outline-none px-1 py-0.5 min-w-[200px]"
                />
              ) : (
                <h2
                  className="font-semibold truncate cursor-pointer hover:text-[var(--accent-primary)] transition-colors"
                  onClick={() => setIsEditingName(true)}
                  title="Click to edit session name"
                >
                  {displayName}
                </h2>
              )}
              <span className={statusLabelClasses[currentStatus]}>
                {currentStatus === "working"
                  ? "Working"
                  : currentStatus === "waiting" ||
                      currentStatus === "needs-approval"
                    ? "Free"
                    : "Idle"}
              </span>
              {isConnected && (
                <span className="text-xs text-[var(--accent-emerald)]">
                  [Connected]
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <button
                onClick={handleCopyId}
                className="font-mono hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1"
                title="Click to copy session ID"
              >
                {session.id.slice(0, 8)}...
                {copiedId ? (
                  <svg
                    className="w-3 h-3 text-[var(--accent-emerald)]"
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
                ) : (
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
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
              <span>•</span>
              <span>{session.projectName}</span>
              <span>•</span>
              <span>{messages.length} messages</span>
              <span>•</span>
              <span>{session.toolCallCount} tools</span>
            </div>
          </div>

          {/* Delete button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-lg hover:bg-[var(--accent-rose)]/20 text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] transition-colors"
            title="Delete session"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      )}

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

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        {mergedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-medium mb-2">No messages yet</h3>
            <p className="text-sm text-[var(--text-tertiary)]">
              Start a conversation by sending a message below
            </p>
          </div>
        ) : (
          <>
            {/* Load more indicator */}
            {hasMoreMessages && (
              <div className="flex justify-center py-2">
                {isLoadingMore ? (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-tertiary)]">
                    <div
                      className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                      style={{
                        borderColor: "var(--accent-primary)",
                        borderTopColor: "transparent",
                      }}
                    />
                    Loading older messages...
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setDisplayedCount((prev) =>
                        Math.min(
                          prev + MESSAGES_PER_PAGE,
                          mergedMessages.length,
                        ),
                      );
                    }}
                    className="text-sm text-[var(--accent-primary)] hover:underline"
                  >
                    Load{" "}
                    {Math.min(
                      MESSAGES_PER_PAGE,
                      mergedMessages.length - displayedCount,
                    )}{" "}
                    older messages
                  </button>
                )}
              </div>
            )}

            {/* Display paginated messages */}
            {displayedMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </>
        )}

        {/* Thinking indicator - shows when Claude process is running */}
        {currentStatus === "working" && (
          <div className="flex flex-col gap-2 max-w-[85%] mr-auto items-start">
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              <span className="font-medium">Claude</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3 glass border border-[var(--border-subtle)]">
              <div className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full bg-[var(--accent-amber)] animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-[var(--accent-amber)] animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-[var(--accent-amber)] animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
              <span className="text-sm text-[var(--text-secondary)] animate-blink">
                Thinking...
              </span>
              <button
                onClick={onKill}
                className="ml-2 px-3 py-1 text-xs font-medium rounded-lg bg-[var(--accent-rose)]/20 text-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/40 border border-[var(--accent-rose)]/30 transition-colors flex items-center gap-1.5"
                title="Stop Claude"
              >
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
                Stop
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--border-subtle)]">
        {sendError && (
          <div className="mb-2 p-2 rounded-lg bg-[var(--accent-rose)] bg-opacity-10 text-[var(--accent-rose)] text-sm">
            {sendError}
          </div>
        )}
        <ChatInput
          onSend={handleSendMessage}
          disabled={currentStatus === "working" || isSending}
          placeholder={
            isSending
              ? "Sending..."
              : currentStatus === "working"
                ? "Claude is working..."
                : "Type a message..."
          }
          commands={commands}
        />
      </div>
    </div>
  );
}
