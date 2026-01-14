import express from "express";
import cors from "cors";
import {
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  closeSync,
} from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { exec, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import { randomUUID, createHmac } from "crypto";
import chokidar from "chokidar";
import { createServer } from "http";

// Import route modules
import kanbanRoutes from "./routes/kanban.routes.js";
import projectRoutes from "./routes/project.routes.js";

// Import services
import { sessionSpawner } from "./services/session-spawner.service.js";
import { orchestrator } from "./services/orchestrator.service.js";
import { kanbanService } from "./services/kanban.service.js";

const execAsync = promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());

// Register route modules
app.use("/api/kanban", kanbanRoutes);
app.use("/api/projects", projectRoutes);

const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");
const SESSION_NAMES_FILE = join(homedir(), ".claude", "session-names.json");
const PLATFORM_DIR = join(homedir(), ".claude", "platform");
const AGENTS_FILE = join(PLATFORM_DIR, "agents.json");
const WEBHOOKS_FILE = join(PLATFORM_DIR, "webhooks.json");
const MCP_CONFIG_FILE = join(process.cwd(), ".mcp.json");
const PROJECT_SPAWN_SCRIPT = "/Users/diego/Projects/start_project.sh";

// Ensure platform directory exists
if (!existsSync(PLATFORM_DIR)) {
  mkdirSync(PLATFORM_DIR, { recursive: true });
}

// ============================================================================
// Session Names Storage
// ============================================================================

interface SessionNames {
  [sessionId: string]: string;
}

function loadSessionNames(): SessionNames {
  try {
    if (existsSync(SESSION_NAMES_FILE)) {
      return JSON.parse(readFileSync(SESSION_NAMES_FILE, "utf-8"));
    }
  } catch {
    // Ignore errors, return empty object
  }
  return {};
}

function saveSessionNames(names: SessionNames): void {
  try {
    const dir = join(homedir(), ".claude");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(SESSION_NAMES_FILE, JSON.stringify(names, null, 2));
  } catch (err) {
    console.error("Failed to save session names:", err);
  }
}

function getSessionName(sessionId: string): string | null {
  const names = loadSessionNames();
  return names[sessionId] || null;
}

function setSessionName(sessionId: string, name: string): void {
  const names = loadSessionNames();
  if (name.trim()) {
    names[sessionId] = name.trim();
  } else {
    delete names[sessionId];
  }
  saveSessionNames(names);
}

function removeSessionName(sessionId: string): void {
  const names = loadSessionNames();
  if (names[sessionId]) {
    delete names[sessionId];
    saveSessionNames(names);
  }
}

// ============================================================================
// Session Order Storage (for custom ordering of mini-windows)
// ============================================================================

const SESSION_ORDER_FILE = join(homedir(), ".claude", "session-order.json");

interface SessionOrder {
  [sessionId: string]: number;
}

function loadSessionOrder(): SessionOrder {
  try {
    if (existsSync(SESSION_ORDER_FILE)) {
      return JSON.parse(readFileSync(SESSION_ORDER_FILE, "utf-8"));
    }
  } catch {
    // Ignore errors, return empty object
  }
  return {};
}

function saveSessionOrder(order: SessionOrder): void {
  try {
    const dir = join(homedir(), ".claude");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(SESSION_ORDER_FILE, JSON.stringify(order, null, 2));
  } catch (err) {
    console.error("Failed to save session order:", err);
  }
}

function getSessionOrder(sessionId: string): number | null {
  const order = loadSessionOrder();
  return order[sessionId] ?? null;
}

function setSessionOrder(sessionId: string, orderIndex: number): void {
  const order = loadSessionOrder();
  order[sessionId] = orderIndex;
  saveSessionOrder(order);
}

function setSessionOrderBatch(orders: Record<string, number>): void {
  const existingOrder = loadSessionOrder();
  const updatedOrder = { ...existingOrder, ...orders };
  saveSessionOrder(updatedOrder);
}

function removeSessionOrder(sessionId: string): void {
  const order = loadSessionOrder();
  if (order[sessionId] !== undefined) {
    delete order[sessionId];
    saveSessionOrder(order);
  }
}

// ============================================================================
// Session PIDs Storage (for tracking running processes)
// ============================================================================

const SESSION_PIDS_FILE = join(homedir(), ".claude", "session-pids.json");

interface SessionPidInfo {
  pid: number;
  projectPath: string;
  startTime: string;
}

interface SessionPids {
  [sessionId: string]: SessionPidInfo;
}

function loadSessionPids(): SessionPids {
  try {
    if (existsSync(SESSION_PIDS_FILE)) {
      return JSON.parse(readFileSync(SESSION_PIDS_FILE, "utf-8"));
    }
  } catch {
    // Ignore errors, return empty object
  }
  return {};
}

function saveSessionPids(pids: SessionPids): void {
  try {
    const dir = join(homedir(), ".claude");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(SESSION_PIDS_FILE, JSON.stringify(pids, null, 2));
  } catch (err) {
    console.error("Failed to save session PIDs:", err);
  }
}

function getSessionPid(sessionId: string): SessionPidInfo | null {
  const pids = loadSessionPids();
  return pids[sessionId] || null;
}

function setSessionPid(
  sessionId: string,
  pid: number,
  projectPath: string,
): void {
  const pids = loadSessionPids();
  pids[sessionId] = {
    pid,
    projectPath,
    startTime: new Date().toISOString(),
  };
  saveSessionPids(pids);
}

function removeSessionPid(sessionId: string): SessionPidInfo | null {
  const pids = loadSessionPids();
  const info = pids[sessionId] || null;
  if (info) {
    delete pids[sessionId];
    saveSessionPids(pids);
  }
  return info;
}

// Check if a PID is still alive
function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0); // Signal 0 just checks if process exists
    return true;
  } catch {
    return false;
  }
}

// Check if a session's PID is still running
function isSessionPidAlive(sessionId: string): boolean {
  const info = getSessionPid(sessionId);
  if (!info) return false;
  return isPidAlive(info.pid);
}

// Status timeouts
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WORKING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Types
// ============================================================================

interface LogEntry {
  type: string;
  sessionId: string;
  timestamp: string;
  uuid?: string;
  parentUuid?: string;
  message?: {
    role: string;
    content: ContentBlock[];
  };
  cwd?: string;
  gitBranch?: string;
  slug?: string;
  version?: string;
}

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

type SessionStatus = "working" | "waiting" | "needs-approval" | "idle";

interface Session {
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

interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

interface SessionDetail extends Session {
  messages: ParsedMessage[];
  todos: TodoItem[];
}

interface ParsedMessage {
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
  isLocalCommand?: boolean; // Message contains local command output/caveat
  localCommandType?: "stdout" | "caveat" | "reminder"; // Type of local command message
  needsApproval?: boolean; // This message is asking for approval
  approvalCommand?: string; // The command/tool needing approval (e.g., "Bash(npm install)")
  approvalPattern?: string; // The pattern for always-allow (e.g., "Bash(npm install:*)")
}

interface ToolCall {
  id?: string;
  name: string;
  input: Record<string, unknown>;
  result?: string;
  status?: "pending" | "running" | "complete" | "error";
}

// Agent types
interface Agent {
  id: string;
  name: string;
  description: string;
  domain: "development" | "research" | "trading" | "social" | "general";
  systemPrompt: string;
  tools: string[];
  allowedCommands: string[];
  created: string;
  updated: string;
}

// Webhook types
type WebhookEvent =
  | "session.created"
  | "session.completed"
  | "session.error"
  | "tool.called"
  | "message.received";

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  headers?: Record<string, string>;
  secret?: string;
  enabled: boolean;
  created: string;
}

// MCP Server types
interface MCPServer {
  id: string;
  name: string;
  description: string;
  package: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  category: "development" | "productivity" | "ai" | "data" | "other";
  installed: boolean;
  enabled: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function decodeProjectFolder(folder: string): string {
  const withoutLeading = folder.replace(/^-/, "");
  const parts = withoutLeading.split("-");

  let currentPath = "/";
  let i = 0;

  while (i < parts.length) {
    let found = false;
    for (let len = parts.length - i; len >= 1; len--) {
      const candidate = parts.slice(i, i + len).join("-");
      const testPath = join(currentPath, candidate);

      try {
        const stat = statSync(testPath);
        if (stat.isDirectory()) {
          currentPath = testPath;
          i += len;
          found = true;
          break;
        }
      } catch {
        // Path doesn't exist, try shorter
      }
    }

    if (!found) {
      currentPath = join(currentPath, parts[i]);
      i++;
    }
  }

  return currentPath;
}

function parseLogFile(filePath: string): LogEntry[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    return lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as LogEntry[];
  } catch {
    return [];
  }
}

function determineStatus(
  entries: LogEntry[],
  lastActivityTime: number,
): { status: SessionStatus; hasPendingToolUse: boolean } {
  const now = Date.now();
  const elapsed = now - lastActivityTime;

  if (elapsed > IDLE_TIMEOUT_MS) {
    return { status: "idle", hasPendingToolUse: false };
  }

  let hasPendingToolUse = false;
  let lastToolUseId: string | null = null;
  let lastToolResultId: string | null = null;

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "assistant" && entry.message?.content) {
      for (const block of entry.message.content) {
        if (block.type === "tool_use" && block.tool_use_id) {
          lastToolUseId = block.tool_use_id;
        }
      }
      break;
    }
    if (entry.type === "user" && entry.message?.content) {
      for (const block of entry.message.content) {
        if (block.type === "tool_result" && block.tool_use_id) {
          lastToolResultId = block.tool_use_id;
        }
      }
    }
  }

  if (lastToolUseId && lastToolUseId !== lastToolResultId) {
    hasPendingToolUse = true;
  }

  if (elapsed < WORKING_TIMEOUT_MS) {
    return { status: "working", hasPendingToolUse };
  }

  return {
    status: hasPendingToolUse ? "needs-approval" : "waiting",
    hasPendingToolUse,
  };
}

function extractLastOutput(entries: LogEntry[]): string {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "assistant" && entry.message?.content) {
      for (const block of entry.message.content) {
        if (block.type === "text" && block.text) {
          const text = block.text.trim();
          if (!text.startsWith("<system-") && text.length > 10) {
            return text.slice(0, 300);
          }
        }
      }
    }
  }
  return "";
}

// Detect local command messages (stdout, stderr, caveat, reminder from local commands)
interface LocalCommandInfo {
  type: "stdout" | "stderr" | "caveat" | "reminder";
  content: string;
}

function detectLocalCommand(content: string): LocalCommandInfo | null {
  // Pattern: <local-command-stdout>...</local-command-stdout>
  const stdoutMatch = content.match(
    /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/,
  );
  if (stdoutMatch) {
    return {
      type: "stdout",
      content: stdoutMatch[1].trim(),
    };
  }

  // Pattern: <local-command-stderr>...</local-command-stderr>
  const stderrMatch = content.match(
    /<local-command-stderr>([\s\S]*?)<\/local-command-stderr>/,
  );
  if (stderrMatch) {
    return {
      type: "stderr",
      content: stderrMatch[1].trim(),
    };
  }

  // Pattern: <local-command-caveat>...</local-command-caveat>
  const caveatMatch = content.match(
    /<local-command-caveat>([\s\S]*?)<\/local-command-caveat>/,
  );
  if (caveatMatch) {
    return {
      type: "caveat",
      content: caveatMatch[1].trim(),
    };
  }

  // Pattern: <system-reminder>...</system-reminder>
  const reminderMatch = content.match(
    /<system-reminder>([\s\S]*?)<\/system-reminder>/,
  );
  if (reminderMatch) {
    return {
      type: "reminder",
      content: reminderMatch[1].trim(),
    };
  }

  return null;
}

