import { useState, useEffect } from "react";
import { clsx } from "clsx";
import {
  getMarketplaceResources,
  installResource,
  type MarketplaceEntry,
  type ResourceType,
  type ResourceCategory,
  type TrustLevel,
} from "../../services/api";
import { InstallModal } from "./InstallModal";

const typeFilters: Array<{ value: ResourceType | "all"; label: string }> = [
  { value: "all", label: "All Types" },
  { value: "skill", label: "Skills" },
  { value: "agent", label: "Agents" },
  { value: "command", label: "Commands" },
  { value: "mcp", label: "MCP Servers" },
  { value: "plugin", label: "Plugins" },
];

const categoryFilters: Array<{ value: ResourceCategory | "all"; label: string }> = [
  { value: "all", label: "All Categories" },
  { value: "development", label: "Development" },
  { value: "productivity", label: "Productivity" },
  { value: "ai", label: "AI & ML" },
  { value: "data", label: "Data" },
  { value: "testing", label: "Testing" },
  { value: "devops", label: "DevOps" },
  { value: "integration", label: "Integration" },
];

const trustFilters: Array<{ value: TrustLevel | "all"; label: string }> = [
  { value: "all", label: "All Trust Levels" },
  { value: "high", label: "Verified" },
  { value: "medium", label: "Community" },
];

export function BrowseTab() {
  const [resources, setResources] = useState<MarketplaceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<ResourceType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | "all">("all");
  const [trustFilter, setTrustFilter] = useState<TrustLevel | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [installing, setInstalling] = useState<MarketplaceEntry | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
  }, [typeFilter, categoryFilter, trustFilter, searchQuery]);

  async function loadResources() {
    try {
      setLoading(true);
      const response = await getMarketplaceResources({
        type: typeFilter === "all" ? undefined : typeFilter,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        trustLevel: trustFilter === "all" ? undefined : trustFilter,
        search: searchQuery || undefined,
      });
      setResources(response.data.resources);
    } catch (err) {
      console.error("Failed to load marketplace:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInstall(resource: MarketplaceEntry, config?: Record<string, string>) {
    try {
      setInstallingId(resource.id);
      await installResource(resource.id, config);
      await loadResources();
      alert(`${resource.name} installed successfully! Restart Claude Code to apply MCP changes.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to install";
      alert(message);
    } finally {
      setInstallingId(null);
      setInstalling(null);
    }
  }

  function handleInstallClick(resource: MarketplaceEntry) {
    if (resource.requiresConfig && resource.configSchema) {
      setInstalling(resource);
    } else {
      handleInstall(resource);
    }
  }

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search resources..."
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]"
          />
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ResourceType | "all")}
          className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]"
        >
          {typeFilters.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as ResourceCategory | "all")}
          className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]"
        >
          {categoryFilters.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Trust Filter */}
        <select
          value={trustFilter}
          onChange={(e) => setTrustFilter(e.target.value as TrustLevel | "all")}
          className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]"
        >
          {trustFilters.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Security Warning */}
      <div className="mb-6 p-4 glass border border-[var(--accent-amber)]/30 rounded-xl shadow-[0_0_15px_var(--accent-amber-glow)]">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-yellow-400">Security Notice</h4>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              MCP servers and plugins run locally with system access. Only install resources from trusted sources.
              Community resources are marked with a warning. Review the source code before installing.
            </p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="loading-pulse">Loading marketplace...</div>
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          <p>No resources found matching your filters</p>
        </div>
      ) : (
        <>
          {/* Results count */}
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            {resources.length} resource{resources.length !== 1 ? "s" : ""} available
          </p>

          {/* Resources Grid */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <MarketplaceCard
                key={resource.id}
                resource={resource}
                onInstall={() => handleInstallClick(resource)}
                installing={installingId === resource.id}
              />
            ))}
          </div>
        </>
      )}

      {/* Install Modal (for resources requiring config) */}
      {installing && (
        <InstallModal
          resource={installing}
          onClose={() => setInstalling(null)}
          onInstall={(config) => handleInstall(installing, config)}
        />
      )}
    </div>
  );
}

interface MarketplaceCardProps {
  resource: MarketplaceEntry;
  onInstall: () => void;
  installing: boolean;
}

function MarketplaceCard({ resource, onInstall, installing }: MarketplaceCardProps) {
  const trustColors: Record<TrustLevel, string> = {
    high: "bg-green-500/20 text-green-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    low: "bg-red-500/20 text-red-400",
    unknown: "bg-gray-500/20 text-gray-400",
  };

  const trustLabels: Record<TrustLevel, string> = {
    high: "Verified",
    medium: "Community",
    low: "Unverified",
    unknown: "Unknown",
  };

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
                trustColors[resource.trustLevel],
              )}
            >
              {trustLabels[resource.trustLevel]}
            </span>
          </div>
          <p className="text-sm text-[var(--text-tertiary)] line-clamp-2 mt-1">
            {resource.description}
          </p>
        </div>
      </div>

      {/* Source */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        <a
          href={resource.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--text-primary)] transition-colors truncate"
        >
          {resource.sourceRepo}
        </a>
        {resource.stars && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z" />
            </svg>
            {(resource.stars / 1000).toFixed(1)}k
          </span>
        )}
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
        <span className="text-xs text-[var(--text-tertiary)] capitalize">
          {resource.type} / {resource.category}
        </span>
        <button
          onClick={onInstall}
          disabled={installing || resource.installed}
          className={clsx(
            "px-3 py-1.5 text-sm rounded-xl transition-all",
            resource.installed
              ? "glass text-[var(--accent-emerald)] cursor-default"
              : "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-dim)] text-white shadow-[0_0_12px_var(--accent-primary-glow)] hover:shadow-[0_0_20px_var(--accent-primary-glow)]",
            installing && "opacity-50 cursor-not-allowed",
          )}
        >
          {installing ? "Installing..." : resource.installed ? "Installed" : "Install"}
        </button>
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
    default:
      return null;
  }
}
