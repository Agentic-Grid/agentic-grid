import { useState, memo } from "react";
import { clsx } from "clsx";
import { approveSession } from "../../services/api";

interface ApprovalCardProps {
  command: string;
  pattern: string;
  sessionId: string;
  projectPath: string;
  onApproved?: () => void;
}

// Shield icon component
function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}

// Spinner component
function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={clsx("animate-spin", className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Convert project path to folder format used in API
function getProjectFolder(projectPath: string): string {
  return projectPath.replace(/\//g, "-");
}

export const ApprovalCard = memo(function ApprovalCard({
  command,
  pattern,
  sessionId,
  projectPath,
  onApproved,
}: ApprovalCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isAllowingAlways, setIsAllowingAlways] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);

    try {
      // Kill waiting process and resume session (one-time approval)
      await approveSession(sessionId, projectPath);
      setIsApproved(true);
      onApproved?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve";
      setError(message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleAlwaysAllow = async () => {
    setIsAllowingAlways(true);
    setError(null);

    try {
      // Kill waiting process, add pattern to settings, and resume session
      await approveSession(sessionId, projectPath, {
        pattern,
        alwaysAllow: true,
      });
      setIsApproved(true);
      onApproved?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add allow pattern";
      setError(message);
    } finally {
      setIsAllowingAlways(false);
    }
  };

  const isLoading = isApproving || isAllowingAlways;

  // If already approved, show success state
  if (isApproved) {
    return (
      <div
        className={clsx(
          "w-full rounded-xl px-4 py-3 border-2",
          "border-[var(--accent-emerald)]/40 bg-[var(--accent-emerald)]/10",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0 text-[var(--accent-emerald)]">
            <svg
              className="w-5 h-5"
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
          </div>
          <span className="text-sm font-medium text-[var(--accent-emerald)]">
            Approved
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "w-full rounded-xl px-4 py-4 border-2",
        "border-[var(--accent-amber)]/50 bg-[var(--accent-amber)]/10",
        "shadow-[0_0_20px_var(--accent-amber-glow)]",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 mt-0.5 text-[var(--accent-amber)]">
          <ShieldIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--accent-amber)] mb-1">
            Permission Required
          </div>
          <div className="text-xs text-[var(--text-tertiary)]">
            Claude wants to execute the following command:
          </div>
        </div>
      </div>

      {/* Command display */}
      <div className="mb-4 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
        <code className="text-sm font-mono text-[var(--text-primary)] break-all">
          {command}
        </code>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-2 rounded-lg bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/30">
          <span className="text-xs text-[var(--accent-rose)]">{error}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className={clsx(
            "flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
            "font-medium text-sm transition-all",
            "bg-[var(--accent-amber)] text-[var(--bg-primary)]",
            "hover:bg-[var(--accent-amber-dim)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-[var(--accent-amber)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]",
          )}
          aria-label="Approve this command once"
        >
          {isApproving ? (
            <>
              <Spinner className="w-4 h-4" />
              <span>Approving...</span>
            </>
          ) : (
            <>
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
              <span>Approve</span>
            </>
          )}
        </button>

        <button
          onClick={handleAlwaysAllow}
          disabled={isLoading}
          className={clsx(
            "flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
            "font-medium text-sm transition-all",
            "bg-transparent text-[var(--accent-amber)]",
            "border border-[var(--accent-amber)]/50",
            "hover:bg-[var(--accent-amber)]/10 hover:border-[var(--accent-amber)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-[var(--accent-amber)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]",
          )}
          aria-label="Always allow commands matching this pattern"
          title={`Add pattern "${pattern}" to allowed list`}
        >
          {isAllowingAlways ? (
            <>
              <Spinner className="w-4 h-4" />
              <span>Adding...</span>
            </>
          ) : (
            <>
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
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>Always Allow</span>
            </>
          )}
        </button>
      </div>

      {/* Pattern hint */}
      <div className="mt-3 text-xs text-[var(--text-muted)]">
        <span className="font-medium">Always Allow</span> adds{" "}
        <code className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)] font-mono text-[var(--text-tertiary)]">
          {pattern}
        </code>{" "}
        to your project settings
      </div>
    </div>
  );
});