// Helper to extract the command/binary for pattern matching
// For full paths, we keep the full path since that's what Claude Code uses
function extractCommandForPattern(command: string): string {
  const firstWord = command.split(/\s+/)[0];
  return firstWord;
}

// Detect approval-needed messages (Claude asking for permission)
interface ApprovalInfo {
  command: string; // e.g., "Bash(npm install)"
  pattern: string; // e.g., "Bash(npm:*)"
}

function detectApprovalNeeded(content: string): ApprovalInfo | null {
  // Check for common approval patterns from Claude Code
  const approvalPatterns = [
    /allow\?\s*(\[y\/n\]|\(y\/n\))?$/im,
    /requires?\s+approval/i,
    /do you want to allow/i,
    /permission.*\b(y\/n|yes\/no)\b/i,
    /allow this (tool|command|action)/i,
    /want me to (run|execute|perform)/i,
    /\[y\/n\]\s*$/i,
    /\(y\/n\)\s*$/i,
    /claude wants to (run|execute|use)/i,
    /waiting for.*permission/i,
    /needs? your (approval|permission)/i,
    /approve.*\?/i,
    /allow.*bash/i,
    /run.*command/i,
  ];

  const hasApprovalRequest = approvalPatterns.some((pattern) =>
    pattern.test(content),
  );

  if (!hasApprovalRequest) {
    return null;
  }

  // Try to extract the command/tool being requested
  // Pattern: Tool(args) or command patterns
  let command = "";
  let pattern = "";

  // Look for Bash(command) pattern
  const bashMatch = content.match(/Bash\s*\(\s*([^)]+)\s*\)/);
  if (bashMatch) {
    const bashCmd = bashMatch[1].trim();
    command = `Bash(${bashCmd})`;
    // Create wildcard pattern - keep full path for matching
    const cmdForPattern = extractCommandForPattern(bashCmd);
    pattern = `Bash(${cmdForPattern}:*)`;
    return { command, pattern };
  }

  // Look for other tool patterns: ToolName(args)
  const toolMatch = content.match(/(\w+)\s*\(\s*([^)]+)\s*\)/);
  if (toolMatch) {
    const toolName = toolMatch[1];
    const toolArgs = toolMatch[2].trim();
    command = `${toolName}(${toolArgs})`;
    // For file tools, use path pattern
    if (["Read", "Write", "Edit"].includes(toolName)) {
      const pathParts = toolArgs.split("/");
      if (pathParts.length > 1) {
        pattern = `${toolName}(./${pathParts[1]}/**)`;
      } else {
        pattern = `${toolName}(${toolArgs})`;
      }
    } else {
      pattern = `${toolName}(${toolArgs}:*)`;
    }
    return { command, pattern };
  }

  // Fallback - couldn't extract specific command
  return { command: "Unknown command", pattern: "" };
}

// Detect system context messages (loading .md files from .claude/ directories)
interface SystemContextInfo {
  type: "command" | "skill" | "agent" | "mode";
  name: string;
  file: string;
}

function detectSystemContext(content: string): SystemContextInfo | null {
  // Pattern 1: XML command tags (when user invokes a command)
  // Format: <command-name>/commandname</command-name><command-message>...</command-message>
  const commandNameMatch = content.match(
    /<command-name>\/(\w[\w-]*)<\/command-name>/,
  );
  if (commandNameMatch) {
    const commandName = commandNameMatch[1];
    // Extract args if present
    const argsMatch = content.match(/<command-args>([\s\S]*?)<\/command-args>/);
    const args = argsMatch ? argsMatch[1].trim() : "";

    return {
      type: "command",
      name: commandName,
      file: args
        ? `/${commandName} ${args.slice(0, 50)}${args.length > 50 ? "..." : ""}`
        : `/${commandName}`,
    };
  }

  // Pattern 2: CLAUDE.md files (project instructions)
  // These contain "Contents of" path references or "CLAUDE.md" mentions
  if (
    content.includes("CLAUDE.md") ||
    content.includes("project instructions") ||
    content.includes("Codebase and user instructions")
  ) {
    // Extract file path if present
    const pathMatch = content.match(
      /Contents of ([^\s]+CLAUDE(?:\.local)?\.md)/,
    );
    const filePath = pathMatch ? pathMatch[1] : "CLAUDE.md";
    const isLocal = filePath.includes(".local");

    return {
      type: "mode",
      name: isLocal ? "Local Config" : "Project Instructions",
      file: filePath,
    };
  }

  // Pattern 3: claudeMd context marker
  if (content.includes("# claudeMd") || content.includes("<claudeMd>")) {
    return {
      type: "mode",
      name: "Project Instructions",
      file: "CLAUDE.md",
    };
  }

  // Pattern 4: Tool result containing .md file content from .claude/ directories
  // The content often has line numbers like "     1→---" for frontmatter files
  if (
    content.includes("→") &&
    (content.includes("---\n") || content.includes("# "))
  ) {
    // Check if content looks like a loaded .md file with frontmatter
    const frontmatterMatch = content.match(/\d+→---[\s\S]*?\d+→---/);
    if (frontmatterMatch) {
      // Try to extract command/skill/agent name from description or heading
      const descMatch = content.match(/description:\s*(.+)/i);
      const headingMatch = content.match(/\d+→#\s+(.+)/);

      if (descMatch || headingMatch) {
        const desc = descMatch ? descMatch[1].trim() : "";
        const heading = headingMatch ? headingMatch[1].trim() : "";
        const displayName = heading || desc.slice(0, 40);

        // Try to determine type from content
        let type: "command" | "skill" | "agent" | "mode" = "mode";
        if (
          content.toLowerCase().includes("agent") ||
          content.includes("subagent_type")
        ) {
          type = "agent";
        } else if (
          content.toLowerCase().includes("skill") ||
          content.includes("SKILL.md")
        ) {
          type = "skill";
        } else if (
          content.includes("allowed-tools:") ||
          content.includes("<command-")
        ) {
          type = "command";
        }

        return {
          type,
          name: displayName.replace(/\s+(Agent|Mode|Skill|Router)$/i, ""),
          file: "loaded definition",
        };
      }
    }
  }

  // Pattern 5: File path patterns for .claude/ directories
  const commandPathMatch = content.match(/\.claude\/commands\/([^\/\s]+)\.md/);
  if (commandPathMatch) {
    return {
      type: "command",
      name: commandPathMatch[1],
      file: `.claude/commands/${commandPathMatch[1]}.md`,
    };
  }

  const skillPathMatch = content.match(
    /\.claude\/skills\/([^\/\s]+)\/SKILL\.md/i,
  );
  if (skillPathMatch) {
    return {
      type: "skill",
      name: skillPathMatch[1],
      file: `.claude/skills/${skillPathMatch[1]}/SKILL.md`,
    };
  }

  const agentPathMatch = content.match(/\.claude\/agents\/([^\/\s]+)\.md/);
  if (agentPathMatch) {
    return {
      type: "agent",
      name: agentPathMatch[1],
      file: `.claude/agents/${agentPathMatch[1]}.md`,
    };
  }

  // Pattern 6: Plans directory files
  const plansPathMatch = content.match(/plans\/([^\/\s]+)\.md/);
  if (plansPathMatch) {
    return {
      type: "mode",
      name: plansPathMatch[1],
      file: `plans/${plansPathMatch[1]}.md`,
    };
  }

  // Pattern 7: Contracts/config yaml files
  const contractsMatch = content.match(/contracts\/([^\/\s]+)\.yaml/);
  if (contractsMatch) {
    return {
      type: "mode",
      name: contractsMatch[1],
      file: `contracts/${contractsMatch[1]}.yaml`,
    };
  }

  // Pattern 8: Generic large markdown content that looks like documentation
  // (likely a Read tool result of an .md file)
  if (
    content.length > 1000 &&
    content.includes("# ") &&
    content.includes("##")
  ) {
    // Try to extract the first heading as the name
    const firstHeading = content.match(/^#\s+(.+)$/m);
    if (firstHeading) {
      return {
        type: "mode",
        name: firstHeading[1].slice(0, 40),
        file: "loaded file",
      };
    }
  }

  return null;
}

function extractSessionInfo(
  logFile: string,
  entries: LogEntry[],
  projectPath: string,
): Session | null {
  if (entries.length === 0) return null;

  const firstEntry = entries.find((e) => e.type === "user" && e.message);
  const lastEntry = entries[entries.length - 1];

  const fileName = basename(logFile, ".jsonl");
  const sessionId = fileName;

  const userMessages = entries.filter((e) => e.type === "user" && e.message);
  const assistantMessages = entries.filter(
    (e) => e.type === "assistant" && e.message,
  );

  // Filter out empty sessions - require at least one user or assistant message
  if (userMessages.length === 0 && assistantMessages.length === 0) {
    return null;
  }

  let toolCallCount = 0;
  for (const entry of assistantMessages) {
    if (entry.message?.content) {
      for (const block of entry.message.content) {
        if (block.type === "tool_use") {
          toolCallCount++;
        }
      }
    }
  }

  let firstPrompt = "";
  if (firstEntry?.message?.content) {
    for (const block of firstEntry.message.content) {
      if (block.type === "text" && block.text && !block.text.startsWith("<")) {
        firstPrompt = block.text.slice(0, 200);
        break;
      }
    }
  }

  const lastTime = new Date(lastEntry.timestamp).getTime();
  const { status, hasPendingToolUse } = determineStatus(entries, lastTime);

  const lastOutput = extractLastOutput(entries);

  const stats = statSync(logFile);

  return {
    id: sessionId,
    projectPath,
    projectName: projectPath.split("/").pop() || projectPath,
    startedAt: firstEntry?.timestamp || entries[0].timestamp,
    lastActivityAt: lastEntry.timestamp,
    gitBranch: firstEntry?.gitBranch,
    slug: firstEntry?.slug,
    messageCount: userMessages.length + assistantMessages.length,
    toolCallCount,
    status,
    hasPendingToolUse,
    firstPrompt,
    lastOutput,
    logFile,
    fileSize: stats.size,
  };
}

function getProjectSessions(projectFolder: string): Session[] {
  const projectDir = join(CLAUDE_PROJECTS_DIR, projectFolder);
  const projectPath = decodeProjectFolder(projectFolder);

  try {
    const files = readdirSync(projectDir);
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

    const sessionMap = new Map<string, Session>();

    for (const file of jsonlFiles) {
      const filePath = join(projectDir, file);
      const entries = parseLogFile(filePath);
      const session = extractSessionInfo(filePath, entries, projectPath);
      if (session) {
        const existing = sessionMap.get(session.id);
        if (
          !existing ||
          new Date(session.lastActivityAt) > new Date(existing.lastActivityAt)
        ) {
          sessionMap.set(session.id, session);
        }
      }
    }

    const sessions = Array.from(sessionMap.values());
    sessions.sort(
      (a, b) =>
        new Date(b.lastActivityAt).getTime() -
        new Date(a.lastActivityAt).getTime(),
    );

    return sessions;
  } catch {
    return [];
  }
}

function getAllSessions(): Session[] {
  try {
    const folders = readdirSync(CLAUDE_PROJECTS_DIR).filter((f) => {
      try {
        const stat = statSync(join(CLAUDE_PROJECTS_DIR, f));
        return stat.isDirectory() && !f.startsWith(".");
      } catch {
        return false;
      }
    });

    const allSessions: Session[] = [];
    const seenIds = new Set<string>();

    for (const folder of folders) {
      const sessions = getProjectSessions(folder);
      for (const session of sessions) {
        if (!seenIds.has(session.id)) {
          seenIds.add(session.id);
          allSessions.push(session);
        }
      }
    }

    allSessions.sort(
      (a, b) =>
        new Date(b.lastActivityAt).getTime() -
        new Date(a.lastActivityAt).getTime(),
    );

    return allSessions;
  } catch {
    return [];
  }
}

function getSessionDetail(
  projectFolder: string,
  sessionId: string,
): SessionDetail | null {
  const projectDir = join(CLAUDE_PROJECTS_DIR, projectFolder);
  const logFile = join(projectDir, `${sessionId}.jsonl`);
  const projectPath = decodeProjectFolder(projectFolder);

  const entries = parseLogFile(logFile);
  const session = extractSessionInfo(logFile, entries, projectPath);
  if (!session) return null;

  const messages: ParsedMessage[] = [];
  let todos: TodoItem[] = [];

  for (const entry of entries) {
    if (
      (entry.type === "user" || entry.type === "assistant") &&
      entry.message
    ) {
      const msg: ParsedMessage = {
        id: entry.uuid || `${entry.timestamp}-${entry.type}`,
        role: entry.type as "user" | "assistant",
        timestamp: entry.timestamp,
        content: "",
        toolCalls: [],
      };

      // Track whether this user message has actual user text vs just tool results
      let hasUserText = false;
      let hasToolResults = false;
      let isTodoWriteResult = false;

      // Handle content - can be a string (user messages via API) or array of blocks (Claude responses)
      const messageContent = entry.message.content;
      if (typeof messageContent === "string") {
        // Direct string content (e.g., user messages sent via API)
        msg.content = messageContent;
        hasUserText = messageContent.trim().length > 0;
      } else if (Array.isArray(messageContent)) {
        // Array of content blocks (standard Claude format)
        for (const block of messageContent) {
          if (block.type === "text" && block.text) {
            msg.content += block.text + "\n";
            // Only count as user text if it's actual user input (not system tags)
            if (!block.text.trim().startsWith("<") && msg.role === "user") {
              hasUserText = true;
            }
          } else if (block.type === "thinking" && block.thinking) {
            msg.thinking = block.thinking;
          } else if (block.type === "tool_use" && block.name) {
            msg.toolCalls?.push({
              id: block.tool_use_id,
              name: block.name,
              input: block.input || {},
              status: "complete",
            });
            // Extract todos from TodoWrite tool calls
            if (block.name === "TodoWrite" && block.input?.todos) {
              todos = (block.input.todos as TodoItem[]).map((t) => ({
                content: t.content,
                status: t.status,
                activeForm: t.activeForm,
              }));
            }
          } else if (block.type === "tool_result" && block.content) {
            hasToolResults = true;
            // Check if this is a TodoWrite result (contains "Todos have been modified")
            const resultText =
              typeof block.content === "string"
                ? block.content
                : JSON.stringify(block.content);
            if (resultText.includes("Todos have been modified")) {
              isTodoWriteResult = true;
            }
            // For user messages, tool_result contains content from Read/etc tool responses
            // Add this to msg.content so we can detect system context (.md file loading)
            if (msg.role === "user") {
              const resultContent =
                typeof block.content === "string"
                  ? block.content
                  : Array.isArray(block.content)
                    ? block.content
                        .filter(
                          (c: { type: string; text?: string }) =>
                            c.type === "text" && c.text,
                        )
                        .map((c: { text: string }) => c.text)
                        .join("\n")
                    : JSON.stringify(block.content);
              if (resultContent) {
                msg.content += resultContent + "\n";
              }
            } else {
              // For assistant messages, associate with last tool call
              const lastCall = msg.toolCalls?.[msg.toolCalls.length - 1];
              if (lastCall) {
                lastCall.result =
                  typeof block.content === "string"
                    ? block.content.slice(0, 500)
                    : JSON.stringify(block.content).slice(0, 500);
              }
            }
          }
        }
      }

      msg.content = msg.content.trim();

      // Mark user messages that only contain tool results (no actual user text)
      // These are internal messages between Claude and tools, not from the user
      // ALL tool results should display as assistant (Claude's side of the conversation)
      if (msg.role === "user" && hasToolResults && !hasUserText) {
        msg.isToolResult = true;
        msg.role = "assistant";
        // Track if this is a special result type that should be shown
        if (isTodoWriteResult) {
          msg.toolResultType = "todo";
        }
      }

      // Detect context continuation/summarization messages
      const SUMMARY_PREFIX =
        "This session is being continued from a previous conversation that ran out of context.";
      if (msg.role === "user" && msg.content.startsWith(SUMMARY_PREFIX)) {
        msg.isSummary = true;
      }

      // Detect system context messages (loading .md files from commands/skills/agents)
      if (msg.role === "user") {
        const systemContextInfo = detectSystemContext(msg.content);
        if (systemContextInfo) {
          msg.isSystemContext = true;
          msg.systemContextType = systemContextInfo.type;
          msg.systemContextName = systemContextInfo.name;
          msg.systemContextFile = systemContextInfo.file;
        }
      }

      // Detect local command messages (stdout, caveat, reminder)
      if (msg.role === "user") {
        const localCommandInfo = detectLocalCommand(msg.content);
        if (localCommandInfo) {
          msg.isLocalCommand = true;
          msg.localCommandType = localCommandInfo.type;
          // Replace the raw content with the extracted content
          msg.content = localCommandInfo.content;
        }
      }

      // Detect approval-needed messages (assistant asking for permission)
      if (msg.role === "assistant") {
        const approvalInfo = detectApprovalNeeded(msg.content);
        if (approvalInfo) {
          msg.needsApproval = true;
          // If command is unknown, look at previous message for tool call info
          if (
            approvalInfo.command === "Unknown command" &&
            messages.length > 0
          ) {
            const prevMsg = messages[messages.length - 1];
            if (prevMsg.toolCalls && prevMsg.toolCalls.length > 0) {
              const lastToolCall =
                prevMsg.toolCalls[prevMsg.toolCalls.length - 1];
              if (lastToolCall.name === "Bash" && lastToolCall.input?.command) {
                const bashCmd = String(lastToolCall.input.command);
                msg.approvalCommand = `Bash(${bashCmd})`;
                // Keep full path for pattern matching
                const cmdForPattern = extractCommandForPattern(bashCmd);
                msg.approvalPattern = `Bash(${cmdForPattern}:*)`;
              } else {
                msg.approvalCommand = `${lastToolCall.name}(${JSON.stringify(lastToolCall.input).slice(0, 50)}...)`;
                msg.approvalPattern = `${lastToolCall.name}(:*)`;
              }
            }
          } else {
            msg.approvalCommand = approvalInfo.command;
            msg.approvalPattern = approvalInfo.pattern;
          }
        }
      }

      if (msg.content || (msg.toolCalls && msg.toolCalls.length > 0)) {
        messages.push(msg);
      }
    }
  }

  return {
    ...session,
    messages,
    todos,
  };
}

// ============================================================================
// SSE and Real-time Updates
// ============================================================================

const clients = new Set<express.Response>();

// Track clients connected to the multiplexed stream (moved here for hoisting)
const multiplexedClients = new Set<express.Response>();

function notifyClients(data: unknown) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(message);
  }
}

