/**
 * CommitPanel Component
 * Commit message input with conventional commit type selector
 */

import { useState } from "react";

const COMMIT_TYPES = [
  { value: "feat", label: "feat", description: "New feature" },
  { value: "fix", label: "fix", description: "Bug fix" },
  { value: "docs", label: "docs", description: "Documentation" },
  { value: "style", label: "style", description: "Code style" },
  { value: "refactor", label: "refactor", description: "Refactoring" },
  { value: "test", label: "test", description: "Tests" },
  { value: "chore", label: "chore", description: "Maintenance" },
];

interface CommitPanelProps {
  stagedCount: number;
  onCommit: (message: string) => void;
  isCommitting: boolean;
}

export function CommitPanel({
  stagedCount,
  onCommit,
  isCommitting,
}: CommitPanelProps) {
  const [type, setType] = useState("feat");
  const [message, setMessage] = useState("");

  const canCommit = message.trim() && stagedCount > 0 && !isCommitting;

  const handleCommit = () => {
    if (!canCommit) return;
    onCommit(`${type}: ${message.trim()}`);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && canCommit) {
      e.preventDefault();
      handleCommit();
    }
  };

  return (
    <div className="p-3 border-t border-white/10 space-y-3 flex-shrink-0">
      {/* Type selector and message input */}
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-surface-secondary rounded px-2 py-1.5 text-sm border border-white/10
                     text-text-primary focus:outline-none focus:border-primary-500/50
                     cursor-pointer"
          disabled={isCommitting}
        >
          {COMMIT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Commit message..."
          disabled={isCommitting}
          className="flex-1 bg-surface-secondary rounded px-3 py-1.5 text-sm border border-white/10
                     text-text-primary placeholder:text-text-muted
                     focus:outline-none focus:border-primary-500/50
                     disabled:opacity-50"
        />
      </div>

      {/* Commit button */}
      <button
        onClick={handleCommit}
        disabled={!canCommit}
        className={`
          w-full py-2 rounded font-medium text-sm transition-all duration-200
          ${
            canCommit
              ? "bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/20"
              : "bg-white/5 text-text-muted cursor-not-allowed"
          }
        `}
      >
        {isCommitting ? (
          <span className="flex items-center justify-center gap-2">
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
            Committing...
          </span>
        ) : (
          `Commit${stagedCount > 0 ? ` (${stagedCount} file${stagedCount !== 1 ? "s" : ""})` : ""}`
        )}
      </button>

      {/* Helper text */}
      {stagedCount === 0 && (
        <p className="text-xs text-text-muted text-center">
          Stage changes to commit
        </p>
      )}
    </div>
  );
}
