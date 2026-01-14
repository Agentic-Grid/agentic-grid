/**
 * Kanban Types
 * Type definitions for the file-based Kanban storage system
 * Based on schema-spec.md from TASK-003
 */

// =============================================================================
// ENUMS / LITERAL TYPES
// =============================================================================

export type AgentType =
  | "DISCOVERY"
  | "DESIGNER"
  | "DATA"
  | "BACKEND"
  | "FRONTEND"
  | "DEVOPS"
  | "QA";

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "blocked"
  | "qa"
  | "completed";

export type TaskPriority = "high" | "medium" | "low";

export type TaskType =
  | "enhancement"
  | "design"
  | "schema"
  | "implementation"
  | "automation"
  | "validation";

export type FeatureStatus =
  | "planning"
  | "approved"
  | "in_progress"
  | "qa"
  | "completed"
  | "archived";

export type ProjectStatus = "active" | "paused" | "archived" | "failed";

export type ExecutionMode = "idle" | "running" | "paused" | "completed";

export type LockType = "exclusive" | "shared";

// =============================================================================
// PROGRESS & QA
// =============================================================================

export interface ProgressEntry {
  timestamp: string;
  agent: AgentType | "ORCHESTRATOR" | "USER";
  action?: string;
  note: string;
}

export interface QAChecklistItem {
  item: string;
  passed: boolean | null;
}

export interface QAConfig {
  required: boolean;
  status: "pending" | "passed" | "failed";
  reviewer?: string | null;
  reviewed_at?: string | null;
  checklist: (string | QAChecklistItem)[];
  notes?: string | null;
}

// =============================================================================
// TASK
// =============================================================================

export interface TaskFiles {
  create?: string[];
  modify?: string[];
  delete?: string[];
}

export interface TaskContract {
  path: string;
  changes: string;
}