// Notify multiplexed SSE clients about updates
function notifyMultiplexedClients(data: unknown) {
  if (multiplexedClients.size === 0) return;
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of multiplexedClients) {
    client.write(message);
  }
}

// Watch for file changes
const watcher = chokidar.watch(CLAUDE_PROJECTS_DIR, {
  ignored: /^\./,
  persistent: true,
  depth: 1,
});

watcher.on("change", (path) => {
  if (path.endsWith(".jsonl")) {
    notifyClients({ type: "update", path });
  }
});

watcher.on("add", (path) => {
  if (path.endsWith(".jsonl")) {
    notifyClients({ type: "new_session", path });
  }
});

// ============================================================================
// Process Management (Simplified - Uses stored PIDs only)
// ============================================================================

// Helper to notify session-specific SSE clients about status changes
function notifySessionClients(
  sessionId: string,
  projectPath: string,
  data: unknown,
) {
  // Find the project folder from the projectPath
  try {
    const folders = readdirSync(CLAUDE_PROJECTS_DIR).filter((f) => {
      try {
        const stat = statSync(join(CLAUDE_PROJECTS_DIR, f));
        return stat.isDirectory() && !f.startsWith(".");
      } catch {
        return false;
      }
    });

    for (const folder of folders) {
      const decodedPath = decodeProjectFolder(folder);
      if (decodedPath === projectPath) {
        const watcherKey = `${folder}/${sessionId}`;
        const watchers = sessionWatchers.get(watcherKey);
        if (watchers) {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          for (const client of watchers) {
            client.write(message);
          }
        }
        break;
      }
    }
  } catch {
    // Ignore errors in notification
  }
}

// Periodic cleanup: check all stored PIDs and remove dead ones
function cleanupDeadSessionPids(): void {
  const pids = loadSessionPids();
  let changed = false;

  for (const [sessionId, info] of Object.entries(pids)) {
    if (!isPidAlive(info.pid)) {
      console.log(
        `PID ${info.pid} for session ${sessionId} is no longer running, removing`,
      );
      delete pids[sessionId];
      changed = true;

      // Notify clients about the status change
      notifyClients({
        type: "process_stopped",
        sessionId,
        projectPath: info.projectPath,
        pid: info.pid,
        status: "waiting",
      });

      // Notify session-specific SSE clients
      notifySessionClients(sessionId, info.projectPath, {
        type: "status",
        status: "waiting",
      });
    }
  }

  if (changed) {
    saveSessionPids(pids);
  }
}

// Run cleanup every 3 seconds to detect when processes have exited
setInterval(cleanupDeadSessionPids, 3000);

// Track a spawned process by storing its PID
function trackSpawnedProcess(
  sessionId: string,
  pid: number,
  projectPath: string,
): void {
  setSessionPid(sessionId, pid, projectPath);

  // Notify all clients about the status change
  notifyClients({
    type: "process_started",
    sessionId,
    projectPath,
    pid,
    status: "working",
  });

  // Notify session-specific SSE clients
  notifySessionClients(sessionId, projectPath, {
    type: "status",
    status: "working",
    pid,
  });
}

// Untrack a spawned process by removing its PID
function untrackSpawnedProcess(sessionId: string): void {
  const info = removeSessionPid(sessionId);
  if (info) {
    // Notify all clients about the status change
    notifyClients({
      type: "process_stopped",
      sessionId,
      projectPath: info.projectPath,
      pid: info.pid,
      status: "waiting",
    });

    // Notify session-specific SSE clients
    notifySessionClients(sessionId, info.projectPath, {
      type: "status",
      status: "waiting",
    });
  }
}

// Check if a session is currently running (using stored PID)
function isSessionRunning(sessionId: string): boolean {
  const info = getSessionPid(sessionId);
  if (!info) return false;

  // Check if the stored PID is still running
  if (isPidAlive(info.pid)) {
    return true;
  }

  // PID is no longer running, clean up
  untrackSpawnedProcess(sessionId);
  return false;
}

// Kill a process by PID
async function killProcess(pid: number): Promise<boolean> {
  try {
    await execAsync(`kill ${pid}`);
    return true;
  } catch {
    return false;
  }
}

// Enrich session status using stored PIDs only
function enrichSessionStatus<
  T extends { id?: string; projectPath: string; status: SessionStatus },
>(session: T): T {
  if (session.id && isSessionPidAlive(session.id)) {
    return { ...session, status: "working" as SessionStatus };
  }
  // No running process - if status was "working", change to "waiting"
  if (session.status === "working") {
    return { ...session, status: "waiting" as SessionStatus };
  }
  return session;
}

// Enrich multiple sessions' status using stored PIDs only
function enrichSessionsStatus<
  T extends { id?: string; projectPath: string; status: SessionStatus },
>(sessions: T[]): T[] {
  // Load all stored PIDs once
  const storedPids = loadSessionPids();

  return sessions.map((session) => {
    if (session.id && storedPids[session.id]) {
      // Check if this session's stored PID is still alive
      if (isPidAlive(storedPids[session.id].pid)) {
        return { ...session, status: "working" as SessionStatus };
      }
    }
    // No running process - if status was "working", change to "waiting"
    if (session.status === "working") {
      return { ...session, status: "waiting" as SessionStatus };
    }
    return session;
  });
}

