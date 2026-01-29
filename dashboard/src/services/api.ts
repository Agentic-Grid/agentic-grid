import type {
  Session,
  SessionDetail,
  Project,
  Summary,
  ApiResponse,
  ClaudeProcess,
  SlashCommand,
  ProjectSettings,
} from "../types";

const BASE_URL = "/api";

/**
 * Encode a project path to the folder format used by Claude
 * e.g., "/Users/diego/Projects/foo" -> "-Users-diego-Projects-foo"
 */
export function encodeProjectPath(projectPath: string): string {
  if (!projectPath) return "";
  // Remove leading slash and replace remaining slashes with dashes
  return projectPath.replace(/^\//, "").replace(/\//g, "-").replace(/^/, "-");
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// ============================================================================
// Projects
// ============================================================================

export async function getProjects(): Promise<ApiResponse<Project[]>> {
  return fetchApi<ApiResponse<Project[]>>("/projects");
}

export async function spawnProject(name: string): Promise<
  ApiResponse<{
    success: boolean;
    name: string;
    projectPath: string;
    repo: string | null;
    output: string;
  }>
> {
  const response = await fetch(`${BASE_URL}/projects/spawn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to spawn project");
  }
  return response.json();
}

// ============================================================================
// Sessions
// ============================================================================

export async function getAllSessions(): Promise<ApiResponse<Session[]>> {
  return fetchApi<ApiResponse<Session[]>>("/sessions");
}

export async function getProjectSessions(
  projectFolder: string,
): Promise<ApiResponse<Session[]>> {
  return fetchApi<ApiResponse<Session[]>>(
    `/projects/${encodeURIComponent(projectFolder)}/sessions`,
  );
}

export async function getSessionDetail(
  projectFolder: string,
  sessionId: string,
): Promise<ApiResponse<SessionDetail>> {
  return fetchApi<ApiResponse<SessionDetail>>(
    `/projects/${encodeURIComponent(projectFolder)}/sessions/${sessionId}`,
  );
}

export async function getSummary(): Promise<ApiResponse<Summary>> {
  return fetchApi<ApiResponse<Summary>>("/summary");
}

export async function deleteSession(
  projectFolder: string,
  sessionId: string,
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await fetch(
    `${BASE_URL}/projects/${encodeURIComponent(projectFolder)}/sessions/${sessionId}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete session");
  }
  return response.json();
}

// ============================================================================
// Session Names
// ============================================================================

export async function getSessionNames(): Promise<
  ApiResponse<Record<string, string>>
> {
  return fetchApi<ApiResponse<Record<string, string>>>("/session-names");
}

export async function setSessionName(
  sessionId: string,
  name: string,
): Promise<ApiResponse<{ success: boolean; name: string | null }>> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/name`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to set session name");
  }
  return response.json();
}

export async function createNewSession(
  projectPath: string,
  message: string,
  automate: boolean = true, // Default to true for automated execution without permission prompts
): Promise<
  ApiResponse<{ sessionId: string; projectPath: string; pid?: number }>
> {
  const response = await fetch(`${BASE_URL}/sessions/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectPath, message, automate }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create session");
  }
  return response.json();
}

// ============================================================================
// Process Management
// ============================================================================

export async function getProcesses(): Promise<ApiResponse<ClaudeProcess[]>> {
  return fetchApi<ApiResponse<ClaudeProcess[]>>("/processes");
}

// Session status info returned by batch endpoint
export interface SessionStatusInfo {
  running: boolean;
  status: import("../types").SessionStatus;
  pid?: number;
  projectPath?: string;
  startTime?: string;
}

// Batch endpoint to get status for ALL sessions at once
// This reduces API calls from N (one per session) to 1
export async function getAllSessionStatuses(): Promise<
  ApiResponse<Record<string, SessionStatusInfo>>
> {
  return fetchApi<ApiResponse<Record<string, SessionStatusInfo>>>(
    "/sessions/status",
  );
}

