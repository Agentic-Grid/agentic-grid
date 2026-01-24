import { useEffect, useRef } from "react";
import { clsx } from "clsx";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus the confirm button when dialog opens
    confirmButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: (
        <svg
          className="w-6 h-6 text-[var(--accent-rose)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      ),
      confirmButton:
        "bg-[var(--accent-rose)] hover:bg-[var(--accent-rose)]/80 text-white",
    },
    warning: {
      icon: (
        <svg
          className="w-6 h-6 text-[var(--accent-amber)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      confirmButton:
        "bg-[var(--accent-amber)] hover:bg-[var(--accent-amber)]/80 text-black",
    },
    default: {
      icon: (
        <svg
          className="w-6 h-6 text-[var(--accent-primary)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      confirmButton: "btn-primary",
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-[var(--border-subtle)] glass-elevated animate-slide-up window-glow-strong"
      >
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2.5 rounded-xl glass border border-[var(--border-subtle)]">
              {variantStyles[variant].icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3
                id="confirm-dialog-title"
                className="text-lg font-semibold text-[var(--text-primary)]"
              >
                {title}
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium rounded-xl glass border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              className={clsx(
                "px-4 py-2 text-sm font-medium rounded-xl transition-all shadow-lg hover:shadow-xl",
                variantStyles[variant].confirmButton,
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
