/**
 * FileList Component
 * Displays staged and unstaged files with stage/unstage controls
 */

import type { FileChange } from "../../types";
import { FileItem } from "./FileItem";

interface FileListProps {
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: string[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  onStage: (files: string[]) => void;
  onUnstage: (files: string[]) => void;
}

export function FileList({
  staged,
  unstaged,
  untracked,
  selectedFile,
  onSelectFile,
  onStage,
  onUnstage,
}: FileListProps) {
  const totalChanges = staged.length + unstaged.length + untracked.length;

  // Convert untracked to FileChange format
  const untrackedChanges: FileChange[] = untracked.map((path) => ({
    path,
    status: "?" as const,
  }));

  // Combine unstaged and untracked for display
  const allUnstaged = [...unstaged, ...untrackedChanges];

  return (
    <div className="flex flex-col h-full">
      {/* File lists */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Staged section */}
        {staged.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-xs text-text-muted uppercase tracking-wide">
                Staged ({staged.length})
              </span>
              <button
                onClick={() => onUnstage(staged.map((f) => f.path))}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Unstage All
              </button>
            </div>
            <div className="space-y-0.5">
              {staged.map((file) => (
                <FileItem
                  key={file.path}
                  file={file}
                  selected={selectedFile === file.path}
                  staged={true}
                  onSelect={() => onSelectFile(file.path)}
                  onToggleStage={() => onUnstage([file.path])}
                />
              ))}
            </div>
          </div>
        )}

        {/* Unstaged section */}
        {allUnstaged.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-xs text-text-muted uppercase tracking-wide">
                Changes ({allUnstaged.length})
              </span>
              <button
                onClick={() => onStage(allUnstaged.map((f) => f.path))}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                Stage All
              </button>
            </div>
            <div className="space-y-0.5">
              {allUnstaged.map((file) => (
                <FileItem
                  key={file.path}
                  file={file}
                  selected={selectedFile === file.path}
                  staged={false}
                  onSelect={() => onSelectFile(file.path)}
                  onToggleStage={() => onStage([file.path])}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalChanges === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-text-muted">
            <svg
              className="w-12 h-12 mb-3 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm">Working tree clean</span>
          </div>
        )}
      </div>
    </div>
  );
}