export interface Task {
  id: string;
  feature_id: string;
  title: string;
  agent: AgentType;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  phase: number;
  estimated_minutes?: number;
  actual_minutes?: number;
  depends_on: string[];
  blocks: string[];
  files: TaskFiles | string[];
  contracts: (string | TaskContract)[];
  instructions: string;
  progress: ProgressEntry[];
  qa: QAConfig;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

// =============================================================================
// FEATURE
// =============================================================================

export interface FeaturePhase {
  phase: number;
  name: string;
  status: "pending" | "in_progress" | "completed";
  agents: AgentType[];
  parallel: boolean;
  tasks: string[];
  started_at?: string | null;
  completed_at?: string | null;
}

export interface FeatureDocumentation {
  spec: string;
  design?: string | null;
  schema?: string | null;
}

export interface FeatureQA {
  required: boolean;
  status: "pending" | "passed" | "failed";
  acceptance_criteria: string[];
}

export interface Feature {
  id: string;
  slug: string;
  title: string;
  status: FeatureStatus;
  priority: TaskPriority;
  description: string;
  owner: string;
  agents_required: AgentType[];
  phases: FeaturePhase[];
  documentation: FeatureDocumentation;
  qa: FeatureQA;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  approved_at?: string | null;
}

// =============================================================================
// PROJECT
// =============================================================================

export interface ProjectDiscovery {
  completed: boolean;
  prd_generated?: boolean;
  tasks_generated?: boolean;
  started_at?: string | null;
  completed_at?: string | null;
  approved_at?: string | null;
  prd_path?: string;
  stories_path?: string;
  interview?: {
    questions_asked: number;
    duration_minutes: number;
    key_requirements: string[];
  };
}

export interface ProjectMetrics {
  features_total: number;
  features_completed: number;
  tasks_total: number;
  tasks_pending: number;
  tasks_in_progress: number;
  tasks_blocked: number;
  tasks_qa: number;
  tasks_completed: number;
}

export interface ProjectExecution {
  mode: ExecutionMode;
  current_phase?: number;
  current_feature?: string;
  agents_active?: AgentType[];
}

export interface ProjectGit {
  current_branch?: string;
  has_uncommitted?: boolean;
  last_commit?: string;
}

export interface ProjectSettings {
  parallel_execution?: boolean;
  auto_qa?: boolean;
  require_approval?: boolean;
  notification_webhook?: string | null;
}

export interface ProjectSource {
  template?: string;
  forked_at?: string;
  base_commit?: string;
}

export interface ProjectStack {
  node_version?: string;
  typescript?: boolean;
  database?: string;
  frontend_framework?: string;
  css_framework?: string;
}

export interface Project {
  id: string;
  name: string;
  slug?: string;
  path?: string;
  description?: string;
  status: ProjectStatus;
  discovery: ProjectDiscovery;
  metrics?: ProjectMetrics;
  execution?: ProjectExecution;
  git?: ProjectGit;
  settings?: ProjectSettings;
  source?: ProjectSource;
  stack?: ProjectStack;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// INDEXES
// =============================================================================

export interface TaskIndexEntry {
  id: string;
  title: string;
  agent: AgentType;
  phase: number;
  priority: TaskPriority;
  started_at?: string;
  completed_at?: string;
  blocked_by?: string[];
}

export interface TaskIndexSummary {
  total: number;
  pending: number;
  in_progress: number;
  blocked: number;
  qa: number;
  completed: number;
}

export interface TaskIndexDependency {
  depends_on: string[];
  blocks: string[];
}

export interface TaskIndexExecution {
  average_task_duration_minutes?: number;
  estimated_remaining_minutes?: number;
  parallelism_factor?: number;
}

export interface TaskIndex {
  version: string;
  updated_at: string;
  feature_id: string;
  summary: TaskIndexSummary;
  by_status: {
    pending: TaskIndexEntry[];
    in_progress: TaskIndexEntry[];
    blocked: TaskIndexEntry[];
    qa: TaskIndexEntry[];
    completed: TaskIndexEntry[];
  };
  by_phase: Record<number, string[]>;
  by_agent: Record<AgentType, string[]>;
  dependencies: Record<string, TaskIndexDependency>;
  execution?: TaskIndexExecution;
  next_task_id: number;
}

export interface FeatureIndexEntry {
  id: string;
  slug: string;
  title: string;
  priority: TaskPriority;
  tasks_total: number;
  tasks_completed: number;
  progress_percent: number;
}

export interface FeatureIndexSummary {
  total: number;
  planning: number;
  in_progress: number;
  qa: number;
  completed: number;
  archived: number;
}

export interface FeatureIndexExecutionEntry {
  feature: string;
  depends_on: string[];
  blocks: string[];
}

export interface FeatureIndex {
  version: string;
  updated_at: string;
  project_id: string;
  summary: FeatureIndexSummary;
  by_status: {
    planning: FeatureIndexEntry[];
    in_progress: FeatureIndexEntry[];
    qa: FeatureIndexEntry[];
    completed: FeatureIndexEntry[];
    archived: FeatureIndexEntry[];
  };
  by_priority: {
    high: string[];
    medium: string[];
    low: string[];
  };
  execution_order: FeatureIndexExecutionEntry[];
  next_feature_id: number;
}

// =============================================================================
// PROJECT REGISTRY
// =============================================================================

export interface RegistryProject {
  id: string;
  name: string;
  path: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  discovery: ProjectDiscovery;
  metrics?: ProjectMetrics;
  execution?: ProjectExecution;
  git?: ProjectGit;
}

export interface RegistryConfig {
  auto_cleanup_days?: number;
  max_active_projects?: number;
  default_branch?: string;
}

export interface ProjectRegistry {
  version: string;
  updated_at: string;
  config?: RegistryConfig;
  projects: RegistryProject[];
  next_project_id: number;
}

// =============================================================================
// FILE LOCKS
// =============================================================================

export interface FileLock {
  id: string;
  file: string;
  project: string;
  owner_task: string;
  owner_agent: AgentType;
  lock_type: LockType;
  acquired_at: string;
  expires_at: string;
  ttl_minutes: number;
}

export interface LockHistoryEntry {
  id: string;
  file: string;
  owner_task: string;
  owner_agent: AgentType;
  acquired_at: string;
  released_at: string;
  release_reason: string;
  duration_minutes: number;
}

export interface LockQueueEntry {
  file: string;
  requester_task: string;
  requester_agent: AgentType;
  requested_at: string;
  waiting_for_lock: string;
}

export interface LocksConfig {
  default_ttl_minutes?: number;
  max_ttl_minutes?: number;
  stale_check_interval_seconds?: number;
  auto_release_on_completion?: boolean;
}

export interface FileLocks {
  version: string;
  updated_at: string;
  config?: LocksConfig;
  locks: FileLock[];
  history?: LockHistoryEntry[];
  queue?: LockQueueEntry[];
}

// =============================================================================
// DASHBOARD AGGREGATION
// =============================================================================

export interface DashboardTotals {
  projects: number;
  projects_active: number;
  projects_paused: number;
  features: number;
  features_in_progress: number;
  tasks_total: number;
  tasks_pending: number;
  tasks_in_progress: number;
  tasks_blocked: number;
  tasks_qa: number;
  tasks_completed: number;
}

export interface DashboardActiveAgent {
  agent: AgentType;
  project: string;
  task: string;
  started_at: string;
}

export interface DashboardActivity {
  timestamp: string;
  project: string;
  feature: string;
  task: string;
  agent: AgentType | "ORCHESTRATOR" | "USER";
  action: string;
  details?: string;
}

export interface DashboardQueueEntry {
  project: string;
  task: string;
  agent: AgentType;
  blocked_by: string[];
  estimated_start?: string;
}

export interface DashboardHealth {
  last_successful_execution?: string;
  failed_tasks_24h?: number;
  average_task_duration_minutes?: number;
  index_last_regenerated?: string;
}

export interface Dashboard {
  version: string;
  updated_at: string;
  stale_threshold_minutes?: number;
  totals: DashboardTotals;
  agents_active: DashboardActiveAgent[];
  recent_activity: DashboardActivity[];
  queue?: {
    next_tasks: DashboardQueueEntry[];
  };
  health?: DashboardHealth;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}

export interface MoveTaskRequest {
  column: TaskStatus;
  order?: number;
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}
