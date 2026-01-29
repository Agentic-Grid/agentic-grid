/**
 * Session Spawner Service
 * Spawns and manages Claude Code sessions for automated task execution
 */

import { spawn, ChildProcess } from "child_process";
import { randomUUID } from "crypto";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  appendFileSync,
} from "fs";
import { join } from "path";
import { homedir } from "os";

// =============================================================================
// TYPES
// =============================================================================

export interface SessionInfo {
  sessionId: string;
  pid: number | undefined;
  projectPath: string;
  taskId: string;
  agent: string;
  startedAt: string;
  status: "spawning" | "running" | "completed" | "failed";
  logFile?: string;
}

export interface SpawnOptions {
  /** Skip permission prompts for automated execution */
  dangerouslySkipPermissions?: boolean;
  /** Optional session name for identification */
  sessionName?: string;
  /** Resume an existing session instead of creating new */
  resumeSessionId?: string;
}

export interface SpawnResult {
  success: boolean;
  sessionInfo?: SessionInfo;
  error?: string;
}

// =============================================================================
// SESSION PID STORAGE (mirrors index.ts pattern)
// =============================================================================

const SESSION_PIDS_FILE = join(homedir(), ".claude", "session-pids.json");
const SESSION_NAMES_FILE = join(homedir(), ".claude", "session-names.json");
const SESSION_LOGS_DIR = join(homedir(), ".claude", "session-logs");

// Ensure session logs directory exists
if (!existsSync(SESSION_LOGS_DIR)) {
  mkdirSync(SESSION_LOGS_DIR, { recursive: true });
}

interface SessionPidInfo {
  pid: number;
  projectPath: string;
  startTime: string;
  taskId?: string;
  agent?: string;
  automated?: boolean;
}

interface SessionPids {
  [sessionId: string]: SessionPidInfo;
}

