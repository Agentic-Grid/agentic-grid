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
  | "awaiting_user_input"
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
  changes?: string;
  section?: string;
}

/**
 * Optimized task context - minimizes tokens while providing essential info
 * Project + Feature summaries: ~100 tokens
 * Task details: ~200-500 tokens
 * Total: ~400 tokens (vs 2000+ with full project docs)
 */
export interface TaskContext {
  /** 2-line project summary (~50 tokens) */
  project: string;
  /** 2-line feature summary (~50 tokens) */
  feature: string;
  /** Detailed task instructions */
  task: {
    objective: string;
    requirements: string[];
    files: TaskFiles;
    contracts?: TaskContract[];
    depends_on_completed?: Array<{
      id: string;
      summary: string;
    }>;
  };
}

/**
 * Expected result for QA validation
 */
export interface ExpectedResult {
  description: string;
  test: string;
}

/**
 * Required variable for user input
 */
export interface RequiredVariable {
  name: string;
  description: string;
  howToGet?: string;
}

/**
 * Metadata when task is awaiting user input
 */
export interface AwaitingUserInput {
  reason: string;
  requiredVariables: RequiredVariable[];
  instructions: string;
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
  /** @deprecated Use context.task.files instead */
  files?: TaskFiles | string[];
  /** @deprecated Use context.task.contracts instead */
  contracts?: (string | TaskContract)[];
  /** @deprecated Use context.task.objective + requirements instead */
  instructions?: string;
  /** Optimized context for agent execution */
  context?: TaskContext;
  /** Expected results for QA validation */
  expected_results?: ExpectedResult[];
  /** Metadata when task is awaiting user input (external credentials, etc.) */
  awaitingInput?: AwaitingUserInput;
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
  /** Project ID this feature belongs to (added when listing across projects) */
  project_id?: string;
  /** Human-readable name (alias for title, used in some views) */
  name?: string;
  status: FeatureStatus;
  priority: TaskPriority;
  /** 2-line summary for use in task context (~50 tokens) */
  summary?: string;
  description: string;
  /** User stories this feature addresses */
  user_stories?: string[];
  /** Acceptance criteria for QA */
  acceptance_criteria?: string[];
  owner?: string;
  agents_required?: AgentType[];
  phases?: FeaturePhase[];
  documentation?: FeatureDocumentation;
  qa?: FeatureQA;
  /** List of task IDs in this feature */
  tasks?: string[];
  /** Claude session ID for feature development */
  session_id?: string | null;
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
  awaiting_user_input: number;
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
    awaiting_user_input: TaskIndexEntry[];
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

// =============================================================================
// ONBOARDING QUESTIONS (QUESTIONS.yaml)
// =============================================================================

export type QuestionType = "text" | "single_select" | "multi_select";

export interface QuestionOption {
  label: string;
  value: string;
  description?: string;
}

export interface OnboardingQuestion {
  id: string;
  category: string;
  question: string;
  type: QuestionType;
  required: boolean;
  placeholder?: string;
  options?: QuestionOption[];
  answer: string | string[] | null;
  details?: string | null;
}

export interface OnboardingPhase {
  status: "pending" | "in_progress" | "complete";
  questions: OnboardingQuestion[];
}

export interface OnboardingContext {
  project_name: string | null;
  project_summary: string | null;
  problem_summary: string | null;
  features_identified: string[];
  user_roles_identified: string[];
  tech_stack: string | null;
}

export interface OnboardingQuestions {
  version: string;
  status: "pending" | "partial" | "complete";
  current_phase: 1 | 2;
  context: OnboardingContext;
  phases: {
    business: OnboardingPhase;
    features: OnboardingPhase;
  };
  created_at: string;
  updated_at: string;
  answered_count: number;
  total_required: number;
}

export type OnboardingStatus =
  | "not_started"
  | "awaiting_answers"
  | "processing"
  | "complete"
  | "error";

export interface OnboardingState {
  status: OnboardingStatus;
  questions?: OnboardingQuestions;
  error?: string;
}
