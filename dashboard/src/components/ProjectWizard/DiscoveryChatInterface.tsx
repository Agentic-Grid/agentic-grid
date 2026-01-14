import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import type { DiscoveryMessage } from "../../types/wizard";

interface DiscoveryChatInterfaceProps {
  messages: DiscoveryMessage[];
  onSendMessage: (content: string) => void;
  onGeneratePlan: () => void;
  canGeneratePlan: boolean;
}

function ChatMessage({ message }: { message: DiscoveryMessage }) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={clsx(
        "flex gap-3",
        isAssistant ? "justify-start" : "justify-end",
      )}
    >
      {isAssistant && (
        <div className="w-7 h-7 rounded-full bg-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 text-white"
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
        </div>
      )}
      <div
        className={clsx(
          "max-w-[80%] px-4 py-3 text-sm leading-relaxed",
          isAssistant
            ? "bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] rounded-bl-[4px] text-[var(--text-primary)]"
            : "bg-[rgba(99,102,241,0.15)] border border-[rgba(99,102,241,0.3)] rounded-[var(--radius-lg)] rounded-br-[4px] text-[var(--text-primary)]",
        )}
      >
        {message.content}
      </div>
      {!isAssistant && (
        <div className="w-7 h-7 rounded-full bg-[var(--accent-violet)] flex items-center justify-center flex-shrink-0">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

function QuickPickButtons({
  picks,
  onSelect,
}: {
  picks: string[];
  onSelect: (pick: string) => void;
}) {
  if (picks.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {picks.map((pick) => (
        <button
          key={pick}
          onClick={() => onSelect(pick)}
          className="px-3 py-2 text-xs font-medium rounded-full bg-[var(--bg-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] whitespace-nowrap transition-all hover:bg-[var(--accent-primary-glow)] hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
        >
          {pick}
        </button>
      ))}
    </div>
  );
}

function ProgressIndicator({ messages }: { messages: DiscoveryMessage[] }) {
  const userMessages = messages.filter((m) => m.role === "user").length;
  const stages = [
    { name: "Requirements", minMessages: 0 },
    { name: "Features", minMessages: 2 },
    { name: "Tasks", minMessages: 4 },
  ];

  const currentStage = stages.findIndex((_s, i) => {
    const next = stages[i + 1];
    return !next || userMessages < next.minMessages;
  });

  return (
    <div className="flex items-center gap-2">
      {stages.map((stage, index) => (
        <div key={stage.name} className="flex items-center gap-2">
          <div
            className={clsx(
              "flex items-center gap-1.5 text-xs font-medium transition-colors",
              index <= currentStage
                ? "text-[var(--accent-primary)]"
                : "text-[var(--text-muted)]",
            )}
          >
            <div
              className={clsx(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold",
                index < currentStage
                  ? "bg-[var(--accent-emerald)] text-white"
                  : index === currentStage
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--bg-hover)] text-[var(--text-muted)]",
              )}
            >
              {index < currentStage ? (
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span>{stage.name}</span>
          </div>
          {index < stages.length - 1 && (
            <div
              className={clsx(
                "w-8 h-0.5 rounded",
                index < currentStage
                  ? "bg-[var(--accent-emerald)]"
                  : "bg-[var(--border-subtle)]",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function DiscoveryChatInterface({
  messages,
  onSendMessage,
  onGeneratePlan,
  canGeneratePlan,
}: DiscoveryChatInterfaceProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const lastMessage = messages[messages.length - 1];
  const quickPicks =
    lastMessage?.role === "assistant" ? lastMessage.quickPicks || [] : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleQuickPick = (pick: string) => {
    onSendMessage(pick);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with progress */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-[var(--accent-rose)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Discovery
          </span>
        </div>
        <ProgressIndicator messages={messages} />
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick picks */}
      {quickPicks.length > 0 && (
        <div className="px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <QuickPickButtons picks={quickPicks} onSelect={handleQuickPick} />
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-[var(--border-subtle)]">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer or select from suggestions above..."
              className="w-full px-4 py-3 pr-12 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--accent-primary-glow)]"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-[var(--radius-md)] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          {canGeneratePlan && (
            <button
              type="button"
              onClick={onGeneratePlan}
              className="px-4 py-2 rounded-[var(--radius-lg)] bg-[var(--accent-primary)] text-white text-sm font-medium hover:bg-[var(--accent-primary-dim)] transition-colors shadow-[0_0_20px_var(--accent-primary-glow)]"
            >
              Generate Plan
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
