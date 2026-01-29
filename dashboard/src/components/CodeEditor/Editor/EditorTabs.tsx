/**
 * EditorTabs Component
 * Tab bar with file name, icon, dirty indicator, and close button
 */

import { clsx } from "clsx";
import type { EditorTab } from "../../../types/editor";

// =============================================================================
// ICONS
// =============================================================================

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// =============================================================================
// FILE TYPE ICON
// =============================================================================

function getFileIcon(name: string): { icon: React.ReactNode; color: string } {
  const ext = name.split(".").pop()?.toLowerCase() || "";

  if (ext === "ts" || ext === "tsx") {
    return { icon: <span className="text-[9px] font-bold">TS</span>, color: "text-blue-400" };
  }
  if (ext === "js" || ext === "jsx") {
    return { icon: <span className="text-[9px] font-bold">JS</span>, color: "text-yellow-400" };
  }
  if (ext === "json") {
    return { icon: <span className="text-[9px] font-bold">{"{}"}</span>, color: "text-yellow-300" };
  }
  if (ext === "md" || ext === "mdx") {
    return { icon: <span className="text-[9px] font-bold">M</span>, color: "text-cyan-400" };
  }
  if (ext === "css" || ext === "scss") {
    return { icon: <span className="text-[9px] font-bold">#</span>, color: "text-purple-400" };
  }
  if (ext === "html" || ext === "htm") {
    return { icon: <span className="text-[9px] font-bold">&lt;/&gt;</span>, color: "text-orange-400" };
  }
  if (ext === "yaml" || ext === "yml") {
    return { icon: <span className="text-[9px] font-bold">Y</span>, color: "text-pink-400" };
  }
  if (ext === "py") {
    return { icon: <span className="text-[9px] font-bold">Py</span>, color: "text-yellow-300" };
  }
  if (ext === "go") {
    return { icon: <span className="text-[9px] font-bold">Go</span>, color: "text-cyan-300" };
  }
  if (ext === "rs") {
    return { icon: <span className="text-[9px] font-bold">Rs</span>, color: "text-orange-300" };
  }
  if (ext === "sql") {
    return { icon: <span className="text-[9px] font-bold">SQL</span>, color: "text-blue-300" };
  }
  if (ext === "sh" || ext === "bash") {
    return { icon: <span className="text-[9px] font-bold">$</span>, color: "text-green-300" };
  }

  return { icon: <span className="text-[9px] font-bold">F</span>, color: "text-[var(--text-tertiary)]" };
}

// =============================================================================
// SINGLE TAB
// =============================================================================

interface EditorTabItemProps {
  tab: EditorTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

function EditorTabItem({ tab, isActive, onSelect, onClose }: EditorTabItemProps) {
  const { icon, color } = getFileIcon(tab.name);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      className={clsx(
        "group flex items-center gap-2 px-3 py-2 cursor-pointer border-r border-[var(--border-subtle)] transition-colors min-w-0",
        isActive
          ? "bg-[var(--bg-primary)] border-t-2 border-t-[var(--accent-primary)]"
          : "bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] border-t-2 border-t-transparent"
      )}
      onClick={onSelect}
    >
      {/* File Icon */}
      <span className={clsx("w-4 h-4 flex items-center justify-center flex-shrink-0", color)}>
        {icon}
      </span>

      {/* File Name */}
      <span
        className={clsx(
          "text-sm truncate max-w-[120px]",
          isActive ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
        )}
      >
        {tab.name}
      </span>

      {/* Dirty Indicator or Close Button */}
      {tab.isDirty ? (
        <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] flex-shrink-0" title="Unsaved changes" />
      ) : (
        <button
          onClick={handleClose}
          className={clsx(
            "w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors",
            isActive || "opacity-0 group-hover:opacity-100",
            "hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          )}
          title="Close"
        >
          <IconClose className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// EDITOR TABS COMPONENT
// =============================================================================

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTabPath: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

export function EditorTabs({ tabs, activeTabPath, onSelectTab, onCloseTab }: EditorTabsProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] overflow-x-auto scrollbar-thin">
      {tabs.map((tab) => (
        <EditorTabItem
          key={tab.path}
          tab={tab}
          isActive={tab.path === activeTabPath}
          onSelect={() => onSelectTab(tab.path)}
          onClose={() => onCloseTab(tab.path)}
        />
      ))}
    </div>
  );
}
