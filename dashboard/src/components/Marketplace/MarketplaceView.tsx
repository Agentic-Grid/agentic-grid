import { useState, useEffect } from "react";
import { clsx } from "clsx";
import type { MCPServer, MCPCategory } from "../../types";
import {
  getAvailableMCPServers,
  installMCPServer,
  uninstallMCPServer,
} from "../../services/api";

const categoryLabels: Record<MCPCategory, string> = {
  development: "Development",
  productivity: "Productivity",
  ai: "AI & ML",
  data: "Data",
  other: "Other",
};

const categoryIcons: Record<MCPCategory, string> = {
  development: "🛠️",
  productivity: "📊",
  ai: "🤖",
  data: "🗄️",
  other: "📦",
};

export function MarketplaceView() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<MCPCategory | "all">(
    "all",
  );
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    loadServers();
  }, []);

  async function loadServers() {
    try {
      const response = await getAvailableMCPServers();
      setServers(response.data);
    } catch (err) {
      console.error("Failed to load servers:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInstall(serverId: string) {
    setInstalling(serverId);
    try {
      await installMCPServer(serverId);
      await loadServers();
      alert("Server installed! Restart Claude Code to apply changes.");
    } catch (err: any) {
      alert(`Failed to install: ${err.message}`);
    } finally {
      setInstalling(null);
    }
  }

  async function handleUninstall(serverId: string) {
    if (!confirm("Are you sure you want to uninstall this server?")) return;

    setInstalling(serverId);
    try {
      await uninstallMCPServer(serverId);
      await loadServers();
      alert("Server uninstalled! Restart Claude Code to apply changes.");
    } catch (err: any) {
      alert(`Failed to uninstall: ${err.message}`);
    } finally {
      setInstalling(null);
    }
  }

  const filteredServers =
    selectedCategory === "all"
      ? servers
      : servers.filter((s) => s.category === selectedCategory);

  const categories: Array<MCPCategory | "all"> = [
    "all",
    "development",
    "productivity",
    "ai",
    "data",
    "other",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-pulse">Loading marketplace...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
        <h1 className="text-xl font-semibold mb-1">Tool Marketplace</h1>
        <p className="text-sm text-[var(--text-tertiary)]">
          Install MCP servers to extend Claude's capabilities
        </p>
      </div>

      {/* Category filter */}
      <div className="px-6 py-3 flex gap-2 overflow-x-auto border-b border-[var(--border-subtle)]">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors",
              selectedCategory === cat
                ? "bg-[var(--accent-primary)] text-white"
                : "glass hover:bg-[var(--bg-tertiary)]",
            )}
          >
            {cat === "all"
              ? "All"
              : `${categoryIcons[cat as MCPCategory]} ${categoryLabels[cat as MCPCategory]}`}
          </button>
        ))}
      </div>

      {/* Server grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredServers.map((server) => (
            <div key={server.id} className="card p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{categoryIcons[server.category]}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{server.name}</h3>
                  <p className="text-sm text-[var(--text-tertiary)] line-clamp-2">
                    {server.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--border-subtle)]">
                <span
                  className={clsx(
                    "text-xs px-2 py-0.5 rounded-full",
                    server.installed
                      ? "bg-[var(--accent-emerald)] bg-opacity-10 text-[var(--accent-emerald)]"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]",
                  )}
                >
                  {server.installed ? "Installed" : "Not installed"}
                </span>

                <button
                  onClick={() =>
                    server.installed
                      ? handleUninstall(server.id)
                      : handleInstall(server.id)
                  }
                  disabled={installing === server.id}
                  className={clsx(
                    "px-3 py-1 text-sm rounded-lg transition-colors disabled:opacity-50",
                    server.installed
                      ? "text-[var(--accent-rose)] hover:bg-[var(--accent-rose)] hover:bg-opacity-10"
                      : "btn-primary",
                  )}
                >
                  {installing === server.id
                    ? "..."
                    : server.installed
                      ? "Uninstall"
                      : "Install"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
