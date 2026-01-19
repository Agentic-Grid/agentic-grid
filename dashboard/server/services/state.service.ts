/**
 * State Service
 * Manages the centralized STATE.yaml file for agent synchronization
 * This is the SINGLE SOURCE OF TRUTH for what's happening in a project
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import * as crypto from "crypto";
import type { AgentType, TaskStatus } from "../types/kanban.types";

// =============================================================================
// TYPES
// =============================================================================

export type ExecutionMode = "idle" | "running" | "paused";
export type AgentStatus = "idle" | "working" | "blocked" | "waiting";
export type OnboardingStatus =
  | "not_started"
  | "awaiting_answers"
  | "processing"
  | "complete";
export type ProjectStatus = "active" | "paused" | "archived" | "failed";

export interface AgentState {
  status: AgentStatus;
  current_task: string | null;
  last_activity: string | null;
  blocked_by: string | null;
}

export interface FileLockEntry {
  file: string;
  agent: AgentType;
  task: string;
  expires_at: string;
}

export interface QueueEntry {
  task: string;
  agent: AgentType;
  waiting_for: string[];
}

export interface ActivityEntry {
  timestamp: string;
  agent: AgentType | "ORCHESTRATOR" | "USER";
  action: string;
  task?: string;
  note?: string;
}

export interface BlockerEntry {
  task: string;
  agent: AgentType;
  reason: string;
  since: string;
}

export interface ContractStatus {
  updated_at: string | null;
  hash: string | null;
}

export interface SessionEntry {
  session_id: string;
  task?: string;
  pid?: number;
  started_at: string;
}

export interface ProjectState {
  version: string;
  updated_at: string;

  status: {
    project: ProjectStatus;
    onboarding: OnboardingStatus;
    execution: ExecutionMode;
  };

  current_work: {
    feature: string | null;
    feature_title: string | null;
    phase: number | null;
    tasks_in_progress: string[];
  };

  progress: {
    features: {
      total: number;
      completed: number;
      in_progress: number;
    };
    tasks: {
      total: number;
      pending: number;
      in_progress: number;
      blocked: number;
      qa: number;
      completed: number;
    };
  };

  agents: Record<AgentType, AgentState>;

  active_locks: FileLockEntry[];

  queue: {
    next_tasks: QueueEntry[];
  };

  recent_activity: ActivityEntry[];

  blockers: BlockerEntry[];

  contracts: {
    api_contracts: ContractStatus;
    database_contracts: ContractStatus;
    design_tokens: ContractStatus;
  };

  sessions: {
    orchestrator: {
      session_id: string | null;
      started_at: string | null;
      status: string | null;
    };
    agents: Record<string, SessionEntry>;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SANDBOX_PATH = path.join(process.cwd(), "sandbox");
const STATE_FILE = "STATE.yaml";
const MAX_RECENT_ACTIVITY = 10;
const AGENTS: AgentType[] = [
  "DISCOVERY",
  "DESIGNER",
  "DATA",
  "BACKEND",
  "FRONTEND",
  "DEVOPS",
  "QA",
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getStatePath(projectName: string): string {
  return path.join(SANDBOX_PATH, projectName, STATE_FILE);
}

function getProjectPath(projectName: string): string {
  return path.join(SANDBOX_PATH, projectName);
}

function computeFileHash(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, "utf-8");
    return crypto.createHash("md5").update(content).digest("hex");
  } catch {
    return null;
  }
}

function createDefaultState(): ProjectState {
  const now = new Date().toISOString();

  const defaultAgentState: AgentState = {
    status: "idle",
    current_task: null,
    last_activity: null,
    blocked_by: null,
  };

  const agents: Record<AgentType, AgentState> = {} as Record<
    AgentType,
    AgentState
  >;
  for (const agent of AGENTS) {
    agents[agent] = { ...defaultAgentState };
  }

  return {
    version: "1.0",
    updated_at: now,

    status: {
      project: "active",
      onboarding: "not_started",
      execution: "idle",
    },

    current_work: {
      feature: null,
      feature_title: null,
      phase: null,
      tasks_in_progress: [],
    },

    progress: {
      features: {
        total: 0,
        completed: 0,
        in_progress: 0,
      },
      tasks: {
        total: 0,
        pending: 0,
        in_progress: 0,
        blocked: 0,
        qa: 0,
        completed: 0,
      },
    },

    agents,

    active_locks: [],

    queue: {
      next_tasks: [],
    },

    recent_activity: [],

    blockers: [],

    contracts: {
      api_contracts: { updated_at: null, hash: null },
      database_contracts: { updated_at: null, hash: null },
      design_tokens: { updated_at: null, hash: null },
    },

    sessions: {
      orchestrator: {
        session_id: null,
        started_at: null,
        status: null,
      },
      agents: {},
    },
  };
}

// =============================================================================
// STATE SERVICE
// =============================================================================

export const StateService = {
  /**
   * Load state for a project, creating default if doesn't exist
   */
  load(projectName: string): ProjectState {
    const statePath = getStatePath(projectName);

    if (!fs.existsSync(statePath)) {
      return createDefaultState();
    }

    try {
      const content = fs.readFileSync(statePath, "utf-8");
      const state = yaml.load(content) as ProjectState;
      return state;
    } catch (error) {
      console.error(`Error loading state for ${projectName}:`, error);
      return createDefaultState();
    }
  },

  /**
   * Save state for a project
   */
  save(projectName: string, state: ProjectState): void {
    const statePath = getStatePath(projectName);
    const projectPath = getProjectPath(projectName);

    // Ensure project directory exists
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    state.updated_at = new Date().toISOString();

    const content = yaml.dump(state, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    fs.writeFileSync(statePath, content, "utf-8");
  },

  /**
   * Initialize state for a new project
   */
  initialize(projectName: string): ProjectState {
    const state = createDefaultState();
    this.save(projectName, state);
    return state;
  },

  /**
   * Update agent status when starting work
   */
  agentStartWork(
    projectName: string,
    agent: AgentType,
    taskId: string,
  ): ProjectState {
    const state = this.load(projectName);
    const now = new Date().toISOString();

    state.agents[agent] = {
      status: "working",
      current_task: taskId,
      last_activity: now,
      blocked_by: null,
    };

    // Add to tasks in progress
    if (!state.current_work.tasks_in_progress.includes(taskId)) {
      state.current_work.tasks_in_progress.push(taskId);
    }

    // Add activity entry
    this.addActivity(state, {
      timestamp: now,
      agent,
      action: "started",
      task: taskId,
      note: `Started working on ${taskId}`,
    });

    this.save(projectName, state);
    return state;
  },

  /**
   * Update agent status when completing work
   */
  agentCompleteWork(
    projectName: string,
    agent: AgentType,
    taskId: string,
    note?: string,
  ): ProjectState {
    const state = this.load(projectName);
    const now = new Date().toISOString();

    state.agents[agent] = {
      status: "idle",
      current_task: null,
      last_activity: now,
      blocked_by: null,
    };

    // Remove from tasks in progress
    state.current_work.tasks_in_progress =
      state.current_work.tasks_in_progress.filter((t) => t !== taskId);

    // Add activity entry
    this.addActivity(state, {
      timestamp: now,
      agent,
      action: "completed",
      task: taskId,
      note: note || `Completed ${taskId}`,
    });

    this.save(projectName, state);
    return state;
  },

  /**
   * Mark agent as blocked
   */
  agentBlocked(
    projectName: string,
    agent: AgentType,
    taskId: string,
    blockedByTask: string,
    reason: string,
  ): ProjectState {
    const state = this.load(projectName);
    const now = new Date().toISOString();

    state.agents[agent] = {
      status: "blocked",
      current_task: taskId,
      last_activity: now,
      blocked_by: blockedByTask,
    };

    // Add blocker entry
    state.blockers.push({
      task: taskId,
      agent,
      reason,
      since: now,
    });

    // Add activity entry
    this.addActivity(state, {
      timestamp: now,
      agent,
      action: "blocked",
      task: taskId,
      note: reason,
    });

    this.save(projectName, state);
    return state;
  },

  /**
   * Clear blocker when dependency is resolved
   */
  clearBlocker(projectName: string, taskId: string): ProjectState {
    const state = this.load(projectName);

    state.blockers = state.blockers.filter((b) => b.task !== taskId);

    // Find and update the agent that was blocked
    for (const agent of AGENTS) {
      if (
        state.agents[agent].current_task === taskId &&
        state.agents[agent].status === "blocked"
      ) {
        state.agents[agent].status = "waiting";
        state.agents[agent].blocked_by = null;
      }
    }

    this.save(projectName, state);
    return state;
  },

  /**
   * Update execution mode
   */
  setExecutionMode(
    projectName: string,
    mode: ExecutionMode,
    featureId?: string,
    featureTitle?: string,
    phase?: number,
  ): ProjectState {
    const state = this.load(projectName);
    const now = new Date().toISOString();

    state.status.execution = mode;

    if (mode === "running" && featureId) {
      state.current_work.feature = featureId;
      state.current_work.feature_title = featureTitle || null;
      state.current_work.phase = phase || 1;
    } else if (mode === "idle") {
      state.current_work.feature = null;
      state.current_work.feature_title = null;
      state.current_work.phase = null;
      state.current_work.tasks_in_progress = [];
    }

    this.addActivity(state, {
      timestamp: now,
      agent: "ORCHESTRATOR",
      action: mode === "running" ? "execution_started" : "execution_stopped",
      note: featureId ? `Feature: ${featureId}` : undefined,
    });

    this.save(projectName, state);
    return state;
  },

  /**
   * Update onboarding status
   */
  setOnboardingStatus(
    projectName: string,
    status: OnboardingStatus,
  ): ProjectState {
    const state = this.load(projectName);
    state.status.onboarding = status;
    this.save(projectName, state);
    return state;
  },

  /**
   * Sync progress metrics from task counts
   */
  syncProgress(
    projectName: string,
    metrics: {
      features_total: number;
      features_completed: number;
      features_in_progress: number;
      tasks_total: number;
      tasks_pending: number;
      tasks_in_progress: number;
      tasks_blocked: number;
      tasks_qa: number;
      tasks_completed: number;
    },
  ): ProjectState {
    const state = this.load(projectName);

    state.progress = {
      features: {
        total: metrics.features_total,
        completed: metrics.features_completed,
        in_progress: metrics.features_in_progress,
      },
      tasks: {
        total: metrics.tasks_total,
        pending: metrics.tasks_pending,
        in_progress: metrics.tasks_in_progress,
        blocked: metrics.tasks_blocked,
        qa: metrics.tasks_qa,
        completed: metrics.tasks_completed,
      },
    };

    this.save(projectName, state);
    return state;
  },

  /**
   * Add file lock
   */
  addLock(
    projectName: string,
    file: string,
    agent: AgentType,
    taskId: string,
    ttlMinutes: number = 30,
  ): ProjectState {
    const state = this.load(projectName);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60000);

    // Check for existing lock
    const existingLock = state.active_locks.find((l) => l.file === file);
    if (existingLock) {
      throw new Error(
        `File ${file} is already locked by ${existingLock.agent} (${existingLock.task})`,
      );
    }

    state.active_locks.push({
      file,
      agent,
      task: taskId,
      expires_at: expiresAt.toISOString(),
    });

    this.save(projectName, state);
    return state;
  },

  /**
   * Release file lock
   */
  releaseLock(projectName: string, file: string): ProjectState {
    const state = this.load(projectName);
    state.active_locks = state.active_locks.filter((l) => l.file !== file);
    this.save(projectName, state);
    return state;
  },

  /**
   * Release all locks for a task
   */
  releaseTaskLocks(projectName: string, taskId: string): ProjectState {
    const state = this.load(projectName);
    state.active_locks = state.active_locks.filter((l) => l.task !== taskId);
    this.save(projectName, state);
    return state;
  },

  /**
   * Update queue with next tasks
   */
  updateQueue(projectName: string, nextTasks: QueueEntry[]): ProjectState {
    const state = this.load(projectName);
    state.queue.next_tasks = nextTasks;
    this.save(projectName, state);
    return state;
  },

  /**
   * Register a session
   */
  registerSession(
    projectName: string,
    agent: AgentType | "ORCHESTRATOR",
    sessionId: string,
    taskId?: string,
    pid?: number,
  ): ProjectState {
    const state = this.load(projectName);
    const now = new Date().toISOString();

    if (agent === "ORCHESTRATOR") {
      state.sessions.orchestrator = {
        session_id: sessionId,
        started_at: now,
        status: "active",
      };
    } else {
      state.sessions.agents[agent] = {
        session_id: sessionId,
        task: taskId,
        pid,
        started_at: now,
      };
    }

    this.save(projectName, state);
    return state;
  },

  /**
   * Unregister a session
   */
  unregisterSession(
    projectName: string,
    agent: AgentType | "ORCHESTRATOR",
  ): ProjectState {
    const state = this.load(projectName);

    if (agent === "ORCHESTRATOR") {
      state.sessions.orchestrator = {
        session_id: null,
        started_at: null,
        status: "completed",
      };
    } else {
      delete state.sessions.agents[agent];
    }

    this.save(projectName, state);
    return state;
  },

  /**
   * Sync contract hashes for change detection
   */
  syncContractHashes(projectName: string): ProjectState {
    const state = this.load(projectName);
    const projectPath = getProjectPath(projectName);
    const contractsPath = path.join(projectPath, "contracts");
    const now = new Date().toISOString();

    const contractFiles = {
      api_contracts: "api-contracts.yaml",
      database_contracts: "database-contracts.yaml",
      design_tokens: "design-tokens.yaml",
    };

    for (const [key, filename] of Object.entries(contractFiles)) {
      const filePath = path.join(contractsPath, filename);
      const hash = computeFileHash(filePath);
      const contractKey = key as keyof typeof state.contracts;

      if (hash && hash !== state.contracts[contractKey].hash) {
        state.contracts[contractKey] = {
          updated_at: now,
          hash,
        };
      }
    }

    this.save(projectName, state);
    return state;
  },

  /**
   * Add activity entry (internal helper)
   */
  addActivity(state: ProjectState, entry: ActivityEntry): void {
    state.recent_activity.unshift(entry);
    if (state.recent_activity.length > MAX_RECENT_ACTIVITY) {
      state.recent_activity = state.recent_activity.slice(
        0,
        MAX_RECENT_ACTIVITY,
      );
    }
  },

  /**
   * Get a quick summary for agents
   */
  getSummary(projectName: string): string {
    const state = this.load(projectName);

    const lines: string[] = [
      `# Project State: ${projectName}`,
      `Updated: ${state.updated_at}`,
      "",
      `## Status`,
      `- Project: ${state.status.project}`,
      `- Onboarding: ${state.status.onboarding}`,
      `- Execution: ${state.status.execution}`,
      "",
    ];

    if (state.current_work.feature) {
      lines.push(`## Current Work`);
      lines.push(`- Feature: ${state.current_work.feature}`);
      if (state.current_work.feature_title) {
        lines.push(`  Title: ${state.current_work.feature_title}`);
      }
      lines.push(`- Phase: ${state.current_work.phase}`);
      if (state.current_work.tasks_in_progress.length > 0) {
        lines.push(
          `- Active Tasks: ${state.current_work.tasks_in_progress.join(", ")}`,
        );
      }
      lines.push("");
    }

    lines.push(`## Progress`);
    lines.push(
      `- Features: ${state.progress.features.completed}/${state.progress.features.total}`,
    );
    lines.push(
      `- Tasks: ${state.progress.tasks.completed}/${state.progress.tasks.total}`,
    );
    lines.push(`  - Pending: ${state.progress.tasks.pending}`);
    lines.push(`  - In Progress: ${state.progress.tasks.in_progress}`);
    lines.push(`  - Blocked: ${state.progress.tasks.blocked}`);
    lines.push(`  - QA: ${state.progress.tasks.qa}`);
    lines.push("");

    const activeAgents = AGENTS.filter(
      (a) => state.agents[a].status !== "idle",
    );
    if (activeAgents.length > 0) {
      lines.push(`## Active Agents`);
      for (const agent of activeAgents) {
        const a = state.agents[agent];
        lines.push(`- ${agent}: ${a.status} (${a.current_task || "no task"})`);
      }
      lines.push("");
    }

    if (state.blockers.length > 0) {
      lines.push(`## Blockers`);
      for (const b of state.blockers) {
        lines.push(`- ${b.task} (${b.agent}): ${b.reason}`);
      }
      lines.push("");
    }

    if (state.recent_activity.length > 0) {
      lines.push(`## Recent Activity`);
      for (const a of state.recent_activity.slice(0, 5)) {
        const taskInfo = a.task ? ` [${a.task}]` : "";
        lines.push(`- ${a.agent}: ${a.action}${taskInfo}`);
      }
    }

    return lines.join("\n");
  },
};

export default StateService;
