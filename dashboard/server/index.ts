import express from "express";
import cors from "cors";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import chokidar from "chokidar";

const execAsync = promisify(exec);

const app = express();
app.use(cors());
app.use(express.json());

const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");

// Status timeouts (matching Kyle's daemon settings)
const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
const WORKING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Types for parsed log entries
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

interface SessionDetail extends Session {
  messages: ParsedMessage[];
}

interface ParsedMessage {
  id: string;
  role: "user" | "assistant";
  timestamp: string;
  content: string;
  toolCalls?: ToolCall[];
  thinking?: string;
}

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  result?: string;
}

// Get project folder name from path
function getProjectFolder(projectPath: string): string {
  return projectPath.replace(/\//g, "-").replace(/^-/, "");
}

// Decode project folder name to path
function decodeProjectFolder(folder: string): string {
  return "/" + folder.replace(/^-/, "").replace(/-/g, "/");
}

// Parse a single JSONL file
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

// Determine session status based on entries and timing
function determineStatus(
  entries: LogEntry[],
  lastActivityTime: number,
): { status: SessionStatus; hasPendingToolUse: boolean } {
  const now = Date.now();
  const elapsed = now - lastActivityTime;

  // Check if idle (inactive for 1 hour)
  if (elapsed > IDLE_TIMEOUT_MS) {
    return { status: "idle", hasPendingToolUse: false };
  }

  // Check for pending tool use in the last assistant message
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

  // If we have a tool use without a matching result, it's pending
  if (lastToolUseId && lastToolUseId !== lastToolResultId) {
    hasPendingToolUse = true;
  }

  // If recently active (within 5 minutes), it's working
  if (elapsed < WORKING_TIMEOUT_MS) {
    return { status: "working", hasPendingToolUse };
  }

  // Otherwise it's waiting
  return {
    status: hasPendingToolUse ? "needs-approval" : "waiting",
    hasPendingToolUse,
  };
}

// Extract last meaningful output from entries
function extractLastOutput(entries: LogEntry[]): string {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "assistant" && entry.message?.content) {
      for (const block of entry.message.content) {
        if (block.type === "text" && block.text) {
          // Skip system reminders and very short outputs
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

// Extract session info from log entries
function extractSessionInfo(
  logFile: string,
  entries: LogEntry[],
  projectPath: string,
): Session | null {
  if (entries.length === 0) return null;

  const firstEntry = entries.find((e) => e.type === "user" && e.message);
  const lastEntry = entries[entries.length - 1];

  // Use filename as session ID (it's the actual session ID)
  const fileName = basename(logFile, ".jsonl");
  const sessionId = fileName;

  const userMessages = entries.filter((e) => e.type === "user" && e.message);
  const assistantMessages = entries.filter(
    (e) => e.type === "assistant" && e.message,
  );

  // Count tool calls
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

  // Get first user prompt
  let firstPrompt = "";
  if (firstEntry?.message?.content) {
    for (const block of firstEntry.message.content) {
      if (block.type === "text" && block.text && !block.text.startsWith("<")) {
        firstPrompt = block.text.slice(0, 200);
        break;
      }
    }
  }

  // Determine status
  const lastTime = new Date(lastEntry.timestamp).getTime();
  const { status, hasPendingToolUse } = determineStatus(entries, lastTime);

  // Get last output
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

// Get all sessions for a project (with de-duplication by session ID)
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
        // Use session ID as key to prevent duplicates
        const existing = sessionMap.get(session.id);
        if (
          !existing ||
          new Date(session.lastActivityAt) > new Date(existing.lastActivityAt)
        ) {
          sessionMap.set(session.id, session);
        }
      }
    }

    // Convert to array and sort by last activity (most recent first)
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

// Get all sessions across all projects
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
        // Global de-duplication
        if (!seenIds.has(session.id)) {
          seenIds.add(session.id);
          allSessions.push(session);
        }
      }
    }

    // Sort by last activity
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

// Get session detail with messages
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

      for (const block of entry.message.content || []) {
        if (block.type === "text" && block.text) {
          msg.content += block.text + "\n";
        } else if (block.type === "thinking" && block.thinking) {
          msg.thinking = block.thinking;
        } else if (block.type === "tool_use" && block.name) {
          msg.toolCalls?.push({
            name: block.name,
            input: block.input || {},
          });
        } else if (block.type === "tool_result" && block.content) {
          const lastCall = msg.toolCalls?.[msg.toolCalls.length - 1];
          if (lastCall) {
            lastCall.result =
              typeof block.content === "string"
                ? block.content.slice(0, 500)
                : JSON.stringify(block.content).slice(0, 500);
          }
        }
      }

      msg.content = msg.content.trim();
      if (msg.content || (msg.toolCalls && msg.toolCalls.length > 0)) {
        messages.push(msg);
      }
    }
  }

  return {
    ...session,
    messages,
  };
}

// API Routes

// List all projects
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

// List sessions for a project
app.get("/api/projects/:folder/sessions", (req, res) => {
  const { folder } = req.params;
  const sessions = getProjectSessions(folder);
  res.json({ data: sessions });
});

