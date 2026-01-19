import type {
  Session,
  SessionDetail,
  Project,
  Summary,
  ApiResponse,
  Agent,
  Webhook,
  MCPServer,
  ClaudeProcess,
  SlashCommand,
  ProjectSettings,
} from "../types";

const BASE_URL = "/api";

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
): Promise<
  ApiResponse<{ sessionId: string; projectPath: string; pid?: number }>
> {
  const response = await fetch(`${BASE_URL}/sessions/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectPath, message }),
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
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectPath, message }),
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

export function subscribeToUpdates(
  onUpdate: (data: { type: string; path?: string }) => void,
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
// Marketplace
// ============================================================================

export async function getAvailableMCPServers(): Promise<
  ApiResponse<MCPServer[]>
> {
  return fetchApi<ApiResponse<MCPServer[]>>("/marketplace/available");
}

export async function getInstalledMCPServers(): Promise<
  ApiResponse<MCPServer[]>
> {
  return fetchApi<ApiResponse<MCPServer[]>>("/marketplace/installed");
}

export async function installMCPServer(
  serverId: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch(`${BASE_URL}/marketplace/install`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serverId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to install server");
  }
  return response.json();
}

export async function uninstallMCPServer(
  serverId: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
  const response = await fetch(`${BASE_URL}/marketplace/uninstall`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serverId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to uninstall server");
  }
  return response.json();
}

// ============================================================================
// Agents
// ============================================================================

export async function getAgents(): Promise<ApiResponse<Agent[]>> {
  return fetchApi<ApiResponse<Agent[]>>("/agents");
}

export async function createAgent(
  agent: Omit<Agent, "id" | "created" | "updated">,
): Promise<ApiResponse<Agent>> {
  const response = await fetch(`${BASE_URL}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(agent),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create agent");
  }
  return response.json();
}

export async function updateAgent(
  id: string,
  updates: Partial<Agent>,
): Promise<ApiResponse<Agent>> {
  const response = await fetch(`${BASE_URL}/agents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update agent");
  }
  return response.json();
}

export async function deleteAgent(
  id: string,
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await fetch(`${BASE_URL}/agents/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete agent");
  }
  return response.json();
}

// ============================================================================
// Webhooks
// ============================================================================

export async function getWebhooks(): Promise<ApiResponse<Webhook[]>> {
  return fetchApi<ApiResponse<Webhook[]>>("/webhooks");
}

export async function createWebhook(
  webhook: Omit<Webhook, "id" | "created">,
): Promise<ApiResponse<Webhook>> {
  const response = await fetch(`${BASE_URL}/webhooks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(webhook),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create webhook");
  }
  return response.json();
}

export async function updateWebhook(
  id: string,
  updates: Partial<Webhook>,
): Promise<ApiResponse<Webhook>> {
  const response = await fetch(`${BASE_URL}/webhooks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update webhook");
  }
  return response.json();
}

export async function deleteWebhook(
  id: string,
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await fetch(`${BASE_URL}/webhooks/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete webhook");
  }
  return response.json();
}

export async function testWebhook(
  url: string,
  secret?: string,
): Promise<
  ApiResponse<{ success: boolean; status: number; statusText: string }>
> {
  const response = await fetch(`${BASE_URL}/webhooks/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, secret }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to test webhook");
  }
  return response.json();
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
): Promise<ApiResponse<{ sessionId: string }>> {
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