// ============================================================================
// Agents Storage
// ============================================================================

function loadAgents(): Agent[] {
  try {
    if (existsSync(AGENTS_FILE)) {
      return JSON.parse(readFileSync(AGENTS_FILE, "utf-8"));
    }
  } catch {
    // Ignore errors
  }
  return getDefaultAgents();
}

function saveAgents(agents: Agent[]): void {
  writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

function getDefaultAgents(): Agent[] {
  return [
    {
      id: "code-review",
      name: "Code Review",
      description: "Review PRs, suggest improvements",
      domain: "development",
      systemPrompt:
        "You are a code review expert. Focus on code quality, security, and best practices.",
      tools: ["Read", "Grep", "Glob"],
      allowedCommands: ["git", "npm", "yarn"],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    },
    {
      id: "research-assistant",
      name: "Research Assistant",
      description: "Web search, summarize papers",
      domain: "research",
      systemPrompt:
        "You are a research assistant. Help find and summarize information.",
      tools: ["WebSearch", "WebFetch", "Read"],
      allowedCommands: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    },
    {
      id: "general-purpose",
      name: "General Purpose",
      description: "Default Claude behavior",
      domain: "general",
      systemPrompt: "",
      tools: [],
      allowedCommands: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    },
  ];
}

// ============================================================================
// Webhooks Storage
// ============================================================================

function loadWebhooks(): Webhook[] {
  try {
    if (existsSync(WEBHOOKS_FILE)) {
      return JSON.parse(readFileSync(WEBHOOKS_FILE, "utf-8"));
    }
  } catch {
    // Ignore errors
  }
  return [];
}

function saveWebhooks(webhooks: Webhook[]): void {
  writeFileSync(WEBHOOKS_FILE, JSON.stringify(webhooks, null, 2));
}

async function triggerWebhooks(event: WebhookEvent, data: unknown) {
  const webhooks = loadWebhooks();
  const relevantWebhooks = webhooks.filter(
    (w) => w.enabled && w.events.includes(event),
  );

  for (const webhook of relevantWebhooks) {
    try {
      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...webhook.headers,
      };

      if (webhook.secret) {
        const signature = createHmac("sha256", webhook.secret)
          .update(JSON.stringify(payload))
          .digest("hex");
        headers["X-Webhook-Signature"] = signature;
      }

      fetch(webhook.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.error(`Webhook ${webhook.name} failed:`, err.message);
      });
    } catch (err) {
      console.error(`Webhook ${webhook.name} error:`, err);
    }
  }
}

// ============================================================================
// MCP Marketplace
// ============================================================================

function getAvailableMCPServers(): MCPServer[] {
  const installed = getInstalledMCPServers();
  const installedIds = new Set(installed.map((s) => s.id));

  const available: MCPServer[] = [
    {
      id: "github",
      name: "GitHub",
      description: "GitHub API integration for issues, PRs, and repos",
      package: "@anthropic/mcp-github",
      command: "npx",
      args: ["-y", "@anthropic/mcp-github"],
      env: { GITHUB_TOKEN: "${GITHUB_TOKEN}" },
      category: "development",
      installed: installedIds.has("github"),
      enabled: installedIds.has("github"),
    },
    {
      id: "filesystem",
      name: "Filesystem",
      description: "Local filesystem access",
      package: "@anthropic/mcp-filesystem",
      command: "npx",
      args: ["-y", "@anthropic/mcp-filesystem"],
      category: "productivity",
      installed: installedIds.has("filesystem"),
      enabled: installedIds.has("filesystem"),
    },
    {
      id: "brave-search",
      name: "Brave Search",
      description: "Web search via Brave",
      package: "@anthropic/mcp-brave-search",
      command: "npx",
      args: ["-y", "@anthropic/mcp-brave-search"],
      env: { BRAVE_API_KEY: "${BRAVE_API_KEY}" },
      category: "ai",
      installed: installedIds.has("brave-search"),
      enabled: installedIds.has("brave-search"),
    },
    {
      id: "memory",
      name: "Memory",
      description: "Persistent memory for conversations",
      package: "@anthropic/mcp-memory",
      command: "npx",
      args: ["-y", "@anthropic/mcp-memory"],
      category: "ai",
      installed: installedIds.has("memory"),
      enabled: installedIds.has("memory"),
    },
    {
      id: "puppeteer",
      name: "Puppeteer",
      description: "Browser automation",
      package: "@anthropic/mcp-puppeteer",
      command: "npx",
      args: ["-y", "@anthropic/mcp-puppeteer"],
      category: "productivity",
      installed: installedIds.has("puppeteer"),
      enabled: installedIds.has("puppeteer"),
    },
    {
      id: "postgres",
      name: "PostgreSQL",
      description: "PostgreSQL database access",
      package: "@anthropic/mcp-postgres",
      command: "npx",
      args: ["-y", "@anthropic/mcp-postgres"],
      env: { POSTGRES_URL: "${POSTGRES_URL}" },
      category: "data",
      installed: installedIds.has("postgres"),
      enabled: installedIds.has("postgres"),
    },
    {
      id: "sqlite",
      name: "SQLite",
      description: "SQLite database access",
      package: "@anthropic/mcp-sqlite",
      command: "npx",
      args: ["-y", "@anthropic/mcp-sqlite"],
      category: "data",
      installed: installedIds.has("sqlite"),
      enabled: installedIds.has("sqlite"),
    },
  ];

  return available;
}

function getInstalledMCPServers(): MCPServer[] {
  try {
    if (!existsSync(MCP_CONFIG_FILE)) {
      return [];
    }
    const config = JSON.parse(readFileSync(MCP_CONFIG_FILE, "utf-8"));
    const servers = config.mcpServers || {};
    const available = getAvailableMCPServers();

    return Object.entries(servers).map(([id, serverConfig]: [string, any]) => {
      const template = available.find((s) => s.id === id);
      return {
        id,
        name: template?.name || id,
        description: template?.description || "",
        package: template?.package || "",
        command: serverConfig.command || "npx",
        args: serverConfig.args || [],
        env: serverConfig.env,
        category: template?.category || "other",
        installed: true,
        enabled: true,
      };
    });
  } catch {
    return [];
  }
}

