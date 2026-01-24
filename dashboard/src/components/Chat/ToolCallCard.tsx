import { useState, memo } from "react";
import { clsx } from "clsx";
import type { ToolCall, TodoItem } from "../../types";

interface ToolCallCardProps {
  toolCall: ToolCall;
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

// Status icons for todo items
const todoStatusIcons = {
  pending: "○",
  in_progress: "◐",
  completed: "●",
};

const todoStatusColors = {
  pending: "text-[var(--text-tertiary)]",
  in_progress: "text-[var(--accent-amber)]",
  completed: "text-[var(--accent-emerald)]",
};

// Inline Todo List for TodoWrite tool calls
function InlineTodoList({ todos }: { todos: TodoItem[] }) {
  if (!todos || todos.length === 0) return null;

  const completedCount = todos.filter((t) => t.status === "completed").length;
  const inProgressItem = todos.find((t) => t.status === "in_progress");

  return (
    <div className="px-3 pb-3 pt-1">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent-emerald)] transition-all duration-300"
            style={{ width: `${(completedCount / todos.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">
          {completedCount}/{todos.length}
        </span>
      </div>

      {/* Current task */}
      {inProgressItem && (
        <div className="flex items-center gap-2 text-xs text-[var(--accent-amber)] mb-2">
          <span className="animate-pulse">◐</span>
          <span>{inProgressItem.activeForm}</span>
        </div>
      )}

      {/* Todo list */}
      <ul className="space-y-1">
        {todos.map((todo, index) => (
          <li
            key={index}
            className={clsx(
              "flex items-start gap-2 text-xs",
              todo.status === "completed" && "line-through opacity-60",
            )}
          >
            <span className={todoStatusColors[todo.status]}>
              {todoStatusIcons[todo.status]}
            </span>
            <span className="text-[var(--text-secondary)]">{todo.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Get a brief summary of the tool result for display in the header
function getResultSummary(
  toolName: string,
  result: string | undefined,
  input: Record<string, unknown>,
): string | null {
  if (!result) return null;

  // For file operations, show the file path
  if (toolName === "Read" && input.file_path) {
    const path = String(input.file_path);
    const fileName = path.split("/").pop() || path;
    return `Read ${fileName}`;
  }

  if (toolName === "Write" && input.file_path) {
    const path = String(input.file_path);
    const fileName = path.split("/").pop() || path;
    return `Wrote ${fileName}`;
  }

  if (toolName === "Edit" && input.file_path) {
    const path = String(input.file_path);
    const fileName = path.split("/").pop() || path;
    return `Edited ${fileName}`;
  }

  if (toolName === "Bash") {
    return "Command executed";
  }

  if (toolName === "Glob" || toolName === "Grep") {
    const matchCount = (result.match(/\n/g) || []).length;
    return `${matchCount} match${matchCount !== 1 ? "es" : ""}`;
  }

  if (toolName === "TodoWrite") {
    return "Todos updated";
  }

  // For other tools, show a truncated result
  if (result.includes("success") || result.includes("Success")) {
    return "Success";
  }

  if (result.includes("error") || result.includes("Error")) {
    return "Error";
  }

  // Default: truncate to first 30 chars
  return result.length > 30 ? result.slice(0, 30) + "..." : result;
}

// Memoized to prevent re-renders during typing in parent components
export const ToolCallCard = memo(function ToolCallCard({
  toolCall,
}: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const icon = toolIcons[toolCall.name] || "🔧";

  const statusColors = {
    pending: "text-[var(--text-tertiary)]",
    running: "text-[var(--accent-cyan)]",
    complete: "text-[var(--accent-emerald)]",
    error: "text-[var(--accent-rose)]",
  };

  const status = toolCall.status || "complete";

  // Check if this is a TodoWrite call with todos
  const isTodoWrite = toolCall.name === "TodoWrite";
  const todos =
    isTodoWrite && toolCall.input?.todos
      ? (toolCall.input.todos as TodoItem[])
      : null;

  // Get brief result summary for header
  const resultSummary = getResultSummary(
    toolCall.name,
    toolCall.result,
    toolCall.input,
  );

  return (
    <div className="glass rounded-xl border border-[var(--border-subtle)] overflow-hidden hover:border-[var(--border-default)] transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-all"
      >
        <span className="text-lg">{icon}</span>
        <span className="font-mono text-sm text-[var(--text-secondary)]">
          {toolCall.name}
        </span>

        {/* Result summary in header */}
        {resultSummary && status === "complete" && (
          <span className="text-xs text-[var(--text-tertiary)] truncate max-w-[150px]">
            → {resultSummary}
          </span>
        )}

        <span className={clsx("text-xs ml-auto", statusColors[status])}>
          {status === "running" ? "Running..." : status}
        </span>
        <svg
          className={clsx(
            "w-4 h-4 text-[var(--text-tertiary)] transition-transform",
            expanded && "rotate-180",
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

      {/* Inline todo list for TodoWrite */}
      {isTodoWrite && todos && todos.length > 0 && (
        <InlineTodoList todos={todos} />
      )}

      {expanded && (
        <div className="border-t border-[var(--border-subtle)] p-3 space-y-3 glass-subtle">
          {/* Input */}
          <div>
            <div className="text-xs text-[var(--text-tertiary)] mb-1">
              Input
            </div>
            <pre className="text-xs glass rounded-lg p-2 overflow-x-auto max-h-32 overflow-y-auto border border-[var(--border-subtle)]">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>

          {/* Result */}
          {toolCall.result && (
            <div>
              <div className="text-xs text-[var(--text-tertiary)] mb-1">
                Result
              </div>
              <pre className="text-xs glass rounded-lg p-2 overflow-x-auto max-h-32 overflow-y-auto text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                {toolCall.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
