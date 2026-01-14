import { clsx } from "clsx";
import type { TodoItem } from "../../types";

interface TodoListProps {
  todos: TodoItem[];
}

const statusIcons = {
  pending: "○",
  in_progress: "◐",
  completed: "●",
};

const statusColors = {
  pending: "text-[var(--text-tertiary)]",
  in_progress: "text-[var(--accent-amber)]",
  completed: "text-[var(--accent-emerald)]",
};

export function TodoList({ todos }: TodoListProps) {
  if (!todos || todos.length === 0) {
    return null;
  }

  const completedCount = todos.filter((t) => t.status === "completed").length;
  const inProgressItem = todos.find((t) => t.status === "in_progress");

  return (
    <div className="glass border border-[var(--border-subtle)] rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">
          Progress
        </h3>
        <span className="text-xs text-[var(--text-tertiary)]">
          {completedCount}/{todos.length} completed
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full mb-3 overflow-hidden">
        <div
          className="h-full bg-[var(--accent-emerald)] transition-all duration-300"
          style={{ width: `${(completedCount / todos.length) * 100}%` }}
        />
      </div>

      {/* Current task */}
      {inProgressItem && (
        <div className="flex items-center gap-2 text-sm text-[var(--accent-amber)] mb-3">
          <span className="animate-pulse">◐</span>
          <span>{inProgressItem.activeForm}</span>
        </div>
      )}

      {/* Todo list */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
          Show all tasks
        </summary>
        <ul className="mt-2 space-y-1.5">
          {todos.map((todo, index) => (
            <li
              key={index}
              className={clsx(
                "flex items-start gap-2 text-xs",
                todo.status === "completed" && "line-through opacity-60",
              )}
            >
              <span className={statusColors[todo.status]}>
                {statusIcons[todo.status]}
              </span>
              <span className="text-[var(--text-secondary)]">
                {todo.content}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
