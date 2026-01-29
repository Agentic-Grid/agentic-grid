/**
 * NewFileDialog Component
 * Modal for creating new files or folders
 */

import { useState, useEffect, useRef } from "react";
import { clsx } from "clsx";

// =============================================================================
// ICONS
// =============================================================================

function IconFile({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function IconFolder({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
      />
    </svg>
  );
}

// =============================================================================
// VALIDATION
// =============================================================================

// eslint-disable-next-line no-control-regex
const INVALID_CHARS = /[<>:"/\\|?*\x00-\x1F]/;
const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

function validateFileName(name: string): string | null {
  if (!name.trim()) {
    return "Name cannot be empty";
  }

  if (INVALID_CHARS.test(name)) {
    return "Name contains invalid characters";
  }

  if (RESERVED_NAMES.test(name)) {
    return "This name is reserved by the system";
  }

  if (name.startsWith(".") && name.length === 1) {
    return "Name cannot be just a dot";
  }

  if (name.endsWith(" ") || name.endsWith(".")) {
    return "Name cannot end with a space or period";
  }

  return null;
}

// =============================================================================
// NEW FILE DIALOG COMPONENT
// =============================================================================

interface NewFileDialogProps {
  isOpen: boolean;
  type: "file" | "directory";
  parentPath: string;
  onClose: () => void;
  onCreate: (name: string) => void;
  isCreating?: boolean;
}

export function NewFileDialog({
  isOpen,
  type,
  parentPath,
  onClose,
  onCreate,
  isCreating = false,
}: NewFileDialogProps) {
  // Initialize with empty values - component mounts fresh each time
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input after dialog mounts
  useEffect(() => {
    const timeoutId = setTimeout(() => inputRef.current?.focus(), 100);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateFileName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    onCreate(name);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setError(null);
  };

  const fullPath = parentPath ? `${parentPath}/${name}` : name;
  const isFile = type === "file";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-file-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md mx-4 glass-elevated border border-[var(--border-subtle)] rounded-2xl animate-slide-up window-glow-strong">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Icon and Title */}
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-2.5 rounded-xl glass border border-[var(--border-subtle)]">
                {isFile ? (
                  <IconFile className="w-6 h-6 text-[var(--accent-primary)]" />
                ) : (
                  <IconFolder className="w-6 h-6 text-[var(--accent-amber)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  id="new-file-dialog-title"
                  className="text-lg font-semibold text-[var(--text-primary)]"
                >
                  New {isFile ? "File" : "Folder"}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-tertiary)]">
                  Create a new {isFile ? "file" : "folder"} in {parentPath || "root"}
                </p>
              </div>
            </div>

            {/* Input */}
            <div className="mt-6">
              <label
                htmlFor="new-file-name"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
              >
                Name
              </label>
              <input
                ref={inputRef}
                id="new-file-name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={isFile ? "filename.ts" : "folder-name"}
                disabled={isCreating}
                className={clsx(
                  "w-full px-4 py-2.5 rounded-xl glass border text-[var(--text-primary)] placeholder-[var(--text-tertiary)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 transition-all",
                  error
                    ? "border-[var(--accent-rose)] focus:ring-[var(--accent-rose)]/50"
                    : "border-[var(--border-subtle)]",
                  isCreating && "opacity-50 cursor-not-allowed"
                )}
              />
              {error && (
                <p className="mt-2 text-sm text-[var(--accent-rose)]">{error}</p>
              )}
            </div>

            {/* Path Preview */}
            {name && (
              <div className="mt-4 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Full path:</p>
                <p className="text-sm font-mono text-[var(--text-secondary)] break-all">
                  {fullPath}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="px-4 py-2 text-sm font-medium rounded-xl glass border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isCreating}
                className={clsx(
                  "px-4 py-2 text-sm font-medium rounded-xl transition-all shadow-lg hover:shadow-xl text-white",
                  "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-dim)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
