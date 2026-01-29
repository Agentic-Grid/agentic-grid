/**
 * CommitHistory Component
 * Displays commit history with pushed/unpushed status indicators
 * and revert action for unpushed commits
 */

import { useState, useEffect, useCallback } from "react";
import type { GitCommitWithStatus } from "../../types";
import { getGitHistory, resetCommit } from "../../services/api";

interface CommitHistoryProps {
  projectName: string;
  onRevert?: () => void;
  onSelectCommit?: (commitHash: string) => void;
  selectedCommitHash?: string | null;
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function CommitHistory({ projectName, onRevert, onSelectCommit, selectedCommitHash }: CommitHistoryProps) {
  const [commits, setCommits] = useState<GitCommitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [ahead, setAhead] = useState(0);
  const [resettingHash, setResettingHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setError(null);
      const response = await getGitHistory(projectName, { limit: 50 });
      setCommits(response.data.commits);
      setAhead(response.data.ahead);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setError("Failed to load commit history");
    } finally {
      setLoading(false);
    }
  }, [projectName]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRevert = async (commitHash: string) => {
    setResettingHash(commitHash);
    setError(null);
    try {
      await resetCommit(projectName, commitHash);
      await fetchHistory();
      onRevert?.();
    } catch (err) {
      console.error("Failed to revert commit:", err);
      setError(err instanceof Error ? err.message : "Failed to revert commit");
    } finally {
      setResettingHash(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading history...
        </div>
      </div>
    );
  }

  if (error && commits.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4">
        <p className="text-rose-400 text-sm">{error}</p>
        <button
          onClick={fetchHistory}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (commits.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 text-text-muted">
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm">No commits yet</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Ahead indicator */}
      {ahead > 0 && (
        <div className="px-3 py-2 border-b border-white/10 bg-amber-500/5">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 11l5-5m0 0l5 5m-5-5v12"
              />
            </svg>
            <span>
              {ahead} unpushed commit{ahead !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="px-3 py-2 border-b border-white/10 bg-rose-500/10">
          <p className="text-xs text-rose-400">{error}</p>
        </div>
      )}

      {/* Commit list */}
      <div className="flex-1 overflow-y-auto">
        {commits.map((commit) => (
          <CommitItem
            key={commit.hash}
            commit={commit}
            isResetting={resettingHash === commit.hash}
            selected={selectedCommitHash === commit.hash}
            onSelect={() => onSelectCommit?.(commit.hash)}
            onRevert={() => handleRevert(commit.hash)}
          />
        ))}
      </div>
    </div>
  );
}

function CommitItem({
  commit,
  isResetting,
  selected,
  onSelect,
  onRevert,
}: {
  commit: GitCommitWithStatus;
  isResetting: boolean;
  selected: boolean;
  onSelect?: () => void;
  onRevert: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  // Parse conventional commit type
  const typeMatch = commit.message.match(/^(\w+)(?:\(.*?\))?:\s*/);
  const commitType = typeMatch ? typeMatch[1] : null;
  const messageBody = typeMatch
    ? commit.message.slice(typeMatch[0].length)
    : commit.message;

  const typeColor: Record<string, string> = {
    feat: "text-emerald-400",
    fix: "text-rose-400",
    docs: "text-sky-400",
    style: "text-violet-400",
    refactor: "text-amber-400",
    test: "text-cyan-400",
    chore: "text-gray-400",
  };

  return (
    <div
      onClick={onSelect}
      className={`group px-3 py-2.5 border-b border-white/5 cursor-pointer transition-colors
        ${selected ? "bg-white/[0.06]" : "hover:bg-white/[0.02]"}`}
    >
      <div className="flex items-start gap-2">
        {/* Timeline dot */}
        <div className="flex flex-col items-center mt-1.5 flex-shrink-0">
          <div
            className={`w-2 h-2 rounded-full ${
              commit.pushed
                ? "bg-emerald-500"
                : "bg-amber-500 ring-2 ring-amber-500/20"
            }`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {commitType && (
              <span
                className={`text-xs font-mono font-medium ${
                  typeColor[commitType] || "text-text-muted"
                }`}
              >
                {commitType}
              </span>
            )}
            <span className="text-sm text-text-primary truncate">
              {messageBody}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono text-text-muted">
              {commit.shortHash}
            </span>
            <span className="text-xs text-text-muted">
              {formatTimeAgo(commit.timestamp)}
            </span>
            {!commit.pushed && (
              <span className="text-xs text-amber-400/80 flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 11l5-5m0 0l5 5m-5-5v12"
                  />
                </svg>
                unpushed
              </span>
            )}
          </div>
        </div>

        {/* Revert button - only for unpushed commits */}
        {!commit.pushed && (
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {showConfirm ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    onRevert();
                    setShowConfirm(false);
                  }}
                  disabled={isResetting}
                  className="px-2 py-0.5 text-xs bg-rose-500/20 text-rose-400 rounded
                             hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                >
                  {isResetting ? "..." : "Confirm"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-1.5 py-0.5 text-xs text-text-muted hover:text-text-secondary
                             transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                title="Revert to working tree"
                className="p-1 text-text-muted hover:text-amber-400 transition-colors rounded
                           hover:bg-white/5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
