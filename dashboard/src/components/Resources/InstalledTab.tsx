import { useState, useEffect } from "react";
import { clsx } from "clsx";
import {
  getInstalledResources,
  deleteResource,
  type Resource,
  type ResourceType,
} from "../../services/api";
import { ResourceCard } from "./ResourceCard";
import { ResourceEditorModal } from "./ResourceEditorModal";

const typeLabels: Record<ResourceType, string> = {
  skill: "Skills",
  agent: "Agents",
  command: "Commands",
  mcp: "MCP Servers",
  plugin: "Plugins",
  hook: "Hooks",
  permission: "Permissions",
};

const typeIcons: Record<ResourceType, string> = {
  skill: "lightning",
  agent: "robot",
  command: "terminal",
  mcp: "server",
  plugin: "puzzle",
  hook: "link",
  permission: "shield",
};

type FilterType = "all" | ResourceType;

export function InstalledTab() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [counts, setCounts] = useState<Partial<Record<ResourceType, number>>>({});
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [creating, setCreating] = useState<"skill" | "agent" | "command" | null>(null);

  useEffect(() => {
    loadResources();
  }, []);

  async function loadResources() {
    try {
      setLoading(true);
      const response = await getInstalledResources();
      setResources(response.data.resources);
      setCounts(response.data.byType);
    } catch (err) {
      console.error("Failed to load resources:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(resource: Resource) {
    if (!confirm(`Are you sure you want to delete "${resource.name}"?`)) {
      return;
    }

    try {
      await deleteResource(resource.id);
      await loadResources();
    } catch (err) {
      console.error("Failed to delete resource:", err);
      alert("Failed to delete resource");
    }
  }

  const filteredResources =
    filter === "all"
      ? resources
      : resources.filter((r) => r.type === filter);

  const filters: FilterType[] = [
    "all",
    "skill",
    "agent",
    "command",
    "mcp",
    "hook",
    "permission",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-pulse">Loading resources...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Actions Row */}
      <div className="flex items-center justify-between mb-4">
        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-sm whitespace-nowrap transition-all flex items-center gap-1",
                filter === f
                  ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-dim)] text-white shadow-[0_0_12px_var(--accent-primary-glow)]"
                  : "glass hover:bg-[var(--bg-hover)] hover:shadow-md",
              )}
            >
              {f === "all" ? (
                "All"
              ) : (
                <>
                  <TypeIcon type={f} />
                  {typeLabels[f]}
                  {counts[f] ? (
                    <span className="ml-1 text-xs opacity-70">
                      ({counts[f]})
                    </span>
                  ) : null}
                </>
              )}
            </button>
          ))}
        </div>

        {/* Create Button */}
        <div className="flex gap-2">
          <button
            onClick={() => setCreating("skill")}
            className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-dim)] text-white text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_var(--accent-primary-glow)] hover:shadow-[0_0_25px_var(--accent-primary-glow)] transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New
          </button>
        </div>
      </div>

      {/* Create dropdown when visible */}
      {creating && (
        <ResourceEditorModal
          type={creating}
          onClose={() => setCreating(null)}
          onSave={async () => {
            setCreating(null);
            await loadResources();
          }}
        />
      )}

      {/* Edit modal */}
      {editingResource && (
        <ResourceEditorModal
          resource={editingResource}
          type={editingResource.type as "skill" | "agent" | "command"}
          onClose={() => setEditingResource(null)}
          onSave={async () => {
            setEditingResource(null);
            await loadResources();
          }}
        />
      )}

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-tertiary)]">
          <p className="mb-2">No {filter === "all" ? "resources" : typeLabels[filter]} installed</p>
          {filter !== "all" && filter !== "mcp" && filter !== "plugin" && filter !== "hook" && filter !== "permission" && (
            <button
              onClick={() => setCreating(filter as "skill" | "agent" | "command")}
              className="text-[var(--accent-primary)] hover:underline"
            >
              Create your first {filter}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onEdit={
                ["skill", "agent", "command"].includes(resource.type)
                  ? () => setEditingResource(resource)
                  : undefined
              }
              onDelete={() => handleDelete(resource)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TypeIcon({ type }: { type: ResourceType }) {
  const icon = typeIcons[type];

  switch (icon) {
    case "lightning":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "robot":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      );
    case "terminal":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case "server":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      );
    case "puzzle":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
        </svg>
      );
    case "link":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
    case "shield":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    default:
      return null;
  }
}