// Legacy single-session endpoint (kept for backwards compatibility)
export async function getSessionProcess(
  sessionId: string,
  projectPath: string,
): Promise<ApiResponse<ClaudeProcess | null>> {
  return fetchApi<ApiResponse<ClaudeProcess | null>>(
    `/sessions/${sessionId}/process?projectPath=${encodeURIComponent(projectPath)}`,
  );
}

export async function sendMessage(
  sessionId: string,
  projectPath: string,
  message: string,
  automate: boolean = true, // Default to true for automated execution without permission prompts
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectPath, message, automate }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to send message");
  }
  return response.json();
}

export async function killSession(
  sessionId: string,
  projectPath: string,
): Promise<ApiResponse<{ success: boolean; pid: number }>> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/kill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectPath }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to kill session");
  }
  return response.json();
}

export async function resumeSession(
  sessionId: string,
  projectPath: string,
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectPath }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to resume session");
  }
  return response.json();
}

// ============================================================================
// Real-time Updates
// ============================================================================

// SSE event data types
export interface SSEEventData {
  type: string;
  path?: string;
  session?: {
    id: string;
    projectName: string;
    projectPath: string;
  };
  task?: {
    id: string;
    title: string;
    status: string;
    featureId?: string;
    awaitingInput?: {
      requiredVariables?: Array<{ name: string; description: string }>;
    };
  };
  feature?: {
    id: string;
    title: string;
    status: string;
  };
}

export function subscribeToUpdates(
  onUpdate: (data: SSEEventData) => void,
): () => void {
  const eventSource = new EventSource(`${BASE_URL}/stream`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onUpdate(data);
    } catch {
      // Ignore parse errors
    }
  };

  eventSource.onerror = () => {
    // Will automatically reconnect
  };

  return () => eventSource.close();
}

// Subscribe to session-specific updates (real-time message streaming)
export function subscribeToSession(
  projectFolder: string,
  sessionId: string,
  onMessage: (data: {
    type: string;
    message?: import("../types").ParsedMessage;
    status?: string;
    todos?: import("../types").TodoItem[];
    data?: unknown;
  }) => void,
): () => void {
  const eventSource = new EventSource(
    `${BASE_URL}/projects/${encodeURIComponent(projectFolder)}/sessions/${sessionId}/stream`,
  );

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch {
      // Ignore parse errors
    }
  };

  eventSource.onerror = () => {
    // Will automatically reconnect
  };

  return () => eventSource.close();
}

// ============================================================================
// Session Order
// ============================================================================

export async function getSessionOrder(): Promise<
  ApiResponse<Record<string, number>>
> {
  return fetchApi<ApiResponse<Record<string, number>>>("/session-order");
}

