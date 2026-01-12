import type {
  Session,
  SessionDetail,
  Project,
  Summary,
  ApiResponse,
} from "../types";

const BASE_URL = "/api";

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// Projects
export async function getProjects(): Promise<ApiResponse<Project[]>> {
  return fetchApi<ApiResponse<Project[]>>("/projects");
}

// All sessions (for Kanban view)
export async function getAllSessions(): Promise<ApiResponse<Session[]>> {
  return fetchApi<ApiResponse<Session[]>>("/sessions");
}

// Sessions for a specific project
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

// Summary
export async function getSummary(): Promise<ApiResponse<Summary>> {
  return fetchApi<ApiResponse<Summary>>("/summary");
}

// Process Management

export interface ClaudeProcess {
  pid: number;
  cwd: string;
  command: string;
  startTime?: string;
}

export async function getProcesses(): Promise<ApiResponse<ClaudeProcess[]>> {
  return fetchApi<ApiResponse<ClaudeProcess[]>>("/processes");
}

export async function getSessionProcess(
  sessionId: string,
  projectPath: string,
): Promise<ApiResponse<ClaudeProcess | null>> {
  return fetchApi<ApiResponse<ClaudeProcess | null>>(
    `/sessions/${sessionId}/process?projectPath=${encodeURIComponent(projectPath)}`,
  );
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

export async function openProject(
  projectPath: string,
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await fetch(`${BASE_URL}/projects/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectPath }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to open project");
  }
  return response.json();
}

// Delete a session
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

// Real-time updates via SSE
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

// WebSocket Terminal URL builder
export function getTerminalWsUrl(
  sessionId: string,
  projectPath: string,
  mode: "new" | "resume" = "resume",
): string {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  const port = 3100; // Backend server port
  return `${wsProtocol}//${host}:${port}/terminal?sessionId=${encodeURIComponent(sessionId)}&projectPath=${encodeURIComponent(projectPath)}&mode=${mode}`;
}

// Session Names
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

// Create a new session
export async function createNewSession(
  projectPath: string,
  name?: string,
): Promise<ApiResponse<{ sessionId: string; projectPath: string }>> {
  const response = await fetch(`${BASE_URL}/sessions/new`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectPath, name }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create session");
  }
  return response.json();
}

// Active terminal sessions
export interface ActiveTerminal {
  sessionId: string;
  projectPath: string;
  connected: boolean;
  lastActivity: number;
  bufferSize: number;
}

export async function getActiveTerminals(): Promise<
  ApiResponse<ActiveTerminal[]>
> {
  return fetchApi<ApiResponse<ActiveTerminal[]>>("/terminals");
}

export async function killTerminal(
  sessionId: string,
): Promise<ApiResponse<{ success: boolean }>> {
  const response = await fetch(`${BASE_URL}/terminals/${sessionId}`, {
    method: "DELETE",
  });
  return response.json();
}