interface SessionNames {
  [sessionId: string]: string;
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

/**
 * Set the human-readable name for a session (shown in Claude Code UI)
 */
function setSessionName(sessionId: string, name: string): void {
  const names = loadSessionNames();
  names[sessionId] = name;
  saveSessionNames(names);
}

/**
 * Get the log file path for a session
 */
function getSessionLogPath(sessionId: string): string {
  return join(SESSION_LOGS_DIR, `${sessionId}.log`);
}

/**
 * Append a log line to the session log file
 */
function appendSessionLog(sessionId: string, line: string): void {
  const logPath = getSessionLogPath(sessionId);
  try {
    appendFileSync(logPath, line + "\n");
  } catch (err) {
    console.error(`Failed to append to session log ${sessionId}:`, err);
  }
}

/**
 * Read the session log file (returns last N lines)
 */
export function readSessionLog(
  sessionId: string,
  maxLines: number = 100,
): string[] {
  const logPath = getSessionLogPath(sessionId);
  try {
    if (!existsSync(logPath)) {
      return [];
    }
    const content = readFileSync(logPath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim());
    return lines.slice(-maxLines);
  } catch {
    return [];
  }
}


function setSessionPid(
  sessionId: string,
  pid: number,
  projectPath: string,
  taskId?: string,
  agent?: string,
  automated?: boolean,
): void {
  const pids = loadSessionPids();
  pids[sessionId] = {
    pid,
    projectPath,
    startTime: new Date().toISOString(),
    taskId,
    agent,
    automated,
  };
  saveSessionPids(pids);
}

function removeSessionPid(sessionId: string): void {
  const pids = loadSessionPids();
  if (pids[sessionId]) {
    delete pids[sessionId];
    saveSessionPids(pids);
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// SESSION SPAWNER CLASS
// =============================================================================

export class SessionSpawnerService {
  private activeSessions: Map<string, SessionInfo> = new Map();

  /**
   * Spawn a new Claude session for a task
   * @param projectPath - The project directory to run Claude in
   * @param taskId - The task identifier for tracking
   * @param agent - The agent type (e.g., FRONTEND, BACKEND)
   * @param instructions - The prompt/instructions to send to Claude
   * @param options - Additional spawn options
   */
  async spawnAgentSession(
    projectPath: string,
    taskId: string,
    agent: string,
    instructions: string,
    options: SpawnOptions = {},
  ): Promise<SpawnResult> {
    const {
      dangerouslySkipPermissions = true,
      sessionName,
      resumeSessionId,
    } = options;

    // Generate or use existing session ID
    const sessionId = resumeSessionId || randomUUID();

    // Build command arguments
    const args: string[] = [];

    // Add skip permissions flag if enabled
    if (dangerouslySkipPermissions) {
      args.push("--dangerously-skip-permissions");
    }

    if (resumeSessionId) {
      // Resume existing session
      args.push("--resume", resumeSessionId);
      args.push("-p", instructions);
    } else {
      // New session
      args.push("--session-id", sessionId);
      args.push("-p", instructions);
    }

    try {
      // Verify project path exists
      if (!existsSync(projectPath)) {
        return {
          success: false,
          error: `Project path does not exist: ${projectPath}`,
        };
      }

      // Initialize session log file
      const logPath = getSessionLogPath(sessionId);
      writeFileSync(
        logPath,
        `[${new Date().toISOString()}] Session ${sessionId} started\n`,
      );

      // Spawn the Claude process with output capture
      // Pass environment variables explicitly to ensure ANTHROPIC_API_KEY is available
      const claudeProcess: ChildProcess = spawn("claude", args, {
        cwd: projectPath,
        detached: true,
        stdio: ["ignore", "pipe", "pipe"], // stdin ignored, stdout/stderr piped
        env: {
          ...process.env,
          // Ensure Claude API key is passed through
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_TOKEN,
          CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || process.env.CLAUDE_TOKEN,
          // Pass through GitHub tokens for git operations
          GH_TOKEN: process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
          GITHUB_TOKEN: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
        },
      });

      // Pipe stdout and stderr to log file
      if (claudeProcess.stdout) {
        claudeProcess.stdout.on("data", (data: Buffer) => {
          const lines = data.toString().split("\n");
          for (const line of lines) {
            if (line.trim()) {
              appendSessionLog(sessionId, `[OUT] ${line}`);
            }
          }
        });
      }

      if (claudeProcess.stderr) {
        claudeProcess.stderr.on("data", (data: Buffer) => {
          const lines = data.toString().split("\n");
          for (const line of lines) {
            if (line.trim()) {
              appendSessionLog(sessionId, `[ERR] ${line}`);
            }
          }
        });
      }

      const sessionInfo: SessionInfo = {
        sessionId,
        pid: claudeProcess.pid,
        projectPath,
        taskId,
        agent,
        startedAt: new Date().toISOString(),
        status: "running",
        logFile: logPath,
      };

      // Track the session
      this.activeSessions.set(sessionId, sessionInfo);

      // Store PID for persistence
      if (claudeProcess.pid) {
        setSessionPid(
          sessionId,
          claudeProcess.pid,
          projectPath,
          taskId,
          agent,
          dangerouslySkipPermissions,
        );

        // Set session name if provided (shown in Claude Code UI header)
        if (sessionName) {
          setSessionName(sessionId, sessionName);
        }

        // Handle process exit
        claudeProcess.on("exit", (code) => {
          const session = this.activeSessions.get(sessionId);
          if (session) {
            session.status = code === 0 ? "completed" : "failed";
          }
          removeSessionPid(sessionId);
        });
      }

      // Unref so parent can exit independently
      claudeProcess.unref();

      return {
        success: true,
        sessionInfo,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to spawn session";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Spawn a session with the /setup command for discovery
   */
  async spawnDiscoverySession(
    projectPath: string,
    options: SpawnOptions = {},
  ): Promise<SpawnResult> {
    const setupInstructions = `/setup

Start the discovery process for this project. Follow the agent workflow to:
1. Read any existing plans/CURRENT.md
2. Gather requirements through conversation
3. Generate PRD and user stories
4. Create feature breakdown with tasks`;

    return this.spawnAgentSession(
      projectPath,
      "DISCOVERY",
      "DISCOVERY",
      setupInstructions,
      options,
    );
  }

  /**
   * Check if a session is still running
   */
  isSessionRunning(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.pid) return false;
    return isPidAlive(session.pid);
  }

  /**
   * Get session info by ID
   */
  getSession(sessionId: string): SessionInfo | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): SessionInfo[] {
    return Array.from(this.activeSessions.values()).filter(
      (s) => s.pid && isPidAlive(s.pid),
    );
  }

  /**
   * Get sessions for a specific project
   */
  getProjectSessions(projectPath: string): SessionInfo[] {
    return this.getActiveSessions().filter(
      (s) => s.projectPath === projectPath,
    );
  }

  /**
   * Kill a session by ID
   */
  async killSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.pid) return false;

    try {
      process.kill(session.pid, "SIGTERM");
      session.status = "failed";
      removeSessionPid(sessionId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Kill all sessions for a project
   */
  async killProjectSessions(projectPath: string): Promise<number> {
    const sessions = this.getProjectSessions(projectPath);
    let killed = 0;
    for (const session of sessions) {
      if (await this.killSession(session.sessionId)) {
        killed++;
      }
    }
    return killed;
  }

  /**
   * Wait for a session to complete (with timeout)
   */
  async waitForSession(
    sessionId: string,
    timeoutMs: number = 300000, // 5 minutes default
  ): Promise<{ completed: boolean; status: string }> {
    const startTime = Date.now();
    const checkInterval = 1000; // Check every second

    return new Promise((resolve) => {
      const check = () => {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
          resolve({ completed: true, status: "not_found" });
          return;
        }

        if (!this.isSessionRunning(sessionId)) {
          resolve({ completed: true, status: session.status });
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          resolve({ completed: false, status: "timeout" });
          return;
        }

        setTimeout(check, checkInterval);
      };

      check();
    });
  }
}

// Export singleton instance
export const sessionSpawner = new SessionSpawnerService();