export async function setSessionOrderSingle(
  sessionId: string,
  order: number,
): Promise<ApiResponse<{ success: boolean; order: number }>> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/order`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to set session order");
  }
  return response.json();
}

export async function setSessionOrderBatch(
  orders: Record<string, number>,
): Promise<ApiResponse<{ success: boolean; orders: Record<string, number> }>> {
  const response = await fetch(`${BASE_URL}/session-order/batch`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to set session orders");
  }
  return response.json();
}

// ============================================================================
// Project Order
// ============================================================================

export async function getProjectOrder(): Promise<
  ApiResponse<Record<string, number>>
> {
  return fetchApi<ApiResponse<Record<string, number>>>("/project-order");
}

export async function setProjectOrderBatch(
  orders: Record<string, number>,
): Promise<ApiResponse<{ success: boolean; orders: Record<string, number> }>> {
  const response = await fetch(`${BASE_URL}/project-order/batch`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orders }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to set project orders");
  }
  return response.json();
}

// ============================================================================
// Slash Commands
// ============================================================================

export async function getSlashCommands(
  projectFolder: string,
): Promise<ApiResponse<SlashCommand[]>> {
  return fetchApi<ApiResponse<SlashCommand[]>>(
    `/projects/${encodeURIComponent(projectFolder)}/commands`,
  );
}

// ============================================================================
// Session Approval
// ============================================================================

export async function approveSession(
  sessionId: string,
  projectPath: string,
  options?: { pattern?: string; alwaysAllow?: boolean },
): Promise<ApiResponse<{ success: boolean; patternAdded?: string | null }>> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectPath,
      pattern: options?.pattern,
      alwaysAllow: options?.alwaysAllow,
    }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to approve session");
  }
  return response.json();
}

// ============================================================================
// Project Settings
// ============================================================================

export async function getProjectSettings(
  projectFolder: string,
): Promise<ApiResponse<ProjectSettings>> {
  return fetchApi<ApiResponse<ProjectSettings>>(
    `/projects/${encodeURIComponent(projectFolder)}/settings`,
  );
}

export async function addAllowPattern(
  projectFolder: string,
  pattern: string,
): Promise<ApiResponse<{ allow: string[] }>> {
  const response = await fetch(
    `${BASE_URL}/projects/${encodeURIComponent(projectFolder)}/settings/allow`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern }),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add allow pattern");
  }
  return response.json();
}

export async function removeProjectPermission(
  projectFolder: string,
  pattern: string,
  action: "allow" | "deny",
): Promise<ApiResponse<{ success: boolean; permissions: ProjectSettings["permissions"] }>> {
  const response = await fetch(
    `${BASE_URL}/projects/${encodeURIComponent(projectFolder)}/settings/permission`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern, action }),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove permission");
  }
  return response.json();
}

export async function updateProjectPermission(
  projectFolder: string,
  oldPattern: string,
  newPattern: string,
  action: "allow" | "deny",
): Promise<ApiResponse<{ success: boolean; permissions: ProjectSettings["permissions"] }>> {
  const response = await fetch(
    `${BASE_URL}/projects/${encodeURIComponent(projectFolder)}/settings/permission`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPattern, newPattern, action }),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update permission");
  }
  return response.json();
}

// ============================================================================
// Sandbox Project Management
// ============================================================================

/**
 * Project creation result type
 */
export interface SandboxProject {
  id: string;
  name: string;
  slug: string;
  path: string;
  description: string;
  status: "active" | "paused" | "archived" | "failed";
  created_at: string;
  updated_at: string;
}

/**
 * Validate a project name before creation
 * Checks: format, sandbox existence, GitHub repo existence
 */
export async function validateProjectName(name: string): Promise<
  ApiResponse<{
    valid: boolean;
    error?: string;
    code?: string;
  }>
> {
  const response = await fetch(`${BASE_URL}/projects/validate-name`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to validate project name");
  }
  return response.json();
}

/**
 * Create a new project in the sandbox directory
 */
export async function createProject(
  name: string,
): Promise<
  ApiResponse<{ success: boolean; project: SandboxProject; message: string }>
> {
  const response = await fetch(`${BASE_URL}/projects/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create project");
  }
  return response.json();
}

/**
 * List all projects in the sandbox
 */
export async function listSandboxProjects(): Promise<
  ApiResponse<SandboxProject[]>
> {
  return fetchApi<ApiResponse<SandboxProject[]>>("/projects/sandbox");
}

/**
 * Get a specific sandbox project by name
 */
export async function getSandboxProject(
  name: string,
): Promise<ApiResponse<SandboxProject>> {
  return fetchApi<ApiResponse<SandboxProject>>(
    `/projects/sandbox/${encodeURIComponent(name)}`,
  );
}

/**
 * Check if a sandbox project exists
 */
export async function checkProjectExists(
  name: string,
): Promise<ApiResponse<{ exists: boolean; name: string }>> {
  return fetchApi<ApiResponse<{ exists: boolean; name: string }>>(
    `/projects/sandbox/${encodeURIComponent(name)}/exists`,
  );
}

