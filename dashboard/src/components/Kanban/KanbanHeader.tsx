/**
 * KanbanHeader Component
 * Header for the Kanban board showing feature info and actions
 */

import type { Feature } from "../../types/kanban";

// =============================================================================
// TYPES
// =============================================================================

interface KanbanHeaderProps {
  feature: Feature | null;
  onRefresh?: () => void;
  loading?: boolean;
}

// =============================================================================
// ICONS
// =============================================================================

function IconRefresh({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      width="16"
      height="16"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function IconKanban({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      width="24"
      height="24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
  );
}

// =============================================================================
// FEATURE STATUS BADGE
// =============================================================================

function FeatureStatusBadge({ status }: { status: Feature["status"] }) {
  const statusMap: Record<
    Feature["status"],
    { label: string; className: string }
  > = {
    planning: { label: "Planning", className: "badge-info" },
    approved: { label: "Approved", className: "badge-info" },
    in_progress: { label: "In Progress", className: "badge-working" },
    qa: { label: "QA Review", className: "badge-process" },
    completed: { label: "Completed", className: "badge-idle" },
    archived: { label: "Archived", className: "" },
  };

  const config = statusMap[status] || statusMap.planning;

  return <span className={`badge ${config.className}`}>{config.label}</span>;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function KanbanHeader({
  feature,
  onRefresh,
  loading = false,
}: KanbanHeaderProps) {
  if (!feature) {
    return (
      <div className="kanban-header">
        <div className="kanban-header-left">
          <IconKanban className="kanban-header-icon" />
          <div>
            <h1 className="kanban-header-title">Kanban Board</h1>
            <p className="kanban-header-subtitle">
              Select a feature to view tasks
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kanban-header">
      <div className="kanban-header-left">
        <IconKanban className="kanban-header-icon" />
        <div>
          <div className="kanban-header-title-row">
            <h1 className="kanban-header-title">{feature.title}</h1>
            <FeatureStatusBadge status={feature.status} />
          </div>
          <p className="kanban-header-subtitle">
            {feature.id} - {feature.description}
          </p>
        </div>
      </div>

      <div className="kanban-header-right">
        {onRefresh && (
          <button
            className="btn btn-ghost"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh tasks"
          >
            <IconRefresh className={loading ? "animate-spin" : undefined} />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}
