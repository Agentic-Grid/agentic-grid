// Session types - matches Kyle's claude-code-ui status model
export type SessionStatus = "working" | "waiting" | "needs-approval" | "idle";

export interface Session {
  id: string;
  projectPath: string;
  projectName: string;
  startedAt: string;
  lastActivityAt: string;
  gitBranch?: string;
  slug?: string;
  messageCount: number;
  toolCallCount: number;
  status: SessionStatus;
  hasPendingToolUse: boolean;
  firstPrompt?: string;
  lastOutput?: string;
  logFile: string;
  fileSize: number;
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: string;
}

export interface ParsedMessage {
  id: string;
  role: "user" | "assistant";
  timestamp: string;
  content: string;
  toolCalls?: ToolCall[];
  thinking?: string;
}

export interface SessionDetail extends Session {
  messages: ParsedMessage[];
}

export interface Project {
  folder: string;
  path: string;
  name: string;
}

export interface Summary {
  totalProjects: number;
  totalSessions: number;
  workingSessions: number;
  waitingSessions: number;
  idleSessions: number;
  totalMessages: number;
  totalToolCalls: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}