// ============================================================================
// Discovery & Orchestration
// ============================================================================

/**
 * Discovery session result
 */
export interface DiscoverySessionResult {
  success: boolean;
  sessionId?: string;
  pid?: number;
  status: import("../types").SessionStatus;
  automated: boolean;
}

/**
 * Start a discovery session for a project
 * Spawns a new Claude session with /setup command
 */
export async function startDiscovery(
  projectName: string,
  options?: { automate?: boolean },
): Promise<ApiResponse<DiscoverySessionResult>> {
  const response = await fetch(
    `${BASE_URL}/projects/${encodeURIComponent(projectName)}/start-discovery`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ automate: options?.automate ?? false }),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to start discovery session");
  }
  return response.json();
}

/**
 * Parallel execution options
 */
export interface ExecuteParallelOptions {
  automate?: boolean;
  filterAgents?: string[];
  filterPhases?: number[];
  maxParallelSessions?: number;
  taskTimeoutMs?: number;
  dryRun?: boolean;
}

/**
 * Execution result from parallel execution
 */
export interface ParallelExecutionResult {
  success: boolean;
  execution?: {
    featureId: string;
    status: "pending" | "running" | "completed" | "partial" | "failed";
    phases: Array<{
      phase: number;
      status: string;
      tasks: Array<{
        taskId: string;
        agent: string;
        status: string;
        sessionId?: string;
        error?: string;
      }>;
    }>;
    startedAt: string;
    completedAt?: string;
    error?: string;
  };
  dryRun?: boolean;
  analysis?: unknown;
}

/**
 * Execute all tasks for a feature using parallel orchestration
 */
