import { useEffect, useState, useRef } from "react";
import { clsx } from "clsx";
import { getSessionDetail } from "../../services/api";
import type { ParsedMessage } from "../../types";

interface PlanGenerationProgressProps {
  progress: number;
  currentStep: string;
  sessionId: string | null;
  projectName: string;
}

const GENERATION_STEPS = [
  { id: "fork", label: "Forking base-project repository" },
  { id: "structure", label: "Creating project structure" },
  { id: "prd", label: "Generating PRD from requirements" },
  { id: "features", label: "Breaking down into features" },
  { id: "tasks", label: "Creating task definitions" },
  { id: "deps", label: "Calculating dependencies" },
];

function StepIndicator({
  step,
  status,
}: {
  step: { id: string; label: string };
  status: "pending" | "in-progress" | "complete";
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={clsx(
          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
          status === "complete" && "bg-[var(--accent-emerald)]",
          status === "in-progress" &&
            "bg-[var(--accent-primary)] animate-pulse",
          status === "pending" &&
            "bg-[var(--bg-hover)] border border-[var(--border-subtle)]",
        )}
      >
        {status === "complete" ? (
          <svg
            className="w-3.5 h-3.5 text-white"
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
        ) : status === "in-progress" ? (
          <svg
            className="w-3.5 h-3.5 text-white animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
        )}
      </div>
      <span
        className={clsx(
          "text-sm transition-colors",
          status === "complete" && "text-[var(--accent-emerald)]",
          status === "in-progress" && "text-[var(--text-primary)] font-medium",
          status === "pending" && "text-[var(--text-muted)]",
        )}
      >
        {step.label}
      </span>
    </div>
  );
}

function MiniSessionWindow({
  sessionId,
  projectName,
}: {
  sessionId: string;
  projectName: string;
}) {
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll for messages
  useEffect(() => {
    let isMounted = true;

    const fetchMessages = async () => {
      try {
        const result = await getSessionDetail(projectName, sessionId);
        if (isMounted && result.data?.messages) {
          setMessages(result.data.messages);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch session",
          );
        }
      }
    };

    // Initial fetch
    fetchMessages();

    // Poll every 2 seconds
    const interval = setInterval(fetchMessages, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, projectName]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Get abbreviated content
  const getMessagePreview = (msg: ParsedMessage) => {
    // Skip system context messages and tool results
    if (msg.isSystemContext || msg.isToolResult) return null;

    let content = msg.content || "";

    // Truncate long messages
    if (content.length > 200) {
      content = content.substring(0, 200) + "...";
    }

    return content;
  };

  // Filter and process messages for display
  const displayMessages = messages
    .map((msg) => ({
      ...msg,
      preview: getMessagePreview(msg),
    }))
    .filter((msg) => msg.preview);

  return (
    <div className="w-full max-w-[500px] mt-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-[var(--accent-emerald)] animate-pulse" />
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Claude Session Live
        </span>
      </div>
      <div
        ref={scrollRef}
        className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-4 max-h-[200px] overflow-y-auto"
      >
        {error ? (
          <div className="text-xs text-[var(--text-muted)] text-center py-4">
            Waiting for session to start...
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[var(--text-muted)]">
              Waiting for Claude to start...
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {displayMessages.slice(-10).map((msg) => (
              <div
                key={msg.id}
                className={clsx(
                  "text-xs",
                  msg.role === "assistant"
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] bg-[var(--bg-hover)] p-2 rounded",
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {msg.role === "assistant" ? (
                    <span className="font-semibold text-[var(--accent-primary)]">
                      Claude
                    </span>
                  ) : (
                    <span className="font-semibold text-[var(--text-tertiary)]">
                      System
                    </span>
                  )}
                  <span className="text-[var(--text-muted)] text-[10px]">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap break-words">
                  {msg.preview}
                </p>
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {msg.toolCalls.slice(0, 3).map((tool, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[var(--bg-hover)] rounded text-[10px] text-[var(--text-tertiary)]"
                      >
                        <svg
                          className="w-2.5 h-2.5"
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
                        {tool.name}
                      </span>
                    ))}
                    {msg.toolCalls.length > 3 && (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        +{msg.toolCalls.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PlanGenerationProgress({
  progress,
  currentStep,
  sessionId,
  projectName,
}: PlanGenerationProgressProps) {
  const currentStepIndex = GENERATION_STEPS.findIndex(
    (s) => s.label === currentStep,
  );

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      {/* Spinner */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full border-4 border-[var(--bg-hover)]">
          <div
            className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-[var(--accent-primary)] animate-spin"
            style={{ animationDuration: "1s" }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-[var(--accent-primary)]">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        Generating Your Project Plan
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Claude is analyzing your requirements and creating features...
      </p>

      {/* Progress bar */}
      <div className="w-[300px] h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step list */}
      <div className="space-y-3 text-left mb-4">
        {GENERATION_STEPS.map((step, index) => {
          let status: "pending" | "in-progress" | "complete" = "pending";
          if (index < currentStepIndex) {
            status = "complete";
          } else if (index === currentStepIndex) {
            status = "in-progress";
          }
          return <StepIndicator key={step.id} step={step} status={status} />;
        })}
      </div>

      {/* Current status */}
      <p className="text-xs font-mono text-[var(--text-muted)] mb-2">
        {currentStep}...
      </p>

      {/* Mini Session Window */}
      {sessionId && (
        <MiniSessionWindow sessionId={sessionId} projectName={projectName} />
      )}
    </div>
  );
}
