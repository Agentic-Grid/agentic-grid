/**
 * KanbanHeader Component
 * Header for the Kanban board showing feature info and actions
 */

import { useState } from "react";
import type { Feature } from "../../types/kanban";
import type { ExecuteParallelOptions } from "../../services/api";

// =============================================================================
// TYPES
// =============================================================================

interface KanbanHeaderProps {
  feature: Feature | null;
  onRefresh?: () => void;
  onExecuteAll?: (featureId: string, options?: ExecuteParallelOptions) => void;
  loading?: boolean;
  executing?: boolean;
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

function IconPlay({ className }: { className?: string }) {
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
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function IconSpinner({ className }: { className?: string }) {
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
  onExecuteAll,
  loading = false,
  executing = false,
}: KanbanHeaderProps) {
  const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);

  const handleExecuteAll = async () => {
    if (!feature || !onExecuteAll) return;

    setExecuteError(null);
    setShowExecuteConfirm(false);

    try {
      await onExecuteAll(feature.id, { automate: true });
    } catch (err) {
      setExecuteError(err instanceof Error ? err.message : "Failed to execute");
    }
  };

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
          {executeError && (
            <p className="text-sm text-[var(--accent-rose)] mt-1">
              {executeError}
            </p>
          )}
        </div>
      </div>

      <div className="kanban-header-right">
        {/* Execute All Button */}
        {onExecuteAll && feature.status !== "completed" && (
          <div className="relative">
            {showExecuteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-secondary)]">
                  Execute all pending tasks?
                </span>
                <button
                  className="btn btn-sm"
                  style={{
                    backgroundColor: "var(--accent-emerald)",
                    color: "white",
                  }}
                  onClick={handleExecuteAll}
                  disabled={executing}
                >
                  {executing ? (
                    <>
                      <IconSpinner className="animate-spin" />
                      Running...
                    </>
                  ) : (
                    "Confirm"
                  )}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setShowExecuteConfirm(false)}
                  disabled={executing}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="btn"
                style={{
                  backgroundColor: "var(--accent-primary)",
                  color: "white",
                }}
                onClick={() => setShowExecuteConfirm(true)}
                disabled={executing || loading}
                aria-label="Execute all tasks"
              >
                {executing ? (
                  <>
                    <IconSpinner className="animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <IconPlay />
                    Execute All
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Refresh Button */}
        {onRefresh && (
          <button
            className="btn btn-ghost"
            onClick={onRefresh}
            disabled={loading || executing}
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