export async function executeFeatureParallel(
  featureId: string,
  options?: ExecuteParallelOptions,
): Promise<ApiResponse<ParallelExecutionResult>> {
  const response = await fetch(
    `${BASE_URL}/features/${encodeURIComponent(featureId)}/execute-parallel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options ?? {}),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to execute feature");
  }
  return response.json();
}

// ============================================================================
// Project Task Management (YAML-based)
// ============================================================================

/**
 * Task creation input
 */
export interface CreateTaskInput {
  featureId: string;
  title: string;
  agent:
    | "DISCOVERY"
    | "DESIGNER"
    | "DATA"
    | "BACKEND"
    | "FRONTEND"
    | "DEVOPS"
    | "QA";
  instructions: string;
  type?:
    | "enhancement"
    | "design"
    | "schema"
    | "implementation"
    | "automation"
    | "validation";
  priority?: "high" | "medium" | "low";
  phase?: number;
  files?: {
    create?: string[];
    modify?: string[];
    delete?: string[];
  };
  contracts?: Array<{ path: string; changes: string } | string>;
  depends_on?: string[];
  blocks?: string[];
  estimated_minutes?: number;
}

/**
 * Task from YAML file
 */
export interface ProjectTask {
  id: string;
  feature_id: string;
  title: string;
  agent: string;
  status: "pending" | "in_progress" | "blocked" | "qa" | "completed";
  priority: "high" | "medium" | "low";
  type: string;
  phase: number;
  depends_on: string[];
  blocks: string[];
  files: { create?: string[]; modify?: string[]; delete?: string[] } | string[];
  contracts: Array<{ path: string; changes: string } | string>;
  instructions: string;
  progress: Array<{
    timestamp: string;
    agent: string;
    action?: string;
    note: string;
  }>;
  qa: {
    required: boolean;
    status: "pending" | "passed" | "failed";
    checklist: string[];
  };
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

/**
 * Create a task in a sandbox project
 */
export async function createProjectTask(
  projectName: string,
  task: CreateTaskInput,
): Promise<ApiResponse<ProjectTask>> {
  const response = await fetch(
    `${BASE_URL}/projects/${encodeURIComponent(projectName)}/tasks`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create task");
  }
  return response.json();
}

/**
 * Get all tasks for a feature in a sandbox project
 */
export async function getProjectTasks(
  projectName: string,
  featureId: string,
): Promise<ApiResponse<ProjectTask[]>> {
  return fetchApi<ApiResponse<ProjectTask[]>>(
    `/projects/${encodeURIComponent(projectName)}/tasks?featureId=${encodeURIComponent(featureId)}`,
  );
}

/**
 * Get a single task from a sandbox project
 */
export async function getProjectTask(
  projectName: string,
  taskId: string,
  featureId: string,
): Promise<ApiResponse<ProjectTask>> {
  return fetchApi<ApiResponse<ProjectTask>>(
    `/projects/${encodeURIComponent(projectName)}/tasks/${encodeURIComponent(taskId)}?featureId=${encodeURIComponent(featureId)}`,
  );
}

/**
 * Update a task's status in a sandbox project
 */
export async function updateProjectTaskStatus(
  projectName: string,
  taskId: string,
  status: "pending" | "in_progress" | "blocked" | "qa" | "completed",
  note?: string,
): Promise<ApiResponse<ProjectTask>> {
  const response = await fetch(
    `${BASE_URL}/projects/${encodeURIComponent(projectName)}/tasks/${encodeURIComponent(taskId)}/status`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, note }),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update task status");
  }
  return response.json();
}

// ============================================================================
// Onboarding
// ============================================================================

import type { OnboardingState, OnboardingQuestion } from "../types/kanban";

/**
 * Get onboarding state for a project
 */
export async function getOnboardingState(
  projectName: string,
): Promise<ApiResponse<OnboardingState>> {
  return fetchApi<ApiResponse<OnboardingState>>(
    `/kanban/projects/${encodeURIComponent(projectName)}/onboard`,
  );
}

/**
 * Initialize onboarding for a project (creates QUESTIONS.yaml)
 */
export async function initOnboarding(
  projectName: string,
): Promise<ApiResponse<OnboardingState>> {
  const response = await fetch(
    `${BASE_URL}/kanban/projects/${encodeURIComponent(projectName)}/onboard/init`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to initialize onboarding");
  }
  return response.json();
}

/**
 * Save onboarding answers
 */
export async function saveOnboardingAnswers(
  projectName: string,
  answers: Record<string, string | string[] | null>,
): Promise<ApiResponse<OnboardingState>> {
  const response = await fetch(
    `${BASE_URL}/kanban/projects/${encodeURIComponent(projectName)}/onboard/answers`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to save answers");
  }
  return response.json();
}

/**
 * Get pending questions for a project
 */
export async function getPendingQuestions(
  projectName: string,
): Promise<ApiResponse<OnboardingQuestion[]>> {
  return fetchApi<ApiResponse<OnboardingQuestion[]>>(
    `/kanban/projects/${encodeURIComponent(projectName)}/onboard/pending`,
  );
}

/**
 * Start the Claude /onboard session
 */
export async function startOnboardSession(
  projectName: string,
): Promise<ApiResponse<{ sessionId: string; logFile?: string }>> {
  const response = await fetch(
    `${BASE_URL}/kanban/projects/${encodeURIComponent(projectName)}/onboard/start`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to start onboard session");
  }
  return response.json();
}

/**
 * Onboarding progress response
 */
export interface OnboardingProgress {
  projectName: string;
  featuresCount: number;
  tasksCount: number;
  features: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  sessionId?: string;
  sessionRunning: boolean;
  logs: string[];
}

/**
 * Get onboarding progress including session logs and feature/task counts
 */
export async function getOnboardingProgress(
  projectName: string,
  sessionId?: string,
): Promise<ApiResponse<OnboardingProgress>> {
  const params = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  return fetchApi<ApiResponse<OnboardingProgress>>(
    `/kanban/projects/${encodeURIComponent(projectName)}/onboard/progress${params}`,
  );
}

// ============================================================================
// State
// ============================================================================

import type { ProjectState } from "../types/state";

/**
 * Get project state (single source of truth)
 */
export async function getProjectState(
  projectName: string,
): Promise<ApiResponse<ProjectState>> {
  return fetchApi<ApiResponse<ProjectState>>(
    `/kanban/projects/${encodeURIComponent(projectName)}/state`,
  );
}

/**
 * Get project state summary (human-readable)
 */
export async function getProjectStateSummary(
  projectName: string,
): Promise<ApiResponse<string>> {
  return fetchApi<ApiResponse<string>>(
    `/kanban/projects/${encodeURIComponent(projectName)}/state/summary`,
  );
}

/**
 * Sync project progress metrics
 */
export async function syncProjectProgress(
  projectName: string,
): Promise<ApiResponse<ProjectState>> {
  const response = await fetch(
    `${BASE_URL}/kanban/projects/${encodeURIComponent(projectName)}/state/sync-progress`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to sync progress");
  }
  return response.json();
}

// ============================================================================
// Resources Hub
// ============================================================================

/**
 * Resource types
 */
export type ResourceType =
  | "skill"
  | "agent"
  | "command"
  | "mcp"
  | "plugin"
  | "hook"
  | "permission";

export type ResourceCategory =
  | "development"
  | "productivity"
  | "ai"
  | "data"
  | "testing"
  | "devops"
  | "design"
  | "integration"
  | "other";

export type TrustLevel = "high" | "medium" | "low" | "unknown";

export interface Resource {
  id: string;
  name: string;
  description: string;
  type: ResourceType;
  source: "local" | "marketplace" | "url" | "custom";
  category: ResourceCategory;
  tags: string[];
  installed: boolean;
  enabled: boolean;
  filePath?: string;
  content?: string;
  trustLevel: TrustLevel;
  warning?: string;
  // For MCPs
  package?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  requiresConfig?: boolean;
  configSchema?: ConfigSchema;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  installedAt?: string;
}

export interface ConfigField {
  name: string;
  type: "string" | "number" | "boolean" | "select" | "password";
  label: string;
  description?: string;
  required: boolean;
  default?: string | number | boolean;
  options?: string[];
  placeholder?: string;
  envVar?: string;
}

export interface ConfigSchema {
  fields: ConfigField[];
}

export interface MarketplaceEntry extends Resource {
  sourceRepo: string;
  sourcePath: string;
  sourceUrl: string;
  stars?: number;
  verified: boolean;
  quality: "high" | "medium" | "low" | "unknown";
  contentUrl?: string;
}

export interface ResourceListResponse {
  resources: Resource[];
  total: number;
  byType: Partial<Record<ResourceType, number>>;
}

export interface MarketplaceResponse {
  resources: MarketplaceEntry[];
  total: number;
  catalogInfo: {
    version: string;
    updatedAt: string;
    totalResources: number;
  };
}

/**
 * Get all installed resources
 */
export async function getInstalledResources(): Promise<
  ApiResponse<ResourceListResponse>
> {
  return fetchApi<ApiResponse<ResourceListResponse>>("/resources/installed");
}

/**
 * Get a single installed resource by ID
 */
export async function getResourceById(
  id: string,
): Promise<ApiResponse<Resource>> {
  return fetchApi<ApiResponse<Resource>>(
    `/resources/installed/${encodeURIComponent(id)}`,
  );
}

/**
 * Get resource content (markdown)
 */
export async function getResourceContent(
  id: string,
): Promise<ApiResponse<{ id: string; content: string }>> {
  return fetchApi<ApiResponse<{ id: string; content: string }>>(
    `/resources/installed/${encodeURIComponent(id)}/content`,
  );
}

/**
 * Get marketplace resources
 */
export async function getMarketplaceResources(options?: {
  type?: ResourceType;
  category?: ResourceCategory;
  trustLevel?: TrustLevel;
  search?: string;
}): Promise<ApiResponse<MarketplaceResponse>> {
  const params = new URLSearchParams();
  if (options?.type) params.set("type", options.type);
  if (options?.category) params.set("category", options.category);
  if (options?.trustLevel) params.set("trustLevel", options.trustLevel);
  if (options?.search) params.set("search", options.search);

  const query = params.toString();
  return fetchApi<ApiResponse<MarketplaceResponse>>(
    `/resources/marketplace${query ? `?${query}` : ""}`,
  );
}

/**
 * Get featured marketplace resources
 */
export async function getFeaturedResources(): Promise<
  ApiResponse<MarketplaceEntry[]>
> {
  return fetchApi<ApiResponse<MarketplaceEntry[]>>(
    "/resources/marketplace/featured",
  );
}

/**
 * Get marketplace statistics
 */
export async function getMarketplaceStats(): Promise<
  ApiResponse<{
    total: number;
    byType: Record<ResourceType, number>;
    byCategory: Record<ResourceCategory, number>;
    byTrustLevel: Record<TrustLevel, number>;
    verified: number;
  }>
> {
  return fetchApi("/resources/marketplace/stats");
}

/**
 * Create a new resource
 */
export async function createResource(data: {
  name: string;
  type: "skill" | "agent" | "command";
  description: string;
  content: string;
  category?: ResourceCategory;
  tags?: string[];
}): Promise<ApiResponse<Resource>> {
  const response = await fetch(`${BASE_URL}/resources`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create resource");
  }
  return response.json();
}

/**
 * Update a resource
 */
export async function updateResource(
  id: string,
  data: {
    name?: string;
    description?: string;
    content?: string;
    enabled?: boolean;
  },
): Promise<ApiResponse<Resource>> {
  const response = await fetch(
    `${BASE_URL}/resources/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update resource");
  }
  return response.json();
}

