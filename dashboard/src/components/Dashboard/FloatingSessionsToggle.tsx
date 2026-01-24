import { useState, useRef, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import type { Session } from "../../types";

interface FloatingSessionsToggleProps {
  sessions: Session[];
  sessionNames: Record<string, string>;
  showFloatingSessions: boolean;
  onToggleAll: () => void;
  hiddenSessionIds: Set<string>;
  onHiddenSessionsChange: (hiddenIds: Set<string>) => void;
}

export function FloatingSessionsToggle({
  sessions,
  sessionNames,
  showFloatingSessions,
  onToggleAll,
  hiddenSessionIds,
  onHiddenSessionsChange,
}: FloatingSessionsToggleProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Count visible sessions
  const visibleCount = sessions.filter((s) => !hiddenSessionIds.has(s.id)).length;

  // Handle hover enter with small delay to prevent flicker
  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setShowDropdown(true);
    }, 150);
  }, []);

  // Handle hover leave with delay
  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Toggle individual session visibility
  const toggleSession = useCallback(
    (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newHidden = new Set(hiddenSessionIds);
      if (newHidden.has(sessionId)) {
        newHidden.delete(sessionId);
      } else {
        newHidden.add(sessionId);
      }
      onHiddenSessionsChange(newHidden);
    },
    [hiddenSessionIds, onHiddenSessionsChange]
  );

  // Show all sessions
  const showAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onHiddenSessionsChange(new Set());
    },
    [onHiddenSessionsChange]
  );

  // Hide all sessions
  const hideAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onHiddenSessionsChange(new Set(sessions.map((s) => s.id)));
    },
    [sessions, onHiddenSessionsChange]
  );

  // Get display name for session
  const getDisplayName = (session: Session) => {
    return (
      sessionNames[session.id] ||
      session.projectName?.slice(0, 20) ||
      `Session ${session.id.slice(0, 6)}`
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main toggle button */}
      <button
        onClick={onToggleAll}
        className={clsx(
          "btn text-sm flex items-center gap-2 transition-all rounded-xl",
          showFloatingSessions
            ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-dim)] text-white shadow-[0_0_20px_var(--accent-primary-glow)]"
            : "btn-ghost glass hover:shadow-md"
        )}
        title={showFloatingSessions ? "Hide all sessions" : "Show all sessions"}
      >
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
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
        <span>
          Sessions ({showFloatingSessions ? visibleCount : sessions.length})
        </span>
        {/* Dropdown indicator */}
        <svg
          className={clsx(
            "w-3 h-3 transition-transform",
            showDropdown && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown on hover */}
      {showDropdown && (
        <div className="absolute top-full right-0 mt-1 w-64 max-h-80 overflow-y-auto rounded-xl border border-[var(--border-subtle)] glass-elevated z-50 window-glow-strong">
          {/* Header with Show All / Hide All and glass reflection */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-subtle)] bg-gradient-to-r from-[var(--accent-primary)]/5 via-transparent to-[var(--color-wine-medium)]/3 window-header-glass">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Session Visibility
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={showAll}
                className="px-2 py-0.5 text-[10px] font-medium rounded bg-[var(--accent-emerald)]/10 text-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)]/20 transition-colors"
              >
                Show All
              </button>
              <button
                onClick={hideAll}
                className="px-2 py-0.5 text-[10px] font-medium rounded bg-[var(--accent-rose)]/10 text-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/20 transition-colors"
              >
                Hide All
              </button>
            </div>
          </div>

          {/* Session list */}
          <div className="py-1">
            {sessions.map((session) => {
              const isVisible = !hiddenSessionIds.has(session.id);
              return (
                <button
                  key={session.id}
                  onClick={(e) => toggleSession(session.id, e)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-hover)] rounded-lg mx-1 transition-all hover:translate-x-0.5"
                >
                  {/* Visibility checkbox */}
                  <div
                    className={clsx(
                      "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                      isVisible
                        ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
                        : "border-[var(--border-subtle)] bg-[var(--bg-primary)]"
                    )}
                  >
                    {isVisible && (
                      <svg
                        className="w-3 h-3 text-white"
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
                    )}
                  </div>

                  {/* Session name */}
                  <span
                    className={clsx(
                      "text-sm truncate flex-1 text-left",
                      isVisible
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-tertiary)]"
                    )}
                  >
                    {getDisplayName(session)}
                  </span>

                  {/* Status indicator */}
                  <span
                    className={clsx(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      session.status === "working" && "bg-[var(--accent-amber)]",
                      session.status === "waiting" && "bg-[var(--accent-emerald)]",
                      session.status === "needs-approval" && "bg-[var(--accent-rose)]",
                      session.status === "idle" && "bg-[var(--text-tertiary)]"
                    )}
                  />
                </button>
              );
            })}
          </div>

          {sessions.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-[var(--text-tertiary)]">
              No sessions available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
