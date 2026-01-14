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