/**
 * Delete a resource
 */
export async function deleteResource(
  id: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch(
    `${BASE_URL}/resources/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete resource");
  }
  return response.json();
}

/**
 * Install a resource from marketplace
 */
export async function installResource(
  resourceId: string,
  config?: Record<string, string>,
): Promise<ApiResponse<{ success: boolean; resource: Resource; message: string }>> {
  const response = await fetch(`${BASE_URL}/resources/install`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceId, config }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to install resource");
  }
  return response.json();
}

/**
 * Uninstall an MCP server
 */
export async function uninstallMCP(
  name: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch(`${BASE_URL}/resources/uninstall-mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to uninstall MCP");
  }
  return response.json();
}

/**
 * Add a hook
 */
export async function addHook(
  event: string,
  command: string,
  runInBackground?: boolean,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch(`${BASE_URL}/resources/hooks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, command, runInBackground }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add hook");
  }
  return response.json();
}

/**
 * Remove a hook
 */
export async function removeHook(
  event: string,
  index: number,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch(`${BASE_URL}/resources/hooks`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, index }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove hook");
  }
  return response.json();
}

/**
 * Add a permission
 */
export async function addPermission(
  pattern: string,
  action: "allow" | "deny",
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch(`${BASE_URL}/resources/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pattern, action }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to add permission");
  }
  return response.json();
}

