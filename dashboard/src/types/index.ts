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
  needsApproval?: boolean; // Message requires user approval for a command
  approvalCommand?: string; // The command that needs approval (e.g., "npm install lodash")
  approvalPattern?: string; // Pattern for always-allow (e.g., "Bash(npm install:*)")
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
  | "resources"
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

// ============================================================================
// Project Settings Types
// ============================================================================

export interface ProjectSettings {
  permissions: {
    allow: string[];
    deny: string[];
  };
  trustedTools?: string[];
  maxTokens?: number;
}

// ============================================================================
// Git Types
// ============================================================================

export type FileStatus = 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '?';

export interface FileChange {
  path: string;
  status: FileStatus;
  oldPath?: string;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: string[];
}

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface FileDiff {
  path: string;
  oldPath?: string;
  status: string;
  hunks: DiffHunk[];
  binary: boolean;
  additions: number;
  deletions: number;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  email: string;
  timestamp: string;
  filesChanged: number;
}

export interface GitCommitWithStatus extends GitCommit {
  pushed: boolean;
}

export interface GitHistoryWithStatus {
  commits: GitCommitWithStatus[];
  total: number;
  ahead: number;
}
