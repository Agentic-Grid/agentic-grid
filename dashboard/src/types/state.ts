/**
 * State Types
 * Types for the centralized STATE.yaml state management
 */

import type { AgentType } from "./kanban";

export type ExecutionMode = "idle" | "running" | "paused";
export type AgentStatus = "idle" | "working" | "blocked" | "waiting";
export type OnboardingStatus =
  | "not_started"
  | "awaiting_answers"
  | "processing"
  | "complete";
export type ProjectStatusType = "active" | "paused" | "archived" | "failed";

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
    project: ProjectStatusType;
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
