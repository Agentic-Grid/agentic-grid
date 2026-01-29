/**
 * DiffViewer Component
 * Displays the diff for a selected file with syntax highlighting
 */

import type { FileDiff } from "../../types";
import { DiffLine } from "./DiffLine";

interface DiffViewerProps {
  diff: FileDiff | null;
  diffs?: FileDiff[];
  loading: boolean;
}

function DiffSkeleton() {
  return (
    <div className="animate-pulse p-4 space-y-2">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="flex gap-2">
          <div className="w-10 h-4 bg-white/5 rounded" />
          <div className="w-10 h-4 bg-white/5 rounded" />
          <div
            className="h-4 bg-white/5 rounded"
            style={{ width: `${40 + Math.random() * 40}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export function DiffViewer({ diff, diffs, loading }: DiffViewerProps) {
  if (loading) {
    return <DiffSkeleton />;
  }

  // Multi-file commit diff view
  if (diffs && diffs.length > 0) {
    const totalAdditions = diffs.reduce((sum, d) => sum + d.additions, 0);
    const totalDeletions = diffs.reduce((sum, d) => sum + d.deletions, 0);

    return (
      <div className="h-full flex flex-col">
        {/* Summary header */}
        <div className="p-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-medium text-text-primary">
            {diffs.length} file{diffs.length !== 1 ? "s" : ""} changed
          </span>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-emerald-400">+{totalAdditions}</span>
            <span className="text-rose-400">-{totalDeletions}</span>
          </div>
        </div>

        {/* All file diffs */}
        <div className="flex-1 overflow-auto">
          {diffs.map((fileDiff, fileIdx) => (
            <div key={fileIdx} className="border-b border-white/10">
              <DiffHeader diff={fileDiff} />
              {fileDiff.binary ? (
                <div className="px-4 py-3 text-text-muted text-sm">
                  Binary file - cannot display diff
                </div>
              ) : fileDiff.hunks.length === 0 ? (
                <div className="px-4 py-3 text-text-muted text-sm">
                  No changes to display
                </div>
              ) : (
                fileDiff.hunks.map((hunk, i) => (
                  <div key={i} className="border-b border-white/5 last:border-b-0">
                    <div className="bg-sky-500/10 text-sky-400 px-4 py-1 text-xs font-mono">
                      @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                    </div>
                    {hunk.lines.map((line, j) => (
                      <DiffLine key={j} line={line} />
                    ))}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty multi-file diff
  if (diffs && diffs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted">
        <span className="text-sm">No changes in this commit</span>
      </div>
    );
  }

  // Single file diff view (original behavior)
  if (!diff) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-muted">
        <svg
          className="w-16 h-16 mb-4 opacity-30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span className="text-sm">Select a file to view changes</span>
      </div>
    );
  }

  // Binary file
  if (diff.binary) {
    return (
      <div className="h-full flex flex-col">
        <DiffHeader diff={diff} />
        <div className="flex-1 flex items-center justify-center text-text-muted">
          <span className="text-sm">Binary file - cannot display diff</span>
        </div>
      </div>
    );
  }

  // No changes
  if (diff.hunks.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <DiffHeader diff={diff} />
        <div className="flex-1 flex items-center justify-center text-text-muted">
          <span className="text-sm">No changes to display</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <DiffHeader diff={diff} />

      {/* Diff content */}
      <div className="flex-1 overflow-auto">
        {diff.hunks.map((hunk, i) => (
          <div key={i} className="border-b border-white/5">
            {/* Hunk header */}
            <div className="bg-sky-500/10 text-sky-400 px-4 py-1 text-xs font-mono sticky top-0">
              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
            </div>
            {/* Hunk lines */}
            {hunk.lines.map((line, j) => (
              <DiffLine key={j} line={line} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DiffHeader({ diff }: { diff: FileDiff }) {
  return (
    <div className="p-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-medium text-text-primary truncate">
          {diff.path}
        </span>
        {diff.oldPath && (
          <span className="text-xs text-text-muted">
            (renamed from {diff.oldPath})
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs flex-shrink-0">
        <span className="text-emerald-400">+{diff.additions}</span>
        <span className="text-rose-400">-{diff.deletions}</span>
      </div>
    </div>
  );
}
