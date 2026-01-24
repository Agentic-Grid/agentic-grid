import { clsx } from "clsx";
import type { Resource, ResourceType, TrustLevel } from "../../services/api";

const categoryColors: Record<string, string> = {
  development: "bg-blue-500",
  productivity: "bg-green-500",
  ai: "bg-purple-500",
  data: "bg-orange-500",
  testing: "bg-yellow-500",
  devops: "bg-red-500",
  design: "bg-pink-500",
  integration: "bg-indigo-500",
  other: "bg-gray-500",
};

const trustLevelBadges: Record<TrustLevel, { label: string; className: string }> = {
  high: { label: "Verified", className: "bg-green-500/20 text-green-400" },
  medium: { label: "Community", className: "bg-yellow-500/20 text-yellow-400" },
  low: { label: "Unverified", className: "bg-red-500/20 text-red-400" },
  unknown: { label: "Unknown", className: "bg-gray-500/20 text-gray-400" },
};

interface ResourceCardProps {
  resource: Resource;
  onEdit?: () => void;
  onDelete?: () => void;
  onInstall?: () => void;
  installing?: boolean;
}

export function ResourceCard({
  resource,
  onEdit,
  onDelete,
  onInstall,
  installing,
}: ResourceCardProps) {
  const trustBadge = trustLevelBadges[resource.trustLevel];

  return (
    <div className="glass rounded-xl p-4 flex flex-col gap-3 border border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:shadow-lg hover:-translate-y-0.5 transition-all group">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            "w-10 h-10 rounded-lg flex items-center justify-center text-white",
            categoryColors[resource.category] || categoryColors.other,
          )}
        >
          <TypeIcon type={resource.type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate">{resource.name}</h3>
            <span
              className={clsx(
                "text-xs px-1.5 py-0.5 rounded",
                trustBadge.className,
              )}
            >
              {trustBadge.label}
            </span>
          </div>
          <p className="text-sm text-[var(--text-tertiary)] line-clamp-2 mt-1">
            {resource.description}
          </p>
        </div>
      </div>

      {/* Tags */}
      {resource.tags && resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {resource.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            >
              {tag}
            </span>
          ))}
          {resource.tags.length > 3 && (
            <span className="text-xs text-[var(--text-tertiary)]">
              +{resource.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Warning */}
      {resource.warning && (
        <div className="text-xs text-yellow-400 bg-yellow-500/10 rounded px-2 py-1">
          {resource.warning}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "text-xs px-2 py-0.5 rounded-full capitalize",
              resource.installed
                ? "bg-[var(--accent-emerald)] bg-opacity-10 text-[var(--accent-emerald)]"
                : "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]",
            )}
          >
            {resource.type}
          </span>
          <span className="text-xs text-[var(--text-tertiary)] capitalize">
            {resource.category}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] transition-colors"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          {onInstall && (
            <button
              onClick={onInstall}
              disabled={installing}
              className={clsx(
                "px-3 py-1.5 text-sm rounded-xl transition-all",
                resource.installed
                  ? "text-[var(--text-tertiary)] cursor-default glass"
                  : "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-dim)] text-white shadow-[0_0_12px_var(--accent-primary-glow)] hover:shadow-[0_0_20px_var(--accent-primary-glow)]",
              )}
            >
              {installing ? "..." : resource.installed ? "Installed" : "Install"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TypeIcon({ type }: { type: ResourceType }) {
  switch (type) {
    case "skill":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "agent":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      );
    case "command":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "mcp":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      );
    case "plugin":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      );
    case "hook":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
    case "permission":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    default:
      return null;
  }
}
