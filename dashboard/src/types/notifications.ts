// Notification Types for Dashboard

export type NotificationType =
  | "task_completed"
  | "task_failed"
  | "feature_completed"
  | "feature_needs_input"
  | "session_needs_approval"
  | "session_completed"
  | "session_error"
  | "build_success"
  | "build_failed"
  | "qa_passed"
  | "qa_failed";

export type NotificationPriority = "low" | "medium" | "high" | "critical";

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  dismissed: boolean;

  // Optional metadata for different notification types
  metadata?: {
    // For task notifications
    taskId?: string;
    taskTitle?: string;
    featureId?: string;
    featureTitle?: string;

    // For session notifications
    sessionId?: string;
    projectPath?: string;
    projectName?: string;

    // For approval notifications
    toolName?: string;
    commandPreview?: string;

    // For user input notifications
    requiredVariables?: Array<{
      name: string;
      description: string;
      howToGet?: string;
    }>;

    // Action URL or callback
    actionUrl?: string;
    actionLabel?: string;
  };
}

export interface NotificationFilters {
  types?: NotificationType[];
  priorities?: NotificationPriority[];
  read?: boolean;
  dismissed?: boolean;
  since?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

// Notification creation helpers
export function createTaskNotification(
  taskId: string,
  taskTitle: string,
  type: "completed" | "failed",
  featureId?: string,
  featureTitle?: string,
): Omit<Notification, "id" | "timestamp"> {
  const isCompleted = type === "completed";
  return {
    type: isCompleted ? "task_completed" : "task_failed",
    priority: isCompleted ? "low" : "high",
    title: isCompleted ? "Task Completed" : "Task Failed",
    message: `${taskTitle}${featureTitle ? ` (${featureTitle})` : ""}`,
    read: false,
    dismissed: false,
    metadata: {
      taskId,
      taskTitle,
      featureId,
      featureTitle,
    },
  };
}

export function createFeatureNotification(
  featureId: string,
  featureTitle: string,
  type: "completed" | "needs_input",
  requiredVariables?: Notification["metadata"]["requiredVariables"],
): Omit<Notification, "id" | "timestamp"> {
  if (type === "needs_input") {
    return {
      type: "feature_needs_input",
      priority: "high",
      title: "User Input Required",
      message: `${featureTitle} needs external credentials`,
      read: false,
      dismissed: false,
      metadata: {
        featureId,
        featureTitle,
        requiredVariables,
        actionLabel: "View Details",
      },
    };
  }

  return {
    type: "feature_completed",
    priority: "medium",
    title: "Feature Completed",
    message: featureTitle,
    read: false,
    dismissed: false,
    metadata: {
      featureId,
      featureTitle,
    },
  };
}

export function createSessionApprovalNotification(
  sessionId: string,
  projectName: string,
  toolName: string,
  commandPreview?: string,
): Omit<Notification, "id" | "timestamp"> {
  return {
    type: "session_needs_approval",
    priority: "critical",
    title: "Approval Required",
    message: `${projectName}: ${toolName} needs permission`,
    read: false,
    dismissed: false,
    metadata: {
      sessionId,
      projectName,
      toolName,
      commandPreview,
      actionLabel: "Review",
    },
  };
}

export function createBuildNotification(
  projectName: string,
  success: boolean,
  sessionId?: string,
): Omit<Notification, "id" | "timestamp"> {
  return {
    type: success ? "build_success" : "build_failed",
    priority: success ? "low" : "high",
    title: success ? "Build Successful" : "Build Failed",
    message: projectName,
    read: false,
    dismissed: false,
    metadata: {
      projectName,
      sessionId,
    },
  };
}

export function createQANotification(
  featureId: string,
  featureTitle: string,
  passed: boolean,
): Omit<Notification, "id" | "timestamp"> {
  return {
    type: passed ? "qa_passed" : "qa_failed",
    priority: passed ? "medium" : "high",
    title: passed ? "QA Passed" : "QA Failed",
    message: featureTitle,
    read: false,
    dismissed: false,
    metadata: {
      featureId,
      featureTitle,
    },
  };
}

// Icon mapping for notification types
export const notificationIcons: Record<NotificationType, string> = {
  task_completed: "check-circle",
  task_failed: "x-circle",
  feature_completed: "flag",
  feature_needs_input: "key",
  session_needs_approval: "shield-alert",
  session_completed: "terminal",
  session_error: "alert-triangle",
  build_success: "package-check",
  build_failed: "package-x",
  qa_passed: "badge-check",
  qa_failed: "badge-x",
};

// Color mapping for notification types
export const notificationColors: Record<NotificationType, string> = {
  task_completed: "var(--accent-emerald)",
  task_failed: "var(--accent-rose)",
  feature_completed: "var(--accent-primary)",
  feature_needs_input: "var(--accent-amber)",
  session_needs_approval: "var(--accent-rose)",
  session_completed: "var(--accent-emerald)",
  session_error: "var(--accent-rose)",
  build_success: "var(--accent-emerald)",
  build_failed: "var(--accent-rose)",
  qa_passed: "var(--accent-emerald)",
  qa_failed: "var(--accent-rose)",
};
