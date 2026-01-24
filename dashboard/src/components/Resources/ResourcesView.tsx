import { useState } from "react";
import { clsx } from "clsx";
import { InstalledTab } from "./InstalledTab";
import { BrowseTab } from "./BrowseTab";
import { ConfigureTab } from "./ConfigureTab";

type Tab = "installed" | "browse" | "configure";

const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "installed", label: "Installed", icon: "checkmark" },
  { id: "browse", label: "Browse Marketplace", icon: "store" },
  { id: "configure", label: "Configure", icon: "settings" },
];

export function ResourcesView() {
  const [activeTab, setActiveTab] = useState<Tab>("installed");

  return (
    <div className="h-full flex flex-col">
      {/* Header with glass reflection */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] glass-subtle bg-gradient-to-r from-[var(--accent-primary)]/5 via-transparent to-[var(--color-wine-medium)]/3 window-header-glass">
        <h1 className="text-xl font-semibold mb-1">Resources Hub</h1>
        <p className="text-sm text-[var(--text-tertiary)]">
          Manage skills, agents, commands, MCP servers, and integrations
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="px-6 py-3 flex gap-2 border-b border-[var(--border-subtle)] glass-subtle">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
              activeTab === tab.id
                ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-dim)] text-white shadow-[0_0_15px_var(--accent-primary-glow)]"
                : "glass hover:bg-[var(--bg-hover)] hover:shadow-md",
            )}
          >
            <TabIcon icon={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "installed" && <InstalledTab />}
        {activeTab === "browse" && <BrowseTab />}
        {activeTab === "configure" && <ConfigureTab />}
      </div>
    </div>
  );
}

function TabIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "checkmark":
      return (
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
            d="M5 13l4 4L19 7"
          />
        </svg>
      );
    case "store":
      return (
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
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      );
    case "settings":
      return (
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
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      );
    default:
      return null;
  }
}