function installMCPServer(serverId: string): boolean {
  try {
    const available = getAvailableMCPServers();
    const server = available.find((s) => s.id === serverId);
    if (!server) return false;

    let config: any = { mcpServers: {} };
    if (existsSync(MCP_CONFIG_FILE)) {
      config = JSON.parse(readFileSync(MCP_CONFIG_FILE, "utf-8"));
    }

    config.mcpServers[serverId] = {
      type: "stdio",
      command: server.command,
      args: server.args,
      ...(server.env && { env: server.env }),
    };

    writeFileSync(MCP_CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error("Failed to install MCP server:", err);
    return false;
  }
}

function uninstallMCPServer(serverId: string): boolean {
  try {
    if (!existsSync(MCP_CONFIG_FILE)) return false;

    const config = JSON.parse(readFileSync(MCP_CONFIG_FILE, "utf-8"));
    if (!config.mcpServers?.[serverId]) return false;

    delete config.mcpServers[serverId];
    writeFileSync(MCP_CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error("Failed to uninstall MCP server:", err);
    return false;
  }
}

// ============================================================================
// API Routes - Projects
// ============================================================================

app.get("/api/projects", (_req, res) => {
  try {
    const folders = readdirSync(CLAUDE_PROJECTS_DIR).filter((f) => {
      const stat = statSync(join(CLAUDE_PROJECTS_DIR, f));
      return stat.isDirectory() && !f.startsWith(".");
    });

    const projects = folders.map((folder) => ({
      folder,
      path: decodeProjectFolder(folder),
      name: decodeProjectFolder(folder).split("/").pop(),
    }));

    res.json({ data: projects });
  } catch {
    res.status(500).json({ error: "Failed to list projects" });
  }
});

app.get("/api/projects/:folder/sessions", async (req, res) => {
  const { folder } = req.params;
  const sessions = getProjectSessions(folder);
  const enrichedSessions = await enrichSessionsStatus(sessions);
  res.json({ data: enrichedSessions });
});

app.get("/api/projects/:folder/sessions/:sessionId", async (req, res) => {
  const { folder, sessionId } = req.params;
  const session = getSessionDetail(folder, sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const enrichedSession = await enrichSessionStatus(session);
  res.json({ data: enrichedSession });
});

// Spawn new project
app.post("/api/projects/spawn", async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name required" });
    return;
  }

  // Validate project name
  if (!/^[a-z0-9-]+$/.test(name)) {
    res
      .status(400)
      .json({ error: "name must be lowercase alphanumeric with hyphens" });
    return;
  }

  try {
    const { stdout, stderr } = await execAsync(
      `${PROJECT_SPAWN_SCRIPT} ${name}`,
      {
        timeout: 120000, // 2 minute timeout
      },
    );

    // Parse output for project path
    const pathMatch = stdout.match(/Local:\s+(.+)/);
    const repoMatch = stdout.match(/Remote:\s+(.+)/);

    res.json({
      data: {
        success: true,
        name,
        projectPath: pathMatch ? pathMatch[1].trim() : `/Users/diego/${name}`,
        repo: repoMatch ? repoMatch[1].trim() : null,
        output: stdout,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      error: "Failed to spawn project",
      details: err.message,
    });
  }
});

// ============================================================================
// API Routes - Sessions
// ============================================================================

app.get("/api/sessions", async (_req, res) => {
  const sessions = getAllSessions();
  const enrichedSessions = await enrichSessionsStatus(sessions);
  res.json({ data: enrichedSessions });
});

app.get("/api/summary", async (_req, res) => {
  try {
    const sessions = getAllSessions();
    const enrichedSessions = await enrichSessionsStatus(sessions);

    const workingSessions = enrichedSessions.filter(
      (s) => s.status === "working",
    ).length;
    const waitingSessions = enrichedSessions.filter(
      (s) => s.status === "waiting" || s.status === "needs-approval",
    ).length;
    const idleSessions = enrichedSessions.filter(
      (s) => s.status === "idle",
    ).length;

    const totalMessages = enrichedSessions.reduce(
      (sum, s) => sum + s.messageCount,
      0,
    );
    const totalToolCalls = enrichedSessions.reduce(
      (sum, s) => sum + s.toolCallCount,
      0,
    );

    const projectPaths = new Set(enrichedSessions.map((s) => s.projectPath));

    res.json({
      data: {
        totalProjects: projectPaths.size,
        totalSessions: enrichedSessions.length,
        workingSessions,
        waitingSessions,
        idleSessions,
        totalMessages,
        totalToolCalls,
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to get summary" });
  }
});

// SSE for real-time updates
app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  clients.add(res);
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  req.on("close", () => {
    clients.delete(res);
  });
});

// Session-specific SSE stream for real-time message updates
const sessionWatchers = new Map<string, Set<express.Response>>();

app.get("/api/projects/:folder/sessions/:sessionId/stream", (req, res) => {
  const { folder, sessionId } = req.params;
  const projectDir = join(CLAUDE_PROJECTS_DIR, folder);
  const logFile = join(projectDir, `${sessionId}.jsonl`);

  // Check if file exists
  if (!existsSync(logFile)) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Track file position to only send new content
  let lastSize = 0;
  try {
    const stats = statSync(logFile);
    lastSize = stats.size;
  } catch {
    // Ignore
  }

  // Add client to session watchers
  const watcherKey = `${folder}/${sessionId}`;
  if (!sessionWatchers.has(watcherKey)) {
    sessionWatchers.set(watcherKey, new Set());
  }
  sessionWatchers.get(watcherKey)!.add(res);

  // Send initial connection message with current status (using stored PIDs)
  let lastKnownStatus: SessionStatus = isSessionPidAlive(sessionId)
    ? "working"
    : "waiting";
  res.write(
    `data: ${JSON.stringify({ type: "connected", sessionId, status: lastKnownStatus })}\n\n`,
  );

  // Poll for status changes every 2 seconds (using stored PIDs)
  const statusInterval = setInterval(() => {
    try {
      const newStatus: SessionStatus = isSessionPidAlive(sessionId)
        ? "working"
        : "waiting";
      if (newStatus !== lastKnownStatus) {
        lastKnownStatus = newStatus;
        res.write(
          `data: ${JSON.stringify({ type: "status", status: newStatus })}\n\n`,
        );
      }
    } catch {
      // Ignore errors
    }
  }, 2000);

  // Track last tool call for approval detection across messages
  let lastToolCall: { name: string; input: Record<string, unknown> } | null =
    null;

  // Watch for file changes
  const fileWatcher = chokidar.watch(logFile, {
    persistent: true,
    usePolling: true,
    interval: 500,
  });

  fileWatcher.on("change", () => {
    try {
      const stats = statSync(logFile);
      if (stats.size > lastSize) {
        // Read only new content
        const fd = openSync(logFile, "r");
        const newContent = Buffer.alloc(stats.size - lastSize);
        readSync(fd, newContent, 0, stats.size - lastSize, lastSize);
        closeSync(fd);

        const newLines = newContent.toString("utf-8").trim().split("\n");

        for (const line of newLines) {
          if (!line.trim()) continue;
          try {
            const entry = JSON.parse(line);

            // Parse and send new message
            if (
              (entry.type === "user" || entry.type === "assistant") &&
              entry.message
            ) {
              const msg: ParsedMessage = {
                id: entry.uuid || `${entry.timestamp}-${entry.type}`,
                role: entry.type as "user" | "assistant",
                timestamp: entry.timestamp,
                content: "",
                toolCalls: [],
              };

              // Track whether this user message has actual user text vs just tool results
              let hasUserText = false;
              let hasToolResults = false;
              let isTodoWriteResult = false;

              for (const block of entry.message.content || []) {
                if (block.type === "text" && block.text) {
                  msg.content += block.text + "\n";
                  // Only count as user text if it's actual user input (not system tags)
                  if (
                    !block.text.trim().startsWith("<") &&
                    msg.role === "user"
                  ) {
                    hasUserText = true;
                  }
                } else if (block.type === "thinking" && block.thinking) {
                  msg.thinking = block.thinking;
                } else if (block.type === "tool_use" && block.name) {
                  msg.toolCalls?.push({
                    id: block.tool_use_id,
                    name: block.name,
                    input: block.input || {},
                    status: "complete",
                  });
                  // Send todo updates when TodoWrite is called
                  if (block.name === "TodoWrite" && block.input?.todos) {
                    const todos = (block.input.todos as TodoItem[]).map(
                      (t) => ({
                        content: t.content,
                        status: t.status,
                        activeForm: t.activeForm,
                      }),
                    );
                    res.write(
                      `data: ${JSON.stringify({ type: "todos", todos })}\n\n`,
                    );
                  }
                } else if (block.type === "tool_result" && block.content) {
                  hasToolResults = true;
                  // Check if this is a TodoWrite result
                  const resultText =
                    typeof block.content === "string"
                      ? block.content
                      : JSON.stringify(block.content);
                  if (resultText.includes("Todos have been modified")) {
                    isTodoWriteResult = true;
                  }
                  // For user messages, extract tool result content for system context detection
                  if (msg.role === "user") {
                    const resultContent =
                      typeof block.content === "string"
                        ? block.content
                        : Array.isArray(block.content)
                          ? block.content
                              .filter(
                                (c: { type: string; text?: string }) =>
                                  c.type === "text" && c.text,
                              )
                              .map((c: { text: string }) => c.text)
                              .join("\n")
                          : JSON.stringify(block.content);
                    if (resultContent) {
                      msg.content += resultContent + "\n";
                    }
                  } else {
                    const lastCall = msg.toolCalls?.[msg.toolCalls.length - 1];
                    if (lastCall) {
                      lastCall.result =
                        typeof block.content === "string"
                          ? block.content.slice(0, 500)
                          : JSON.stringify(block.content).slice(0, 500);
                    }
                  }
                }
              }

              msg.content = msg.content.trim();

              // Mark user messages that only contain tool results (no actual user text)
              // ALL tool results should display as assistant (Claude's side of the conversation)
              if (msg.role === "user" && hasToolResults && !hasUserText) {
                msg.isToolResult = true;
                msg.role = "assistant";
                if (isTodoWriteResult) {
                  msg.toolResultType = "todo";
                }
              }

              // Detect system context messages for real-time stream
              if (msg.role === "user") {
                const systemContextInfo = detectSystemContext(msg.content);
                if (systemContextInfo) {
                  msg.isSystemContext = true;
                  msg.systemContextType = systemContextInfo.type;
                  msg.systemContextName = systemContextInfo.name;
                  msg.systemContextFile = systemContextInfo.file;
                }
              }

              // Detect local command messages for real-time stream
              if (msg.role === "user") {
                const localCommandInfo = detectLocalCommand(msg.content);
                if (localCommandInfo) {
                  msg.isLocalCommand = true;
                  msg.localCommandType = localCommandInfo.type;
                  msg.content = localCommandInfo.content;
                }
              }

              // Track last tool call for approval detection
              if (msg.toolCalls && msg.toolCalls.length > 0) {
                const lastCall = msg.toolCalls[msg.toolCalls.length - 1];
                lastToolCall = {
                  name: lastCall.name,
                  input: lastCall.input as Record<string, unknown>,
                };
              }

              // Detect approval-needed messages for real-time stream
              if (msg.role === "assistant") {
                const approvalInfo = detectApprovalNeeded(msg.content);
                if (approvalInfo) {
                  msg.needsApproval = true;
                  // If command is unknown, use the last tracked tool call
                  if (
                    approvalInfo.command === "Unknown command" &&
                    lastToolCall
                  ) {
                    if (
                      lastToolCall.name === "Bash" &&
                      lastToolCall.input?.command
                    ) {
                      const bashCmd = String(lastToolCall.input.command);
                      msg.approvalCommand = `Bash(${bashCmd})`;
                      // Keep full path for pattern matching
                      const cmdForPattern = extractCommandForPattern(bashCmd);
                      msg.approvalPattern = `Bash(${cmdForPattern}:*)`;
                    } else {
                      msg.approvalCommand = `${lastToolCall.name}(${JSON.stringify(lastToolCall.input).slice(0, 50)}...)`;
                      msg.approvalPattern = `${lastToolCall.name}(:*)`;
                    }
                  } else {
                    msg.approvalCommand = approvalInfo.command;
                    msg.approvalPattern = approvalInfo.pattern;
                  }
                }
              }

              if (msg.content || (msg.toolCalls && msg.toolCalls.length > 0)) {
                res.write(
                  `data: ${JSON.stringify({ type: "message", message: msg })}\n\n`,
                );
              }
            } else if (entry.type === "system") {
              // System events like status changes
              res.write(
                `data: ${JSON.stringify({ type: "system", data: entry })}\n\n`,
              );
            }
          } catch {
            // Ignore parse errors for individual lines
          }
        }

        lastSize = stats.size;
      }
    } catch {
      // Ignore errors
    }
  });

  // Clean up on client disconnect
  req.on("close", () => {
    clearInterval(statusInterval);
    fileWatcher.close();
    const watchers = sessionWatchers.get(watcherKey);
    if (watchers) {
      watchers.delete(res);
      if (watchers.size === 0) {
        sessionWatchers.delete(watcherKey);
      }
    }
  });
});

// ============================================================================
// API Routes - Process Management
// ============================================================================

app.get("/api/processes", (_req, res) => {
  try {
    // Return all stored PIDs as the list of running processes
    const storedPids = loadSessionPids();
    const processes = Object.entries(storedPids)
      .filter(([, info]) => isPidAlive(info.pid))
      .map(([sessionId, info]) => ({
        pid: info.pid,
        sessionId,
        projectPath: info.projectPath,
        startTime: info.startTime,
      }));
    res.json({ data: processes });
  } catch {
    res.status(500).json({ error: "Failed to get processes" });
  }
});

// Helper function to get status for a single session (uses stored PIDs only)
function getSessionStatusInternal(
  sessionId: string,
  _projectPath: string,
  sessionStatus: SessionStatus,
): {
  running: boolean;
  status: SessionStatus;
  pid?: number;
  projectPath?: string;
  startTime?: string;
} {
  // Check stored PID for this session
  const storedInfo = getSessionPid(sessionId);
  if (storedInfo && isPidAlive(storedInfo.pid)) {
    return {
      running: true,
      pid: storedInfo.pid,
      projectPath: storedInfo.projectPath,
      startTime: storedInfo.startTime,
      status: "working",
    };
  }

  // If we had a stored PID but it's dead, clean it up
  if (storedInfo) {
    removeSessionPid(sessionId);
  }

  // No running process - use session's status from log analysis
  return {
    running: false,
    status: sessionStatus === "working" ? "waiting" : sessionStatus,
  };
}

// Batch endpoint to get status for ALL sessions at once
// This reduces API calls from N (one per session) to 1
// OPTIMIZED: Only uses stored PIDs - no file parsing needed
app.get("/api/sessions/status", (_req, res) => {
  try {
    // Load all stored PIDs once - this is just reading a small JSON file
    const storedPids = loadSessionPids();

    // Build the response map from stored PIDs only
    const statuses: Record<
      string,
      {
        running: boolean;
        status: SessionStatus;
        pid?: number;
        projectPath?: string;
        startTime?: string;
      }
    > = {};

    // For each stored PID entry, check if it's still alive
    for (const [sessionId, info] of Object.entries(storedPids)) {
      const isAlive = isPidAlive(info.pid);
      statuses[sessionId] = {
        running: isAlive,
        status: isAlive ? "working" : "waiting",
        pid: isAlive ? info.pid : undefined,
        projectPath: info.projectPath,
        startTime: info.startTime,
      };

      // Clean up dead PIDs
      if (!isAlive) {
        removeSessionPid(sessionId);
      }
    }

    res.json({ data: statuses });
  } catch (err) {
    console.error("Failed to get session statuses:", err);
    res.status(500).json({ error: "Failed to get session statuses" });
  }
});

app.get("/api/sessions/:sessionId/process", (req, res) => {
  const { sessionId } = req.params;

  // Check stored PID for this session
  const storedInfo = getSessionPid(sessionId);
  if (storedInfo && isPidAlive(storedInfo.pid)) {
    res.json({
      data: {
        running: true,
        pid: storedInfo.pid,
        projectPath: storedInfo.projectPath,
        startTime: storedInfo.startTime,
        status: "working" as SessionStatus,
      },
    });
    return;
  }

  // If we had a stored PID but it's dead, clean it up
  if (storedInfo) {
    removeSessionPid(sessionId);
  }

  res.json({
    data: {
      running: false,
      status: "waiting" as SessionStatus,
    },
  });
});

app.post("/api/sessions/:sessionId/kill", async (req, res) => {
  const { sessionId } = req.params;
  const { projectPath } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: "projectPath required in body" });
    return;
  }

  // Get stored PID for this session
  const storedInfo = getSessionPid(sessionId);
  if (!storedInfo) {
    res
      .status(404)
      .json({ error: "No running process found for this session" });
    return;
  }

  // Kill the process using the stored PID
  const killed = await killProcess(storedInfo.pid);
  if (killed) {
    // Remove the stored PID (this also notifies clients)
    untrackSpawnedProcess(sessionId);
    notifyClients({
      type: "process_killed",
      pid: storedInfo.pid,
      sessionId,
      projectPath,
    });
    res.json({ data: { success: true, pid: storedInfo.pid } });
  } else {
    // Process might have already exited, clean up anyway
    removeSessionPid(sessionId);
    res
      .status(500)
      .json({ error: "Failed to kill process (may have already exited)" });
  }
});

