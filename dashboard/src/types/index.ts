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
  id?: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
  status?: "pending" | "running" | "complete" | "error";
}

export interface ParsedMessage {
  id: string;
  role: "user" | "assistant";
  timestamp: string;
  content: string;
  toolCalls?: ToolCall[];
  thinking?: string;
  isSummary?: boolean;
  isSystemContext?: boolean;
  systemContextType?: "command" | "skill" | "agent" | "mode";
  systemContextName?: string;
  systemContextFile?: string;
  isToolResult?: boolean; // Message contains only tool results (no user text)
  toolResultType?: "todo" | "file" | "success" | "error"; // Type of tool result for display
  isLocalCommand?: boolean; // Message contains local command output/caveat/stderr
  localCommandType?: "stdout" | "stderr" | "caveat" | "reminder"; // Type of local command message
}

export interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

export interface SessionDetail extends Session {
  messages: ParsedMessage[];
  todos: TodoItem[];
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

// ============================================================================
// Agent Types
// ============================================================================

export type AgentDomain =
  | "development"
  | "research"
  | "trading"
  | "social"
  | "general";

export interface Agent {
  id: string;
  name: string;
  description: string;
  domain: AgentDomain;
  systemPrompt: string;
  tools: string[];
  allowedCommands: string[];
  created: string;
  updated: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

export type WebhookEvent =
  | "session.created"
  | "session.completed"
  | "session.error"
  | "tool.called"
  | "message.received";

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  secret?: string;
  enabled: boolean;
  created: string;
}

// ============================================================================
// MCP Marketplace Types
// ============================================================================

export type MCPCategory =
  | "development"
  | "productivity"
  | "ai"
  | "data"
  | "other";

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  package: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  category: MCPCategory;
  installed: boolean;
  enabled: boolean;
}

// ============================================================================
// Process Types
// ============================================================================

export interface ClaudeProcess {
  pid: number;
  cwd: string;
  command: string;
  startTime?: string;
}

// ============================================================================
// Navigation Types
// ============================================================================

export type ViewType =
  | "sessions"
  | "session-detail"
  | "marketplace"
  | "agents"
  | "webhooks"
  | "settings";

// ============================================================================
// Slash Command Types
// ============================================================================

export interface SlashCommand {
  name: string;
  description: string;
  source: "project";
  hasArguments: boolean;
  filePath?: string;
}
