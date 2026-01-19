/**
 * Kanban API Service
 * Functions for interacting with the Kanban REST API
 */

import type { Feature, Task, TaskStatus } from "../types/kanban";
import type { ApiResponse } from "../types";

const BASE_URL = "/api/kanban";

// =============================================================================
// GENERIC API HELPERS
// =============================================================================

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || `API error: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

async function postApi<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || `API error: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

async function putApi<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || `API error: ${response.status} ${response.statusText}`,
    );
  }
  return response.json();
}

// =============================================================================
// PROJECT API
// =============================================================================

export interface KanbanProject {
  id: string;
  name: string;
  slug?: string;
  path?: string;
  description?: string;
  status: "active" | "paused" | "archived" | "failed";
  created_at: string;
  updated_at: string;
}

/**
 * Get all projects
 */
export async function getProjects(): Promise<KanbanProject[]> {
  const response = await fetchApi<ApiResponse<KanbanProject[]>>("/projects");
  return response.data;
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<KanbanProject> {
  const response = await fetchApi<ApiResponse<KanbanProject>>(
    `/projects/${encodeURIComponent(projectId)}`,
  );
  return response.data;
}

// =============================================================================
// FEATURE API
// =============================================================================

/**
 * Get all features, optionally filtered by project
 */
export async function getFeatures(projectId?: string): Promise<Feature[]> {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  const response = await fetchApi<ApiResponse<Feature[]>>(`/features${query}`);
  return response.data;
}

/**
 * Get a single feature by ID
 */
export async function getFeature(featureId: string): Promise<Feature> {
  const response = await fetchApi<ApiResponse<Feature>>(
    `/features/${encodeURIComponent(featureId)}`,
  );
  return response.data;
}

// =============================================================================
// TASK API
// =============================================================================

/**
 * Get all tasks for a feature
 */
export async function getTasks(featureId: string): Promise<Task[]> {
  const response = await fetchApi<ApiResponse<Task[]>>(
    `/features/${encodeURIComponent(featureId)}/tasks`,
  );
  return response.data;
}

/**
 * Get a single task by ID
 */
export async function getTask(taskId: string): Promise<Task> {
  const response = await fetchApi<ApiResponse<Task>>(
    `/tasks/${encodeURIComponent(taskId)}`,
  );
  return response.data;
}

/**
 * Update a task's status
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<Task> {
  const response = await putApi<ApiResponse<Task>>(
    `/tasks/${encodeURIComponent(taskId)}/status`,
    { status },
  );
  return response.data;
}

/**
 * Move a task to a new column (for drag-and-drop)
 */
export async function moveTask(
  taskId: string,
  column: TaskStatus,
  order?: number,
): Promise<Task> {
  const response = await putApi<ApiResponse<Task>>(
    `/tasks/${encodeURIComponent(taskId)}/move`,
    { column, order },
  );
  return response.data;
}

/**
 * Start a task by spawning a Claude session with task context
 * @param taskId - The task ID to start
 * @param skipPermissions - Whether to skip permission prompts (for automated execution)
 * @returns Session info if successful
 */
export async function startTask(
  taskId: string,
  skipPermissions: boolean = false,
): Promise<{
  success: boolean;
  sessionId?: string;
  pid?: number;
  taskId: string;
  agent: string;
  projectPath: string;
}> {
  const response = await postApi<
    ApiResponse<{
      success: boolean;
      sessionId?: string;
      pid?: number;
      taskId: string;
      agent: string;
      projectPath: string;
    }>
  >(`/tasks/${encodeURIComponent(taskId)}/start`, { skipPermissions });
  return response.data;
}

// =============================================================================
// INDEX API
// =============================================================================

/**
 * Get the task index for a feature (summary of tasks by status)
 */
export async function getTaskIndex(featureId: string): Promise<{
  summary: {
    total: number;
    pending: number;
    in_progress: number;
    blocked: number;
    qa: number;
    completed: number;
  };
  by_status: {
    pending: Array<{ id: string; title: string; agent: string }>;
    in_progress: Array<{ id: string; title: string; agent: string }>;
    blocked: Array<{ id: string; title: string; agent: string }>;
    qa: Array<{ id: string; title: string; agent: string }>;
    completed: Array<{ id: string; title: string; agent: string }>;
  };
}> {
  const response = await fetchApi<
    ApiResponse<{
      summary: {
        total: number;
        pending: number;
        in_progress: number;
        blocked: number;
        qa: number;
        completed: number;
      };
      by_status: {
        pending: Array<{ id: string; title: string; agent: string }>;
        in_progress: Array<{ id: string; title: string; agent: string }>;
        blocked: Array<{ id: string; title: string; agent: string }>;
        qa: Array<{ id: string; title: string; agent: string }>;
        completed: Array<{ id: string; title: string; agent: string }>;
      };
    }>
  >(`/index/${encodeURIComponent(featureId)}`);
  return response.data;
}

/**
 * Regenerate indexes for a feature
 */
export async function regenerateIndexes(
  featureId: string,
): Promise<{ success: boolean }> {
  const response = await postApi<ApiResponse<{ success: boolean }>>(
    "/index/regenerate",
    { featureId },
  );
  return response.data;
}

// =============================================================================
// DASHBOARD API
// =============================================================================

/**
 * Get aggregated dashboard data
 */
export async function getDashboard(): Promise<{
  totals: {
    projects: number;
    projects_active: number;
    features: number;
    features_in_progress: number;
    tasks_total: number;
    tasks_pending: number;
    tasks_in_progress: number;
    tasks_blocked: number;
    tasks_qa: number;
    tasks_completed: number;
  };
  agents_active: Array<{
    agent: string;
    project: string;
    task: string;
    started_at: string;
  }>;
  recent_activity: Array<{
    timestamp: string;
    project: string;
    feature: string;
    task: string;
    agent: string;
    action: string;
    details?: string;
  }>;
}> {
  const response = await fetchApi<
    ApiResponse<{
      totals: {
        projects: number;
        projects_active: number;
        features: number;
        features_in_progress: number;
        tasks_total: number;
        tasks_pending: number;
        tasks_in_progress: number;
        tasks_blocked: number;
        tasks_qa: number;
        tasks_completed: number;
      };
      agents_active: Array<{
        agent: string;
        project: string;
        task: string;
        started_at: string;
      }>;
      recent_activity: Array<{
        timestamp: string;
        project: string;
        feature: string;
        task: string;
        agent: string;
        action: string;
        details?: string;
      }>;
    }>
  >("/dashboard");
  return response.data;
}
