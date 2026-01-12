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
