/**
 * DeleteDialog Component
 * Confirmation dialog for deleting files or folders
 */

import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";

// =============================================================================
// ICONS
// =============================================================================

function IconDelete({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

// =============================================================================
// DELETE DIALOG COMPONENT
// =============================================================================

interface DeleteDialogProps {
  isOpen: boolean;
  path: string;
  name: string;
  isDirectory: boolean;
  onClose: () => void;
  onConfirm: (recursive: boolean) => void;
  isDeleting?: boolean;
}

export function DeleteDialog({
  isOpen,
  path,
  name,
  isDirectory,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteDialogProps) {
  // Initialize recursive to false - component mounts fresh each time
  const [recursive, setRecursive] = useState(false);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button on mount
  useEffect(() => {
    const timeoutId = setTimeout(() => confirmButtonRef.current?.focus(), 100);
    return () => clearTimeout(timeoutId);
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(isDirectory ? recursive : false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md mx-4 glass-elevated border border-[var(--border-subtle)] rounded-2xl animate-slide-up window-glow-strong">
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2.5 rounded-xl glass border border-[var(--accent-rose)]/30 bg-[var(--accent-rose)]/10">
              <IconDelete className="w-6 h-6 text-[var(--accent-rose)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                id="delete-dialog-title"
                className="text-lg font-semibold text-[var(--text-primary)]"
              >
                Delete {isDirectory ? "Folder" : "File"}
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Are you sure you want to delete{" "}
                <span className="font-medium text-[var(--text-primary)]">{name}</span>?
                {isDirectory && " This folder may contain files."}
              </p>
            </div>
          </div>

          {/* Path display */}
          <div className="mt-4 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Path:</p>
            <p className="text-sm font-mono text-[var(--text-secondary)] break-all">
              {path}
            </p>
          </div>

          {/* Recursive checkbox for directories */}
          {isDirectory && (
            <div className="mt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recursive}
                  onChange={(e) => setRecursive(e.target.checked)}
                  disabled={isDeleting}
                  className="mt-0.5 w-4 h-4 rounded border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-[var(--accent-rose)] focus:ring-[var(--accent-rose)]/50"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    Delete contents recursively
                  </span>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    Required for non-empty folders. All files and subfolders will be permanently deleted.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Warning message */}
          <div className="mt-4 p-3 rounded-lg bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/30">
            <p className="text-sm text-[var(--accent-rose)]">
              This action cannot be undone.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 text-sm font-medium rounded-xl glass border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
            >
              Cancel
            </button>
            <button
              ref={confirmButtonRef}
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting || (isDirectory && !recursive)}
              className={clsx(
                "px-4 py-2 text-sm font-medium rounded-xl transition-all shadow-lg hover:shadow-xl text-white",
                "bg-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/80",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