/**
 * Remove a permission
 */
export async function removePermission(
  pattern: string,
  action: "allow" | "deny",
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch(`${BASE_URL}/resources/permissions`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pattern, action }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to remove permission");
  }
  return response.json();
}

/**
 * Get resources for a sandbox project
 */
export async function getProjectResources(
  projectName: string,
): Promise<
  ApiResponse<{ project: string; resources: Resource[]; total: number }>
> {
  return fetchApi(
    `/resources/projects/${encodeURIComponent(projectName)}`,
  );
}

// ============================================================================
// Git Operations
// ============================================================================

import type { GitStatus, FileDiff, GitCommit, GitHistoryWithStatus } from "../types";

/**
 * Check if a project directory is a git repository
 */
export async function isGitRepo(
  projectName: string,
): Promise<ApiResponse<{ isGitRepo: boolean }>> {
  return fetchApi(`/git/${encodeURIComponent(projectName)}/is-repo`);
}

/**
 * Get git status for a project
 */
export async function getGitStatus(
  projectName: string,
): Promise<ApiResponse<GitStatus>> {
  return fetchApi(`/git/${encodeURIComponent(projectName)}/status`);
}

/**
 * Get diff for files in a project
 */
export async function getGitDiff(
  projectName: string,
  options?: { file?: string; staged?: boolean; context?: number },
): Promise<ApiResponse<FileDiff[]>> {
  const params = new URLSearchParams();
  if (options?.file) params.set("file", options.file);
  if (options?.staged !== undefined) params.set("staged", String(options.staged));
  if (options?.context !== undefined) params.set("context", String(options.context));

  const queryString = params.toString();
  const url = `/git/${encodeURIComponent(projectName)}/diff${queryString ? `?${queryString}` : ""}`;
  return fetchApi(url);
}

