import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../contexts/NotificationContext";
import {
  notificationColors,
  type Notification,
  type NotificationType,
} from "../../types/notifications";
import clsx from "clsx";

// Format relative time
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
  return `${days}d ago`;
}

// Icon components for notification types
function NotificationIcon({ type }: { type: NotificationType }) {
  const color = notificationColors[type];

  switch (type) {
    case "task_completed":
    case "session_completed":
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );

    case "task_failed":
    case "session_error":
    case "build_failed":
    case "qa_failed":
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );

    case "feature_completed":
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
          />
        </svg>
      );

    case "feature_needs_input":
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
      );

    case "session_needs_approval":
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
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
      );

    case "build_success":
    case "qa_passed":
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      );

    default:
      return (
        <svg
          className="w-5 h-5"
          style={{ color }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
  }
}

// Single notification item
function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  onClick,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onClick?: (notification: Notification) => void;
}) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    onClick?.(notification);
  };

  return (
    <div
      className={clsx(
        "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-[var(--bg-tertiary)]",
        !notification.read && "bg-[var(--accent-primary)]/5",
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <NotificationIcon type={notification.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-medium text-sm text-[var(--text-primary)] truncate">
            {notification.title}
          </div>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-sm text-[var(--text-secondary)] truncate">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-[var(--text-tertiary)]">
            {formatTimeAgo(notification.timestamp)}
          </span>
          {notification.metadata?.actionLabel && (
            <span className="text-xs text-[var(--accent-primary)] hover:underline">
              {notification.metadata.actionLabel}
            </span>
          )}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        className="flex-shrink-0 p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        title="Dismiss"
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

// Main NotificationCenter component
export function NotificationCenter({
  onNotificationClick,
}: {
  onNotificationClick?: (notification: Notification) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    notifications,
    stats,
    markAsRead,
    markAllAsRead,
    dismiss,
    dismissAll,
    getCritical,
  } = useNotifications();

  const criticalCount = getCritical().length;
  const hasUnread = stats.unread > 0;

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "relative p-2 rounded-lg transition-colors",
          isOpen
            ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
        )}
        title="Notifications"
      >
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
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Badge */}
        {hasUnread && (
          <span
            className={clsx(
              "absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full",
              criticalCount > 0
                ? "bg-[var(--accent-rose)] text-white animate-pulse"
                : "bg-[var(--accent-primary)] text-white",
            )}
          >
            {stats.unread > 99 ? "99+" : stats.unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-96 max-h-[70vh] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-xl shadow-xl overflow-hidden z-50 animate-slide-down"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
            <h3 className="font-semibold text-[var(--text-primary)]">
              Notifications
            </h3>
            <div className="flex items-center gap-2">
              {stats.unread > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-[var(--accent-primary)] hover:underline"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={dismissAll}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Critical alerts section */}
          {criticalCount > 0 && (
            <div className="bg-[var(--accent-rose)]/10 border-b border-[var(--accent-rose)]/20">
              <div className="px-4 py-2 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-[var(--accent-rose)]"
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
                <span className="text-sm font-medium text-[var(--accent-rose)]">
                  {criticalCount} action{criticalCount > 1 ? "s" : ""} required
                </span>
              </div>
            </div>
          )}

          {/* Notifications list */}
          <div className="overflow-y-auto max-h-[calc(70vh-100px)]">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <svg
                  className="w-12 h-12 mx-auto text-[var(--text-tertiary)] opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="mt-4 text-sm text-[var(--text-tertiary)]">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDismiss={dismiss}
                    onClick={onNotificationClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// CSS for animation (add to your global styles or a <style> tag)
// @keyframes slide-down {
//   from { opacity: 0; transform: translateY(-8px); }
//   to { opacity: 1; transform: translateY(0); }
// }
// .animate-slide-down { animation: slide-down 0.15s ease-out; }