app.post("/api/sessions/:sessionId/resume", async (req, res) => {
  const { sessionId } = req.params;
  const { projectPath } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: "projectPath required in body" });
    return;
  }

  try {
    const cmd =
      process.platform === "darwin"
        ? `osascript -e 'tell application "Terminal" to do script "cd \\"${projectPath}\\" && claude --resume ${sessionId}"'`
        : `gnome-terminal -- bash -c "cd '${projectPath}' && claude --resume ${sessionId}; exec bash"`;

    exec(cmd);
    res.json({ data: { success: true } });
  } catch {
    res.status(500).json({ error: "Failed to resume session" });
  }
});

// Send message to session via API
app.post("/api/sessions/:sessionId/message", async (req, res) => {
  const { sessionId } = req.params;
  const { projectPath, message, automate = false } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: "projectPath required in body" });
    return;
  }

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message required in body" });
    return;
  }

  try {
    // Check if THIS SPECIFIC SESSION is already running (not any session in the project)
    if (isSessionRunning(sessionId)) {
      res.status(409).json({
        error:
          "Claude is already running for this session. Please wait for it to finish or stop it first.",
      });
      return;
    }

    // Build command arguments
    const claudeArgs = ["--resume", sessionId, "-p", message];
    if (automate) {
      claudeArgs.unshift("--dangerously-skip-permissions");
    }

    // Spawn Claude as a background process with the message
    const claudeProcess = spawn("claude", claudeArgs, {
      cwd: projectPath,
      detached: true,
      stdio: "ignore",
    });

    // Track this process for reliable killing later
    if (claudeProcess.pid) {
      trackSpawnedProcess(sessionId, claudeProcess.pid, projectPath);

      // Clean up tracking when process exits
      claudeProcess.on("exit", () => {
        untrackSpawnedProcess(sessionId);
      });
    }

    // Unref so the parent process can exit independently
    claudeProcess.unref();

    res.json({
      data: {
        success: true,
        pid: claudeProcess.pid,
        status: "working" as SessionStatus,
      },
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to send message";
    res.status(500).json({ error: errorMessage });
  }
});

app.delete("/api/projects/:folder/sessions/:sessionId", (req, res) => {
  const { folder, sessionId } = req.params;
  const projectDir = join(CLAUDE_PROJECTS_DIR, folder);
  const logFile = join(projectDir, `${sessionId}.jsonl`);

  try {
    // First kill any running process for this session
    const pidInfo = getSessionPid(sessionId);
    if (pidInfo && isPidAlive(pidInfo.pid)) {
      try {
        process.kill(pidInfo.pid, "SIGTERM");
      } catch {
        // Process may have already exited
      }
    }

    // Clean up session PID tracking
    removeSessionPid(sessionId);

    // Clean up session name
    removeSessionName(sessionId);

    // Clean up session order
    removeSessionOrder(sessionId);

    // Delete the session log file
    if (existsSync(logFile)) {
      unlinkSync(logFile);
    }

    notifyClients({ type: "session_deleted", sessionId, folder });
    res.json({ data: { success: true } });
  } catch (err) {
    console.error("Failed to delete session:", err);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// ============================================================================
// API Routes - Session Names
// ============================================================================

app.get("/api/session-names", (_req, res) => {
  const names = loadSessionNames();
  res.json({ data: names });
});

app.get("/api/sessions/:sessionId/name", (req, res) => {
  const { sessionId } = req.params;
  const name = getSessionName(sessionId);
  res.json({ data: { name } });
});

app.put("/api/sessions/:sessionId/name", (req, res) => {
  const { sessionId } = req.params;
  const { name } = req.body;

  if (typeof name !== "string") {
    res.status(400).json({ error: "name must be a string" });
    return;
  }

  setSessionName(sessionId, name);
  notifyClients({ type: "session_name_changed", sessionId, name });
  res.json({ data: { success: true, name: name.trim() || null } });
});

// ============================================================================
// API Routes - Session Order
// ============================================================================

app.get("/api/session-order", (_req, res) => {
  const order = loadSessionOrder();
  res.json({ data: order });
});

app.put("/api/sessions/:sessionId/order", (req, res) => {
  const { sessionId } = req.params;
  const { order } = req.body;

  if (typeof order !== "number") {
    res.status(400).json({ error: "order must be a number" });
    return;
  }

  setSessionOrder(sessionId, order);
  notifyClients({ type: "session_order_changed", sessionId, order });
  res.json({ data: { success: true, order } });
});

app.put("/api/session-order/batch", (req, res) => {
  const { orders } = req.body;

  if (typeof orders !== "object" || orders === null) {
    res.status(400).json({ error: "orders must be an object" });
    return;
  }

  setSessionOrderBatch(orders);
  notifyClients({ type: "session_order_batch_changed", orders });
  res.json({ data: { success: true, orders } });
});

// Create a new session with an initial message
app.post("/api/sessions/new", (req, res) => {
  const { projectPath, message, automate = false } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: "projectPath required" });
    return;
  }

  if (!message || typeof message !== "string") {
    res
      .status(400)
      .json({ error: "message required - sessions must start with a message" });
    return;
  }

  try {
    const stats = statSync(projectPath);
    if (!stats.isDirectory()) {
      res.status(400).json({ error: "projectPath is not a directory" });
      return;
    }
  } catch {
    res.status(400).json({ error: "projectPath does not exist" });
    return;
  }

  const sessionId = randomUUID();

  // Build command arguments
  const claudeArgs = ["--session-id", sessionId, "-p", message];
  if (automate) {
    claudeArgs.unshift("--dangerously-skip-permissions");
  }

  // Spawn Claude with the new session ID and initial message
  const claudeProcess = spawn("claude", claudeArgs, {
    cwd: projectPath,
    detached: true,
    stdio: "ignore",
  });

  // Track this process for reliable killing later
  if (claudeProcess.pid) {
    trackSpawnedProcess(sessionId, claudeProcess.pid, projectPath);

    // Clean up tracking when process exits
    claudeProcess.on("exit", () => {
      untrackSpawnedProcess(sessionId);
    });
  }

  claudeProcess.unref();

  res.json({
    data: {
      sessionId,
      projectPath,
      pid: claudeProcess.pid,
      status: "working" as SessionStatus,
      automated: automate,
    },
  });
});

// ============================================================================
// API Routes - Marketplace
// ============================================================================

app.get("/api/marketplace/available", (_req, res) => {
  const servers = getAvailableMCPServers();
  res.json({ data: servers });
});

app.get("/api/marketplace/installed", (_req, res) => {
  const servers = getInstalledMCPServers();
  res.json({ data: servers });
});

app.post("/api/marketplace/install", (req, res) => {
  const { serverId } = req.body;

  if (!serverId) {
    res.status(400).json({ error: "serverId required" });
    return;
  }

  const success = installMCPServer(serverId);
  if (success) {
    notifyClients({ type: "mcp_installed", serverId });
    res.json({
      data: {
        success: true,
        message: "Restart Claude Code to apply changes",
      },
    });
  } else {
    res.status(500).json({ error: "Failed to install server" });
  }
});

app.delete("/api/marketplace/uninstall", (req, res) => {
  const { serverId } = req.body;

  if (!serverId) {
    res.status(400).json({ error: "serverId required" });
    return;
  }

  const success = uninstallMCPServer(serverId);
  if (success) {
    notifyClients({ type: "mcp_uninstalled", serverId });
    res.json({
      data: {
        success: true,
        message: "Restart Claude Code to apply changes",
      },
    });
  } else {
    res.status(500).json({ error: "Failed to uninstall server" });
  }
});

// ============================================================================
// API Routes - Agents
// ============================================================================

app.get("/api/agents", (_req, res) => {
  const agents = loadAgents();
  res.json({ data: agents });
});

app.post("/api/agents", (req, res) => {
  const { name, description, domain, systemPrompt, tools, allowedCommands } =
    req.body;

  if (!name || !domain) {
    res.status(400).json({ error: "name and domain required" });
    return;
  }

  const agents = loadAgents();
  const newAgent: Agent = {
    id: randomUUID(),
    name,
    description: description || "",
    domain,
    systemPrompt: systemPrompt || "",
    tools: tools || [],
    allowedCommands: allowedCommands || [],
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  agents.push(newAgent);
  saveAgents(agents);

  res.json({ data: newAgent });
});

app.put("/api/agents/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const agents = loadAgents();
  const index = agents.findIndex((a) => a.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  agents[index] = {
    ...agents[index],
    ...updates,
    updated: new Date().toISOString(),
  };

  saveAgents(agents);
  res.json({ data: agents[index] });
});

app.delete("/api/agents/:id", (req, res) => {
  const { id } = req.params;

  const agents = loadAgents();
  const filtered = agents.filter((a) => a.id !== id);

  if (filtered.length === agents.length) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  saveAgents(filtered);
  res.json({ data: { success: true } });
});

// ============================================================================
// API Routes - Webhooks
// ============================================================================

app.get("/api/webhooks", (_req, res) => {
  const webhooks = loadWebhooks();
  res.json({ data: webhooks });
});

app.post("/api/webhooks", (req, res) => {
  const { name, url, events, headers, secret } = req.body;

  if (!name || !url || !events || !Array.isArray(events)) {
    res.status(400).json({ error: "name, url, and events array required" });
    return;
  }

  const webhooks = loadWebhooks();
  const newWebhook: Webhook = {
    id: randomUUID(),
    name,
    url,
    events,
    headers,
    secret,
    enabled: true,
    created: new Date().toISOString(),
  };

  webhooks.push(newWebhook);
  saveWebhooks(webhooks);

  res.json({ data: newWebhook });
});

app.put("/api/webhooks/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const webhooks = loadWebhooks();
  const index = webhooks.findIndex((w) => w.id === id);

  if (index === -1) {
    res.status(404).json({ error: "Webhook not found" });
    return;
  }

  webhooks[index] = {
    ...webhooks[index],
    ...updates,
  };

  saveWebhooks(webhooks);
  res.json({ data: webhooks[index] });
});

app.delete("/api/webhooks/:id", (req, res) => {
  const { id } = req.params;

  const webhooks = loadWebhooks();
  const filtered = webhooks.filter((w) => w.id !== id);

  if (filtered.length === webhooks.length) {
    res.status(404).json({ error: "Webhook not found" });
    return;
  }

  saveWebhooks(filtered);
  res.json({ data: { success: true } });
});