/**
 * Stage files for commit
 */
export async function stageFiles(
  projectName: string,
  files: string[],
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await fetch(
    `${BASE_URL}/git/${encodeURIComponent(projectName)}/stage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to stage files");
  }
  return response.json();
}

/**
 * Stage all changes
 */
export async function stageAll(
  projectName: string,
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await fetch(
    `${BASE_URL}/git/${encodeURIComponent(projectName)}/stage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to stage all files");
  }
  return response.json();
}

/**
 * Unstage files
 */
export async function unstageFiles(
  projectName: string,
  files: string[],
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await fetch(
    `${BASE_URL}/git/${encodeURIComponent(projectName)}/unstage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to unstage files");
  }
  return response.json();
}

/**
 * Unstage all files
 */
export async function unstageAll(
  projectName: string,
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await fetch(
    `${BASE_URL}/git/${encodeURIComponent(projectName)}/unstage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to unstage all files");
  }
  return response.json();
}

/**
 * Create a commit with staged changes
 */
export async function createCommit(
  projectName: string,
  message: string,
): Promise<ApiResponse<GitCommit>> {
  const response = await fetch(
    `${BASE_URL}/git/${encodeURIComponent(projectName)}/commit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create commit");
  }
  return response.json();
}

/**
 * Get commit history for a project
 */
export async function getGitHistory(
  projectName: string,
  options?: { limit?: number; skip?: number },
): Promise<ApiResponse<GitHistoryWithStatus>> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) params.set("limit", String(options.limit));
  if (options?.skip !== undefined) params.set("skip", String(options.skip));

  const queryString = params.toString();
  const url = `/git/${encodeURIComponent(projectName)}/history${queryString ? `?${queryString}` : ""}`;
  return fetchApi(url);
}

/**
 * Initialize a new git repository
 */
export async function initGitRepo(
  projectName: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch(
    `${BASE_URL}/git/${encodeURIComponent(projectName)}/init`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to initialize git repository");
  }
  return response.json();
}

/**
 * Push commits to remote
 */
export async function pushGit(
  projectName: string,
  options?: { remote?: string; branch?: string },
): Promise<ApiResponse<{ pushed: boolean; message: string }>> {
  const response = await fetch(
    `${BASE_URL}/git/${encodeURIComponent(projectName)}/push`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options || {}),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to push");
  }
  return response.json();
}

/**
 * Get diff for a specific commit (all files changed in that commit)
 */
export async function getCommitDiff(
  projectName: string,
  commitHash: string,
): Promise<ApiResponse<FileDiff[]>> {
  return fetchApi(
    `/git/${encodeURIComponent(projectName)}/commits/${encodeURIComponent(commitHash)}/diff`,
  );
}

/**
 * Soft reset a commit - moves changes back to working tree
 */
export async function resetCommit(
  projectName: string,
  commitHash?: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch(
    `${BASE_URL}/git/${encodeURIComponent(projectName)}/reset`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commitHash }),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to reset commit");
  }
  return response.json();
}
