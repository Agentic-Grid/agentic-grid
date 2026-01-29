/**
 * FileExplorer Component
 * Container with header and tree for browsing project files
 */

import { clsx } from "clsx";
import type { FileNode as FileNodeType } from "../../../types/editor";
import { FileTree } from "./FileTree";

// =============================================================================
// ICONS
// =============================================================================

function IconRefresh({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function IconCollapse({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v7h7M20 20v-7h-7"
      />
    </svg>
  );
}

function IconFolder({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 4C2.89543 4 2 4.89543 2 6V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V8C22 6.89543 21.1046 6 20 6H11.5L9.5 4H4Z" />
    </svg>
  );
}

// =============================================================================
// LOADING SKELETON
// =============================================================================

// Pre-computed widths for skeleton items (avoids Math.random during render)
const SKELETON_WIDTHS = [95, 120, 80, 140, 105, 75, 130, 110];

function FileTreeSkeleton() {
  return (
    <div className="p-2 space-y-1.5 animate-pulse">
      {SKELETON_WIDTHS.map((width, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-1.5" style={{ paddingLeft: `${(i % 3) * 12 + 20}px` }}>
          <div className="w-4 h-4 rounded bg-[var(--bg-tertiary)]" />
          <div className="h-3.5 rounded bg-[var(--bg-tertiary)]" style={{ width: `${width}px` }} />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <IconFolder className="w-12 h-12 text-[var(--text-tertiary)] opacity-50 mb-3" />
      <p className="text-sm text-[var(--text-tertiary)]">No files found</p>
      <p className="text-xs text-[var(--text-tertiary)] mt-1 opacity-70">
        This project appears to be empty
      </p>
    </div>
  );
}

// =============================================================================
// ERROR STATE
// =============================================================================

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-[var(--accent-rose)]/10 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-[var(--accent-rose)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-sm text-[var(--accent-rose)]">Failed to load files</p>
      <p className="text-xs text-[var(--text-tertiary)] mt-1">{error}</p>
      <button
        onClick={onRetry}
        className="mt-4 px-3 py-1.5 text-xs rounded-lg glass hover:bg-[var(--bg-hover)] transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

// =============================================================================
// FILE EXPLORER COMPONENT
// =============================================================================

interface FileExplorerProps {
  projectName: string;
  files: FileNodeType[];
  isLoading: boolean;
  error: string | null;
  expandedPaths: Set<string>;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onOpen: (node: FileNodeType) => void;
  onRefresh: () => void;
  onCollapseAll: () => void;
  onContextMenu?: (e: React.MouseEvent, node: FileNodeType) => void;
}

export function FileExplorer({
  projectName,
  files,
  isLoading,
  error,
  expandedPaths,
  selectedPath,
  onSelect,
  onToggle,
  onOpen,
  onRefresh,
  onCollapseAll,
  onContextMenu,
}: FileExplorerProps) {
  return (
    <div className="h-full flex flex-col border-r border-[var(--border-subtle)]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between bg-gradient-to-r from-[var(--accent-primary)]/5 via-transparent to-transparent">
        <div className="flex items-center gap-2 min-w-0">
          <IconFolder className="w-4 h-4 text-[var(--accent-amber)] flex-shrink-0" />
          <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider truncate">
            {projectName}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onCollapseAll}
            className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            title="Collapse all"
          >
            <IconCollapse className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={clsx(
              "p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors",
              isLoading && "animate-spin"
            )}
            title="Refresh"
          >
            <IconRefresh className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <FileTreeSkeleton />
        ) : error ? (
          <ErrorState error={error} onRetry={onRefresh} />
        ) : files.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="py-1">
            <FileTree
              nodes={files}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onToggle={onToggle}
              onOpen={onOpen}
              onContextMenu={onContextMenu}
            />
          </div>
        )}
      </div>
    </div>
  );
}
