/**
 * KanbanView Component
 * Full-page view wrapper for the Kanban board
 */

import { KanbanProvider } from "../../contexts/KanbanContext";
import { KanbanBoard } from "./KanbanBoard";

export function KanbanView() {
  return (
    <div className="h-full overflow-hidden flex flex-col">
      <div className="px-8 py-6 border-b border-[var(--border-subtle)]">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Kanban Board
        </h1>
        <p className="text-sm text-[var(--text-tertiary)]">
          Manage feature development tasks
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanProvider>
          <KanbanBoard />
        </KanbanProvider>
      </div>
    </div>
  );
}