// Get session detail
app.get("/api/projects/:folder/sessions/:sessionId", (req, res) => {
  const { folder, sessionId } = req.params;
  const session = getSessionDetail(folder, sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json({ data: session });
});

// Get all sessions (for Kanban view)
app.get("/api/sessions", (_req, res) => {
  const sessions = getAllSessions();
  res.json({ data: sessions });
});

// Get summary stats
app.get("/api/summary", (_req, res) => {
  try {
    const sessions = getAllSessions();

    const workingSessions = sessions.filter(
      (s) => s.status === "working",
    ).length;
    const waitingSessions = sessions.filter(
      (s) => s.status === "waiting" || s.status === "needs-approval",
    ).length;
    const idleSessions = sessions.filter((s) => s.status === "idle").length;

    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
    const totalToolCalls = sessions.reduce(
      (sum, s) => sum + s.toolCallCount,
      0,
    );

    // Count unique projects
    const projectPaths = new Set(sessions.map((s) => s.projectPath));

    res.json({
      data: {
        totalProjects: projectPaths.size,
        totalSessions: sessions.length,
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
const clients = new Set<express.Response>();

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

function notifyClients(data: unknown) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
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
// Process Management (Daemon functionality)
// ============================================================================

interface ClaudeProcess {
  pid: number;
  cwd: string;
  command: string;
  startTime?: string;
}

// Find running Claude Code processes
async function findClaudeProcesses(): Promise<ClaudeProcess[]> {
  try {
    // Use ps to find claude processes with their working directory
    const { stdout } = await execAsync(
      `ps -eo pid,lstart,command | grep -E "[c]laude" | grep -v "tsx\\|node.*server"`,
    );

    const processes: ClaudeProcess[] = [];
    const lines = stdout.trim().split("\n").filter(Boolean);

    for (const line of lines) {
      // Parse: PID, start time (multiple fields), command
      const match = line.match(
        /^\s*(\d+)\s+(\w+\s+\w+\s+\d+\s+[\d:]+\s+\d+)\s+(.+)$/,
      );
      if (match) {
        const pid = parseInt(match[1], 10);
        const startTime = match[2];
        const command = match[3];

        // Get the working directory for this process
        try {
          const { stdout: cwdOut } = await execAsync(
            `lsof -p ${pid} | grep cwd`,
          );
          const cwdMatch = cwdOut.match(
            /cwd\s+\w+\s+\w+\s+\d+\s+\d+\s+\d+\s+(.+)$/m,
          );
          const cwd = cwdMatch ? cwdMatch[1].trim() : "";

          processes.push({ pid, cwd, command, startTime });
        } catch {
          // Process might have exited
          processes.push({ pid, cwd: "", command, startTime });
        }
      }
    }

    return processes;
  } catch {
    return [];
  }
}

// Match a session to a running process
async function findProcessForSession(
  sessionProjectPath: string,
): Promise<ClaudeProcess | null> {
  const processes = await findClaudeProcesses();
  return processes.find((p) => p.cwd === sessionProjectPath) || null;
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

// Resume a session by opening Claude in that project
function resumeSession(projectPath: string, sessionId: string): boolean {
  try {
    // Spawn a new terminal with Claude in the project directory
    // Using --resume flag with session ID
    const cmd =
      process.platform === "darwin"
        ? `osascript -e 'tell application "Terminal" to do script "cd \\"${projectPath}\\" && claude --resume ${sessionId}"'`
        : `gnome-terminal -- bash -c "cd '${projectPath}' && claude --resume ${sessionId}; exec bash"`;

    exec(cmd);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Process Management API Routes
// ============================================================================

// Get running Claude processes
app.get("/api/processes", async (_req, res) => {
  try {
    const processes = await findClaudeProcesses();
    res.json({ data: processes });
  } catch {
    res.status(500).json({ error: "Failed to get processes" });
  }
});

// Get process for a specific session
app.get("/api/sessions/:sessionId/process", async (req, res) => {
  const { sessionId } = req.params;
  const projectPath = req.query.projectPath as string;

  if (!projectPath) {
    res.status(400).json({ error: "projectPath query param required" });
    return;
  }

  const process = await findProcessForSession(projectPath);
  res.json({ data: process });
});

// Kill a session's process
app.post("/api/sessions/:sessionId/kill", async (req, res) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: "projectPath required in body" });
    return;
  }

  const process = await findProcessForSession(projectPath);
  if (!process) {
    res
      .status(404)
      .json({ error: "No running process found for this session" });
    return;
  }

  const killed = await killProcess(process.pid);
  if (killed) {
    notifyClients({ type: "process_killed", pid: process.pid, projectPath });
    res.json({ data: { success: true, pid: process.pid } });
  } else {
    res.status(500).json({ error: "Failed to kill process" });
  }
});

// Resume a session
app.post("/api/sessions/:sessionId/resume", async (req, res) => {
  const { sessionId } = req.params;
  const { projectPath } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: "projectPath required in body" });
    return;
  }

  const success = resumeSession(projectPath, sessionId);
  if (success) {
    res.json({ data: { success: true } });
  } else {
    res.status(500).json({ error: "Failed to resume session" });
  }
});

// Open a new Claude session in a project
app.post("/api/projects/open", async (req, res) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    res.status(400).json({ error: "projectPath required in body" });
    return;
  }

  try {
    const cmd =
      process.platform === "darwin"
        ? `osascript -e 'tell application "Terminal" to do script "cd \\"${projectPath}\\" && claude"'`
        : `gnome-terminal -- bash -c "cd '${projectPath}' && claude; exec bash"`;

    exec(cmd);
    res.json({ data: { success: true } });
  } catch {
    res.status(500).json({ error: "Failed to open project" });
  }
});

const PORT = process.env.PORT || 3100;

app.listen(PORT, () => {
  console.log(`Dashboard server running on http://localhost:${PORT}`);
  console.log(`Watching: ${CLAUDE_PROJECTS_DIR}`);
  console.log("Process management enabled");
});
