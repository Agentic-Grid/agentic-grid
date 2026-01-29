/**
 * FileNode Component
 * Individual node in the file tree with file type icon, git status, and expand/collapse
 */

import { clsx } from "clsx";
import type { FileNode as FileNodeType, GitFileStatus } from "../../../types/editor";

// =============================================================================
// ICONS
// =============================================================================

function IconChevron({ className, isExpanded }: { className?: string; isExpanded: boolean }) {
  return (
    <svg
      className={clsx(className, "transition-transform", isExpanded && "rotate-90")}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function IconFolder({ className, isOpen }: { className?: string; isOpen?: boolean }) {
  if (isOpen) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 11H13V5H11V11H5V13H11V19H13V13H19V11Z" />
        <path d="M4 4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V8C22 6.89543 21.1046 6 20 6H11.5L9.5 4H4Z" fillOpacity="0.9" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V8C22 6.89543 21.1046 6 20 6H11.5L9.5 4H4Z" />
    </svg>
  );
}

function IconFile({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20Z" />
    </svg>
  );
}

// =============================================================================
// FILE TYPE ICONS
// =============================================================================

function getFileIcon(name: string): { icon: React.ReactNode; color: string } {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const baseName = name.toLowerCase();

  // TypeScript/JavaScript
  if (ext === "ts" || ext === "tsx") {
    return {
      icon: <span className="text-[10px] font-bold">TS</span>,
      color: "text-blue-400",
    };
  }
  if (ext === "js" || ext === "jsx") {
    return {
      icon: <span className="text-[10px] font-bold">JS</span>,
      color: "text-yellow-400",
    };
  }

  // Markup/Styling
  if (ext === "html" || ext === "htm") {
    return {
      icon: <span className="text-[10px] font-bold">&lt;/&gt;</span>,
      color: "text-orange-400",
    };
  }
  if (ext === "css" || ext === "scss" || ext === "less") {
    return {
      icon: <span className="text-[10px] font-bold">#</span>,
      color: "text-purple-400",
    };
  }

  // Data
  if (ext === "json") {
    return {
      icon: <span className="text-[10px] font-bold">{"{}"}</span>,
      color: "text-yellow-300",
    };
  }
  if (ext === "yaml" || ext === "yml") {
    return {
      icon: <span className="text-[10px] font-bold">Y</span>,
      color: "text-pink-400",
    };
  }

  // Documentation
  if (ext === "md" || ext === "mdx") {
    return {
      icon: <span className="text-[10px] font-bold">M</span>,
      color: "text-cyan-400",
    };
  }

  // Config files
  if (baseName === "package.json") {
    return {
      icon: <span className="text-[10px] font-bold">npm</span>,
      color: "text-red-400",
    };
  }
  if (baseName === "dockerfile" || ext === "dockerfile") {
    return {
      icon: <span className="text-[10px] font-bold">D</span>,
      color: "text-blue-300",
    };
  }
  if (baseName.startsWith(".env")) {
    return {
      icon: <span className="text-[10px] font-bold">E</span>,
      color: "text-green-400",
    };
  }
  if (baseName === ".gitignore") {
    return {
      icon: <span className="text-[10px] font-bold">G</span>,
      color: "text-gray-400",
    };
  }

  // Python
  if (ext === "py") {
    return {
      icon: <span className="text-[10px] font-bold">Py</span>,
      color: "text-yellow-300",
    };
  }

  // Go
  if (ext === "go") {
    return {
      icon: <span className="text-[10px] font-bold">Go</span>,
      color: "text-cyan-300",
    };
  }

  // Rust
  if (ext === "rs") {
    return {
      icon: <span className="text-[10px] font-bold">Rs</span>,
      color: "text-orange-300",
    };
  }

  // SQL
  if (ext === "sql") {
    return {
      icon: <span className="text-[10px] font-bold">SQL</span>,
      color: "text-blue-300",
    };
  }

  // Shell
  if (ext === "sh" || ext === "bash" || ext === "zsh") {
    return {
      icon: <span className="text-[10px] font-bold">$</span>,
      color: "text-green-300",
    };
  }

  // Default file icon
  return {
    icon: <IconFile className="w-4 h-4" />,
    color: "text-[var(--text-tertiary)]",
  };
}

// =============================================================================
// GIT STATUS
// =============================================================================

function GitStatusIndicator({ status }: { status?: GitFileStatus }) {
  if (!status) return null;

  const statusConfig: Record<GitFileStatus, { color: string; label: string }> = {
    M: { color: "bg-amber-500", label: "Modified" },
    A: { color: "bg-green-500", label: "Added" },
    D: { color: "bg-red-500", label: "Deleted" },
    U: { color: "bg-purple-500", label: "Unmerged" },
    "?": { color: "bg-gray-400", label: "Untracked" },
  };

  const config = statusConfig[status];
  if (!config) return null;

  return (
    <span
      className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", config.color)}
      title={config.label}
    />
  );
}

// =============================================================================
// FILE NODE COMPONENT
// =============================================================================

interface FileNodeProps {
  node: FileNodeType;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onOpen: (node: FileNodeType) => void;
  onContextMenu?: (e: React.MouseEvent, node: FileNodeType) => void;
}

export function FileNode({
  node,
  depth,
  isExpanded,
  isSelected,
  onSelect,
  onToggle,
  onOpen,
  onContextMenu,
}: FileNodeProps) {
  const isDirectory = node.type === "directory";
  const hasChildren = isDirectory && node.children && node.children.length > 0;
  const fileIcon = !isDirectory ? getFileIcon(node.name) : null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.path);
    if (isDirectory) {
      onToggle(node.path);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDirectory) {
      onOpen(node);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(node.path);
    onContextMenu?.(e, node);
  };

  return (
    <div
      className={clsx(
        "flex items-center gap-1.5 px-2 py-1 cursor-pointer text-sm rounded-md transition-colors",
        isSelected
          ? "bg-[var(--accent-primary)]/20 text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Expand/Collapse Chevron */}
      {isDirectory ? (
        <button
          className="w-4 h-4 flex items-center justify-center flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.path);
          }}
        >
          {hasChildren && (
            <IconChevron className="w-3 h-3 text-[var(--text-tertiary)]" isExpanded={isExpanded} />
          )}
        </button>
      ) : (
        <span className="w-4 flex-shrink-0" />
      )}

      {/* File/Folder Icon */}
      <span className={clsx("w-4 h-4 flex items-center justify-center flex-shrink-0", fileIcon?.color)}>
        {isDirectory ? (
          <IconFolder className="w-4 h-4 text-[var(--accent-amber)]" isOpen={isExpanded} />
        ) : (
          fileIcon?.icon
        )}
      </span>

      {/* File Name */}
      <span className="truncate flex-1">{node.name}</span>

      {/* Git Status */}
      <GitStatusIndicator status={node.gitStatus} />
    </div>
  );
}
