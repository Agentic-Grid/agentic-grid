import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStats,
} from "../types/notifications";
import { subscribeToUpdates } from "../services/api";

interface NotificationContextValue {
  notifications: Notification[];
  stats: NotificationStats;

  // Actions
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp">,
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  clearAll: () => void;

  // Filtering
  getUnread: () => Notification[];
  getByType: (type: NotificationType) => Notification[];
  getByPriority: (priority: NotificationPriority) => Notification[];
  getCritical: () => Notification[];
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

// Helper to generate unique IDs
function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate stats from notifications
function calculateStats(notifications: Notification[]): NotificationStats {
  const stats: NotificationStats = {
    total: notifications.length,
    unread: 0,
    byType: {} as Record<NotificationType, number>,
    byPriority: {} as Record<NotificationPriority, number>,
  };

  for (const notif of notifications) {
    if (!notif.read && !notif.dismissed) {
      stats.unread++;
    }

    stats.byType[notif.type] = (stats.byType[notif.type] || 0) + 1;
    stats.byPriority[notif.priority] =
      (stats.byPriority[notif.priority] || 0) + 1;
  }

  return stats;
}

// Local storage key
const STORAGE_KEY = "claude-dashboard-notifications";
const MAX_NOTIFICATIONS = 100; // Keep last 100 notifications

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out old dismissed notifications (older than 24 hours)
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        return parsed.filter(
          (n: Notification) => !n.dismissed || n.timestamp > cutoff,
        );
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });

  // Persist notifications to localStorage
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)),
    );
  }, [notifications]);

  // Subscribe to real-time updates for session events
  useEffect(() => {
    const unsubscribe = subscribeToUpdates((data) => {
      // Handle session approval requests
      if (data.type === "approval_request" && data.session) {
        const session = data.session;
        addNotification({
          type: "session_needs_approval",
          priority: "critical",
          title: "Approval Required",
          message: `${session.projectName}: Tool needs permission`,
          read: false,
          dismissed: false,
          metadata: {
            sessionId: session.id,
            projectName: session.projectName,
            projectPath: session.projectPath,
            actionLabel: "Review",
          },
        });
      }

      // Handle session completion
      if (data.type === "session_complete" && data.session) {
        const session = data.session;
        addNotification({
          type: "session_completed",
          priority: "low",
          title: "Session Completed",
          message: session.projectName,
          read: false,
          dismissed: false,
          metadata: {
            sessionId: session.id,
            projectName: session.projectName,
          },
        });
      }

      // Handle task status changes from kanban updates
      if (data.type === "task_update" && data.task) {
        const task = data.task;
        if (task.status === "completed") {
          addNotification({
            type: "task_completed",
            priority: "low",
            title: "Task Completed",
            message: task.title,
            read: false,
            dismissed: false,
            metadata: {
              taskId: task.id,
              taskTitle: task.title,
              featureId: task.featureId,
            },
          });
        } else if (task.status === "awaiting_user_input") {
          addNotification({
            type: "feature_needs_input",
            priority: "high",
            title: "User Input Required",
            message: task.title,
            read: false,
            dismissed: false,
            metadata: {
              taskId: task.id,
              taskTitle: task.title,
              featureId: task.featureId,
              requiredVariables: task.awaitingInput?.requiredVariables,
              actionLabel: "View Details",
            },
          });
        }
      }

      // Handle feature completion
      if (data.type === "feature_update" && data.feature) {
        const feature = data.feature;
        if (feature.status === "completed") {
          addNotification({
            type: "feature_completed",
            priority: "medium",
            title: "Feature Completed",
            message: feature.title,
            read: false,
            dismissed: false,
            metadata: {
              featureId: feature.id,
              featureTitle: feature.title,
            },
          });
        }
      }
    });

    return unsubscribe;
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp">) => {
      const newNotification: Notification = {
        ...notification,
        id: generateId(),
        timestamp: new Date().toISOString(),
      };

      setNotifications((prev) =>
        [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS),
      );

      // Play sound for critical notifications
      if (notification.priority === "critical") {
        playNotificationSound();
      }

      // Show browser notification for high/critical if permitted
      if (
        notification.priority === "critical" ||
        notification.priority === "high"
      ) {
        showBrowserNotification(notification.title, notification.message);
      }
    },
    [],
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, dismissed: true } : n)),
    );
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, dismissed: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const getUnread = useCallback(() => {
    return notifications.filter((n) => !n.read && !n.dismissed);
  }, [notifications]);

  const getByType = useCallback(
    (type: NotificationType) => {
      return notifications.filter((n) => n.type === type && !n.dismissed);
    },
    [notifications],
  );

  const getByPriority = useCallback(
    (priority: NotificationPriority) => {
      return notifications.filter(
        (n) => n.priority === priority && !n.dismissed,
      );
    },
    [notifications],
  );

  const getCritical = useCallback(() => {
    return notifications.filter(
      (n) => n.priority === "critical" && !n.dismissed && !n.read,
    );
  }, [notifications]);

  const stats = useMemo(
    () => calculateStats(notifications.filter((n) => !n.dismissed)),
    [notifications],
  );

  const value: NotificationContextValue = {
    notifications: notifications.filter((n) => !n.dismissed),
    stats,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismiss,
    dismissAll,
    clearAll,
    getUnread,
    getByType,
    getByPriority,
    getCritical,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}

// Helper functions

function playNotificationSound() {
  try {
    // Use Web Audio API for a simple notification sound
    const audioContext = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.2,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    // Audio not supported
  }
}

function showBrowserNotification(title: string, message: string) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, {
      body: message,
      icon: "/favicon.ico",
      tag: "claude-dashboard",
    });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(title, {
          body: message,
          icon: "/favicon.ico",
          tag: "claude-dashboard",
        });
      }
    });
  }
}