app.post("/api/webhooks/test", async (req, res) => {
  const { url, secret } = req.body;

  if (!url) {
    res.status(400).json({ error: "url required" });
    return;
  }

  try {
    const payload = {
      event: "test",
      timestamp: new Date().toISOString(),
      data: { message: "Test webhook from Claude Dashboard" },
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (secret) {
      const signature = createHmac("sha256", secret)
        .update(JSON.stringify(payload))
        .digest("hex");
      headers["X-Webhook-Signature"] = signature;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    res.json({
      data: {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// API Routes - Slash Commands
// ============================================================================

interface SlashCommand {
  name: string;
  description: string;
  source: "project";
  hasArguments: boolean;
  filePath?: string;
}

function getProjectCommands(projectPath: string): SlashCommand[] {
  const commands: SlashCommand[] = [];
  const commandsDir = join(projectPath, ".claude", "commands");

  try {
    if (!existsSync(commandsDir)) {
      return commands;
    }

    const files = readdirSync(commandsDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;

      const filePath = join(commandsDir, file);
      const content = readFileSync(filePath, "utf-8");

      // Parse frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      let description = "";

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const descMatch = frontmatter.match(/description:\s*(.+)/);
        if (descMatch) {
          description = descMatch[1].trim();
        }
      }

      // Check if command uses $ARGUMENTS
      const hasArguments = content.includes("$ARGUMENTS");

      const commandName = file.replace(".md", "");
      commands.push({
        name: commandName,
        description: description || `Run ${commandName} command`,
        source: "project",
        hasArguments,
        filePath,
      });
    }
  } catch (err) {
    console.error("Failed to read project commands:", err);
  }

  return commands;
}

app.get("/api/projects/:folder/commands", (req, res) => {
  const { folder } = req.params;
  const projectPath = decodeProjectFolder(folder);

  const projectCommands = getProjectCommands(projectPath);

  res.json({ data: projectCommands });
});

app.get("/api/projects/:folder/commands/:commandName", (req, res) => {
  const { folder, commandName } = req.params;
  const projectPath = decodeProjectFolder(folder);
  const commandsDir = join(projectPath, ".claude", "commands");
  const commandFile = join(commandsDir, `${commandName}.md`);

  try {
    if (!existsSync(commandFile)) {
      res.status(404).json({ error: "Command not found" });
      return;
    }

    const content = readFileSync(commandFile, "utf-8");
    res.json({ data: { name: commandName, content } });
  } catch (err) {
    res.status(500).json({ error: "Failed to read command" });
  }
});

// ============================================================================
// API Routes - Approval System
// ============================================================================

// Project settings interface
interface ClaudeSettings {
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
  hooks?: Record<string, unknown>;
  env?: Record<string, string>;
}

// Approve a waiting Claude session
// Flow: 1) Kill any existing waiting process, 2) Optionally add pattern, 3) Resume session
app.post("/api/sessions/:sessionId/approve", async (req, res) => {
  const { sessionId } = req.params;
  const { projectPath, pattern, alwaysAllow } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: "projectPath required in body" });
    return;
  }

  try {
    // Check if session directory exists
    try {
      const stats = statSync(projectPath);
      if (!stats.isDirectory()) {
        res.status(400).json({ error: "projectPath is not a directory" });
        return;
      }
    } catch {
      res.status(400).json({ error: "projectPath does not exist" });
      return;
    }

    // Step 1: Kill any existing process for this session (it's waiting for input)
    const storedInfo = getSessionPid(sessionId);
    if (storedInfo) {
      console.log(
        `[Approve] Killing waiting process ${storedInfo.pid} for session ${sessionId}`,
      );
      await killProcess(storedInfo.pid);
      untrackSpawnedProcess(sessionId);
    }

    // Step 2: If "Always Allow" was selected, add the pattern to settings
    if (alwaysAllow && pattern) {
      const settingsPath = join(projectPath, ".claude", "settings.json");
      const claudeDir = join(projectPath, ".claude");

      // Ensure .claude directory exists
      if (!existsSync(claudeDir)) {
        mkdirSync(claudeDir, { recursive: true });
      }

      // Read or create settings
      let settings: ClaudeSettings = { permissions: { allow: [], deny: [] } };
      if (existsSync(settingsPath)) {
        try {
          const content = readFileSync(settingsPath, "utf-8");
          settings = JSON.parse(content);
        } catch {
          // Use default if parse fails
        }
      }

      // Initialize permissions if not present
      if (!settings.permissions) {
        settings.permissions = { allow: [], deny: [] };
      }
      if (!settings.permissions.allow) {
        settings.permissions.allow = [];
      }

      // Add pattern if not already present
      if (!settings.permissions.allow.includes(pattern)) {
        settings.permissions.allow.push(pattern);
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        console.log(
          `[Approve] Added pattern "${pattern}" to settings for ${projectPath}`,
        );
      }
    }

    // Step 3: Resume the session - it will now proceed with the command
    // (either because we're approving once, or because the pattern is now in allow list)
    const claudeProcess = spawn("claude", ["--resume", sessionId], {
      cwd: projectPath,
      detached: true,
      stdio: "ignore",
    });

    // Track this process
    if (claudeProcess.pid) {
      trackSpawnedProcess(sessionId, claudeProcess.pid, projectPath);

      // Clean up tracking when process exits
      claudeProcess.on("exit", () => {
        untrackSpawnedProcess(sessionId);
      });
    }

    claudeProcess.unref();

    res.json({
      data: {
        success: true,
        pid: claudeProcess.pid,
        status: "working" as SessionStatus,
        message: alwaysAllow
          ? "Pattern added and session resumed"
          : "Session resumed",
        patternAdded: alwaysAllow ? pattern : null,
      },
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to approve session";
    res.status(500).json({ error: errorMessage });
  }
});

// Get project settings.json
app.get("/api/projects/:folder/settings", (req, res) => {
  const { folder } = req.params;
  const projectPath = decodeProjectFolder(folder);
  const settingsPath = join(projectPath, ".claude", "settings.json");

  try {
    if (!existsSync(settingsPath)) {
      // Return default empty settings if file doesn't exist
      res.json({
        data: {
          permissions: {
            allow: [],
            deny: [],
          },
        },
      });
      return;
    }

    const content = readFileSync(settingsPath, "utf-8");
    const settings: ClaudeSettings = JSON.parse(content);
    res.json({ data: settings });
  } catch (err) {
    console.error("Failed to read settings:", err);
    res.status(500).json({ error: "Failed to read project settings" });
  }
});

// Add a pattern to the project's settings.json allow list
app.post("/api/projects/:folder/settings/allow", (req, res) => {
  const { folder } = req.params;
  const { pattern } = req.body;

  if (!pattern || typeof pattern !== "string") {
    res.status(400).json({ error: "pattern required in body" });
    return;
  }

  const projectPath = decodeProjectFolder(folder);
  const claudeDir = join(projectPath, ".claude");
  const settingsPath = join(claudeDir, "settings.json");

  try {
    // Ensure .claude directory exists
    if (!existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
    }

    // Load existing settings or create default
    let settings: ClaudeSettings = {
      permissions: {
        allow: [],
        deny: [],
      },
    };

    if (existsSync(settingsPath)) {
      const content = readFileSync(settingsPath, "utf-8");
      settings = JSON.parse(content);
    }

    // Ensure permissions.allow exists
    if (!settings.permissions) {
      settings.permissions = { allow: [], deny: [] };
    }
    if (!settings.permissions.allow) {
      settings.permissions.allow = [];
    }

    // Add pattern if not already present
    if (!settings.permissions.allow.includes(pattern)) {
      settings.permissions.allow.push(pattern);
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    }

    res.json({
      data: {
        success: true,
        allowList: settings.permissions.allow,
        message: `Pattern "${pattern}" added to allow list`,
      },
    });
  } catch (err) {
    console.error("Failed to update settings:", err);
    res.status(500).json({ error: "Failed to update project settings" });
  }
});

// ============================================================================
// Multiplexed SSE Stream for All Sessions
// ============================================================================

// Note: multiplexedClients is declared at the top of the SSE section

// Track file sizes for incremental reading
const sessionFileSizes = new Map<string, number>();

// Track last tool call per session for approval detection in multiplexed stream
const sessionLastToolCalls = new Map<
  string,
  { name: string; input: Record<string, unknown> }
>();

// Function to check a single file for changes and broadcast
function checkFileForChanges(filePath: string): void {
  if (!filePath.endsWith(".jsonl")) return;
  if (multiplexedClients.size === 0) return;

  try {
    const stats = statSync(filePath);
    const lastSize = sessionFileSizes.get(filePath) || 0;

    if (stats.size <= lastSize) {
      if (stats.size < lastSize) {
        // File was truncated, reset
        sessionFileSizes.set(filePath, stats.size);
      }
      return;
    }

    console.log(
      `[Stream] File change detected: ${basename(filePath)}, clients: ${multiplexedClients.size}`,
    );

    // Read only new content
    const fd = openSync(filePath, "r");
    const newContent = Buffer.alloc(stats.size - lastSize);
    readSync(fd, newContent, 0, stats.size - lastSize, lastSize);
    closeSync(fd);

    sessionFileSizes.set(filePath, stats.size);

    // Extract sessionId from filename
    const sessionId = basename(filePath, ".jsonl");

    // Parse and broadcast new lines
    broadcastNewLines(sessionId, newContent.toString("utf-8"));
  } catch {
    // Ignore file read errors
  }
}

// Function to broadcast new lines from a session file
function broadcastNewLines(sessionId: string, content: string): void {
  const newLines = content.trim().split("\n");

  for (const line of newLines) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);

      // Parse and broadcast new message
      if (
        (entry.type === "user" || entry.type === "assistant") &&
        entry.message
      ) {
        const msg: ParsedMessage = {
          id: entry.uuid || `${entry.timestamp}-${entry.type}`,
          role: entry.type as "user" | "assistant",
          timestamp: entry.timestamp,
          content: "",
          toolCalls: [],
        };

        let hasUserText = false;
        let hasToolResults = false;
        let isTodoWriteResult = false;
        let todos: TodoItem[] | undefined;

        const messageContent = entry.message.content;
        if (typeof messageContent === "string") {
          msg.content = messageContent;
          hasUserText = messageContent.trim().length > 0;
        } else if (Array.isArray(messageContent)) {
          for (const block of messageContent) {
            if (block.type === "text" && block.text) {
              msg.content += block.text + "\n";
              if (!block.text.trim().startsWith("<") && msg.role === "user") {
                hasUserText = true;
              }
            } else if (block.type === "thinking" && block.thinking) {
              msg.thinking = block.thinking;
            } else if (block.type === "tool_use" && block.name) {
              msg.toolCalls?.push({
                id: block.tool_use_id,
                name: block.name,
                input: block.input || {},
                status: "complete",
              });
              // Extract todos from TodoWrite tool calls
              if (block.name === "TodoWrite" && block.input?.todos) {
                todos = (block.input.todos as TodoItem[]).map((t) => ({
                  content: t.content,
                  status: t.status,
                  activeForm: t.activeForm,
                }));
              }
            } else if (block.type === "tool_result" && block.content) {
              hasToolResults = true;
              // Check if this is a TodoWrite result
              const resultText =
                typeof block.content === "string"
                  ? block.content
                  : JSON.stringify(block.content);
              if (resultText.includes("Todos have been modified")) {
                isTodoWriteResult = true;
              }
              if (msg.role === "user") {
                const resultContent =
                  typeof block.content === "string"
                    ? block.content
                    : Array.isArray(block.content)
                      ? block.content
                          .filter(
                            (c: { type: string; text?: string }) =>
                              c.type === "text" && c.text,
                          )
                          .map((c: { text: string }) => c.text)
                          .join("\n")
                      : JSON.stringify(block.content);
                if (resultContent) {
                  msg.content += resultContent + "\n";
                }
              } else {
                const lastCall = msg.toolCalls?.[msg.toolCalls.length - 1];
                if (lastCall) {
                  lastCall.result =
                    typeof block.content === "string"
                      ? block.content.slice(0, 500)
                      : JSON.stringify(block.content).slice(0, 500);
                }
              }
            }
          }
        }

        msg.content = msg.content.trim();

        // Mark user messages that only contain tool results
        // ALL tool results should display as assistant (Claude's side of the conversation)
        if (msg.role === "user" && hasToolResults && !hasUserText) {
          msg.isToolResult = true;
          msg.role = "assistant";
          if (isTodoWriteResult) {
            msg.toolResultType = "todo";
          }
        }

        // Detect system context messages
        if (msg.role === "user") {
          const systemContextInfo = detectSystemContext(msg.content);
          if (systemContextInfo) {
            msg.isSystemContext = true;
            msg.systemContextType = systemContextInfo.type;
            msg.systemContextName = systemContextInfo.name;
            msg.systemContextFile = systemContextInfo.file;
          }
        }

        // Detect local command messages
        if (msg.role === "user") {
          const localCommandInfo = detectLocalCommand(msg.content);
          if (localCommandInfo) {
            msg.isLocalCommand = true;
            msg.localCommandType = localCommandInfo.type;
            msg.content = localCommandInfo.content;
          }
        }

        // Track last tool call per session for approval detection
        if (msg.toolCalls && msg.toolCalls.length > 0) {
          const lastCall = msg.toolCalls[msg.toolCalls.length - 1];
          sessionLastToolCalls.set(sessionId, {
            name: lastCall.name,
            input: lastCall.input as Record<string, unknown>,
          });
        }

        // Detect approval-needed messages
        if (msg.role === "assistant") {
          const approvalInfo = detectApprovalNeeded(msg.content);
          if (approvalInfo) {
            msg.needsApproval = true;
            // If command is unknown, use the last tracked tool call for this session
            const lastToolCall = sessionLastToolCalls.get(sessionId);
            if (approvalInfo.command === "Unknown command" && lastToolCall) {
              if (lastToolCall.name === "Bash" && lastToolCall.input?.command) {
                const bashCmd = String(lastToolCall.input.command);
                msg.approvalCommand = `Bash(${bashCmd})`;
                // Keep full path for pattern matching
                const cmdForPattern = extractCommandForPattern(bashCmd);
                msg.approvalPattern = `Bash(${cmdForPattern}:*)`;
              } else {
                msg.approvalCommand = `${lastToolCall.name}(${JSON.stringify(lastToolCall.input).slice(0, 50)}...)`;
                msg.approvalPattern = `${lastToolCall.name}(:*)`;
              }
            } else {
              msg.approvalCommand = approvalInfo.command;
              msg.approvalPattern = approvalInfo.pattern;
            }
          }
        }

        // Broadcast to all multiplexed clients
        if (msg.content || (msg.toolCalls && msg.toolCalls.length > 0)) {
          console.log(
            `[Stream] Broadcasting message for session ${sessionId} to ${multiplexedClients.size} clients`,
          );
          const messageData = JSON.stringify({
            type: "message",
            sessionId,
            message: msg,
          });
          for (const client of multiplexedClients) {
            client.write(`data: ${messageData}\n\n`);
          }
        }

        // Broadcast todos if updated
        if (todos) {
          const todosData = JSON.stringify({
            type: "todos",
            sessionId,
            todos,
          });
          for (const client of multiplexedClients) {
            client.write(`data: ${todosData}\n\n`);
          }
        }
      }
    } catch {
      // Ignore parse errors for individual lines
    }
  }
}

// Poll all session files for changes every 500ms (backup for file watcher)
function pollAllSessionFiles(): void {
  if (multiplexedClients.size === 0) return;

  try {
    const folders = readdirSync(CLAUDE_PROJECTS_DIR).filter((f) => {
      try {
        const stat = statSync(join(CLAUDE_PROJECTS_DIR, f));
        return stat.isDirectory() && !f.startsWith(".");
      } catch {
        return false;
      }
    });

    for (const folder of folders) {
      const folderPath = join(CLAUDE_PROJECTS_DIR, folder);
      try {
        const files = readdirSync(folderPath);
        for (const file of files) {
          if (file.endsWith(".jsonl")) {
            const filePath = join(folderPath, file);
            checkFileForChanges(filePath);
          }
        }
      } catch {
        // Ignore folder read errors
      }
    }
  } catch {
    // Ignore errors
  }
}

// Start polling interval (500ms)
setInterval(pollAllSessionFiles, 500);
console.log("[Stream] Started polling for session file changes");

// Also keep chokidar as a backup (sometimes faster than polling)
const allSessionsWatcher = chokidar.watch(CLAUDE_PROJECTS_DIR, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  depth: 3,
  usePolling: true,
  interval: 300,
});

allSessionsWatcher.on("ready", () => {
  console.log("[Stream] Chokidar file watcher ready");
});

allSessionsWatcher.on("change", (filePath) => {
  checkFileForChanges(filePath);
});

allSessionsWatcher.on("add", (filePath) => {
  if (filePath.endsWith(".jsonl")) {
    // Initialize file size when file is added
    try {
      const stats = statSync(filePath);
      sessionFileSizes.set(filePath, stats.size);
    } catch {
      // Ignore
    }
  }
});

// Multiplexed SSE endpoint - single connection for all session updates
app.get("/api/stream/sessions", (req, res) => {
  console.log("[Stream] New client connecting to multiplexed stream");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

  multiplexedClients.add(res);
  console.log(
    `[Stream] Client connected. Total clients: ${multiplexedClients.size}`,
  );

  // Initialize file sizes for incremental reading
  try {
    const folders = readdirSync(CLAUDE_PROJECTS_DIR).filter((f) => {
      try {
        const stat = statSync(join(CLAUDE_PROJECTS_DIR, f));
        return stat.isDirectory() && !f.startsWith(".");
      } catch {
        return false;
      }
    });

    for (const folder of folders) {
      const folderPath = join(CLAUDE_PROJECTS_DIR, folder);
      try {
        const files = readdirSync(folderPath);
        for (const file of files) {
          if (file.endsWith(".jsonl")) {
            const filePath = join(folderPath, file);
            try {
              const stats = statSync(filePath);
              sessionFileSizes.set(filePath, stats.size);
            } catch {
              // Ignore
            }
          }
        }
      } catch {
        // Ignore folder read errors
      }
    }
  } catch {
    // Ignore errors
  }

  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "heartbeat" })}\n\n`);
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    multiplexedClients.delete(res);
  });
});

// ============================================================================
// API Routes - Orchestration & Automated Sessions
// ============================================================================

/**
 * POST /api/projects/:name/start-discovery
 * Spawn a new Claude session with /setup command for discovery
 */
app.post("/api/projects/:name/start-discovery", async (req, res) => {
  const { name } = req.params;
  const { automate = false } = req.body;

  // Find the project path from kanban registry
  try {
    const project = await kanbanService.getProject(name);
    if (!project) {
      res.status(404).json({ error: `Project not found: ${name}` });
      return;
    }

    const projectPath = project.path;
    if (!projectPath || !existsSync(projectPath)) {
      res
        .status(400)
        .json({ error: "Project path not found or does not exist" });
      return;
    }

    const result = await sessionSpawner.spawnDiscoverySession(projectPath, {
      dangerouslySkipPermissions: automate,
    });

    if (!result.success) {
      res
        .status(500)
        .json({ error: result.error || "Failed to spawn discovery session" });
      return;
    }

    // Track the session if we have a PID
    if (result.sessionInfo?.pid) {
      trackSpawnedProcess(
        result.sessionInfo.sessionId,
        result.sessionInfo.pid,
        projectPath,
      );
    }

    res.json({
      data: {
        success: true,
        sessionId: result.sessionInfo?.sessionId,
        pid: result.sessionInfo?.pid,
        status: "working" as SessionStatus,
        automated: automate,
      },
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to start discovery";
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /api/features/:featureId/execute-parallel
 * Execute all tasks for a feature using parallel orchestration
 */
app.post("/api/features/:featureId/execute-parallel", async (req, res) => {
  const { featureId } = req.params;
  const {
    automate = false,
    filterAgents,
    filterPhases,
    maxParallelSessions = 5,
    taskTimeoutMs = 600000,
    dryRun = false,
  } = req.body;

  try {
    // Get feature and its tasks from kanban
    const feature = await kanbanService.getFeature(featureId);
    if (!feature) {
      res.status(404).json({ error: `Feature not found: ${featureId}` });
      return;
    }

    const tasks = await kanbanService.listTasks(featureId);
    if (!tasks || tasks.length === 0) {
      res.status(400).json({ error: "No tasks found for feature" });
      return;
    }

    // Get project path from the feature's project
    // Feature ID format: FEAT-XXX, need to find which project it belongs to
    const projects = await kanbanService.listProjects();
    let projectPath: string | undefined;

    for (const project of projects) {
      const projectFeatures = await kanbanService.listFeatures(project.name);
      if (projectFeatures.some((f) => f.id === featureId)) {
        projectPath = project.path;
        break;
      }
    }

    if (!projectPath || !existsSync(projectPath)) {
      res
        .status(400)
        .json({ error: "Could not determine project path for feature" });
      return;
    }

    // If dry run, just analyze and return plan
    if (dryRun) {
      const analysis = await orchestrator.analyzeFeature(featureId, tasks, {
        filterAgents,
        filterPhases,
      });
      res.json({ data: { dryRun: true, analysis } });
      return;
    }

    // Execute the feature tasks in parallel
    const execution = await orchestrator.executeFeatureParallel(
      projectPath,
      featureId,
      tasks,
      {
        dangerouslySkipPermissions: automate,
        filterAgents,
        filterPhases,
        maxParallelSessions,
        taskTimeoutMs,
        dryRun,
      },
    );

    res.json({
      data: {
        success:
          execution.status === "completed" || execution.status === "partial",
        execution,
      },
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to execute feature";
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * GET /api/features/:featureId/execution-status
 * Get the current execution status for a feature
 */
app.get("/api/features/:featureId/execution-status", (req, res) => {
  const { featureId } = req.params;

  const execution = orchestrator.getExecution(featureId);
  if (!execution) {
    res.status(404).json({ error: "No active execution found for feature" });
    return;
  }

  res.json({ data: execution });
});

/**
 * POST /api/features/:featureId/cancel-execution
 * Cancel an ongoing feature execution
 */
app.post("/api/features/:featureId/cancel-execution", async (req, res) => {
  const { featureId } = req.params;

  const cancelled = await orchestrator.cancelExecution(featureId);
  if (!cancelled) {
    res.status(404).json({ error: "No active execution found to cancel" });
    return;
  }

  res.json({ data: { success: true, message: "Execution cancelled" } });
});

/**
 * GET /api/orchestrator/active-executions
 * List all active feature executions
 */
app.get("/api/orchestrator/active-executions", (_req, res) => {
  const executions = orchestrator.getActiveExecutions();
  res.json({ data: executions });
});

/**
 * GET /api/sessions/spawner/active
 * List all active spawned sessions
 */
app.get("/api/sessions/spawner/active", (_req, res) => {
  const sessions = sessionSpawner.getActiveSessions();
  res.json({ data: sessions });
});

/**
 * POST /api/sessions/new-automated
 * Create a new automated session with dangerouslySkipPermissions
 */
app.post("/api/sessions/new-automated", async (req, res) => {
  const { projectPath, message, taskId, agent } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: "projectPath required" });
    return;
  }

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message required" });
    return;
  }

  try {
    const stats = statSync(projectPath);
    if (!stats.isDirectory()) {
      res.status(400).json({ error: "projectPath is not a directory" });
      return;
    }
  } catch {
    res.status(400).json({ error: "projectPath does not exist" });
    return;
  }

  const result = await sessionSpawner.spawnAgentSession(
    projectPath,
    taskId || "manual",
    agent || "USER",
    message,
    { dangerouslySkipPermissions: true },
  );

  if (!result.success) {
    res.status(500).json({ error: result.error || "Failed to spawn session" });
    return;
  }

  // Track the session
  if (result.sessionInfo?.pid) {
    trackSpawnedProcess(
      result.sessionInfo.sessionId,
      result.sessionInfo.pid,
      projectPath,
    );
  }

  res.json({
    data: {
      sessionId: result.sessionInfo?.sessionId,
      projectPath,
      pid: result.sessionInfo?.pid,
      status: "working" as SessionStatus,
      automated: true,
    },
  });
});

// ============================================================================
// Start Server
// ============================================================================

const PORT = process.env.PORT || 3100;
const httpServer = createServer(app);

httpServer.listen(PORT, () => {
  console.log(`Dashboard server running on http://localhost:${PORT}`);
  console.log(`Watching: ${CLAUDE_PROJECTS_DIR}`);
  console.log(
    "Platform features enabled: Marketplace, Agents, Webhooks, Orchestration",
  );
});
