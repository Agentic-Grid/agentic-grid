/**
 * Kanban Frontend Types
 * Types for Kanban board components and state management
 */

// =============================================================================
// RE-EXPORT SERVER TYPES (duplicated to avoid import issues)
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

// =============================================================================
// CORE TYPES
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
  progress: ProgressEntry[];
  qa: QAConfig;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  completed_at?: string | null;
}

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
// UI-SPECIFIC TYPES
// =============================================================================

/**
 * Drag state for drag-and-drop operations
 */
export interface DragState {
  isDragging: boolean;
  taskId: string | null;
  sourceColumn: TaskStatus | null;
  targetColumn: TaskStatus | null;
}

/**
 * Column state for Kanban board
 */
export interface ColumnState {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  isDropTarget: boolean;
}

/**
 * Task card display state
 */
export type TaskCardState =
  | "default"
  | "hover"
  | "dragging"
  | "drop-target"
  | "disabled"
  | "loading";

/**
 * Status display configuration
 */
export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  animation?: string;
}

/**
 * Agent display configuration
 */
export interface AgentConfig {
  label: string;
  color: string;
  glow: string;
  dim: string;
}

// =============================================================================
// COLUMN CONFIGURATION
// =============================================================================

export const COLUMN_CONFIG: Record<
  TaskStatus,
  { title: string; order: number }
> = {
  pending: { title: "To Do", order: 0 },
  in_progress: { title: "In Progress", order: 1 },
  blocked: { title: "Blocked", order: 2 },
  qa: { title: "QA Review", order: 3 },
  completed: { title: "Done", order: 4 },
};

// Default columns to show on the board (3-column layout)
export const DEFAULT_COLUMNS: TaskStatus[] = [
  "pending",
  "in_progress",
  "completed",
];

// =============================================================================
// STATUS COLORS (from design-spec.md)
// =============================================================================

export const STATUS_COLORS: Record<TaskStatus, StatusConfig> = {
  pending: {
    label: "Pending",
    color: "var(--text-tertiary)",
    bgColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "var(--border-subtle)",
  },
  in_progress: {
    label: "In Progress",
    color: "var(--accent-amber)",
    bgColor: "rgba(251, 191, 36, 0.15)",
    borderColor: "rgba(251, 191, 36, 0.3)",
    animation: "statusPulse 1.5s ease-in-out infinite",
  },
  blocked: {
    label: "Blocked",
    color: "var(--accent-rose)",
    bgColor: "rgba(251, 113, 133, 0.15)",
    borderColor: "rgba(251, 113, 133, 0.3)",
  },
  qa: {
    label: "QA Review",
    color: "var(--accent-cyan)",
    bgColor: "rgba(34, 211, 238, 0.15)",
    borderColor: "rgba(34, 211, 238, 0.3)",
  },
  completed: {
    label: "Completed",
    color: "var(--accent-emerald)",
    bgColor: "rgba(52, 211, 153, 0.15)",
    borderColor: "rgba(52, 211, 153, 0.3)",
  },
};

// =============================================================================
// AGENT COLORS (from design-spec.md)
// =============================================================================

export const AGENT_COLORS: Record<AgentType, AgentConfig> = {
  DESIGNER: {
    label: "Designer",
    color: "var(--accent-violet)",
    glow: "var(--accent-violet-glow)",
    dim: "var(--accent-violet-dim)",
  },
  FRONTEND: {
    label: "Frontend",
    color: "var(--accent-cyan)",
    glow: "var(--accent-cyan-glow)",
    dim: "var(--accent-cyan-dim)",
  },
  BACKEND: {
    label: "Backend",
    color: "var(--accent-primary)",
    glow: "var(--accent-primary-glow)",
    dim: "var(--accent-primary-dim)",
  },
  DATA: {
    label: "Data",
    color: "var(--accent-emerald)",
    glow: "var(--accent-emerald-glow)",
    dim: "var(--accent-emerald-dim)",
  },
  DEVOPS: {
    label: "DevOps",
    color: "var(--accent-amber)",
    glow: "var(--accent-amber-glow)",
    dim: "var(--accent-amber-dim)",
  },
  DISCOVERY: {
    label: "Discovery",
    color: "var(--accent-rose)",
    glow: "var(--accent-rose-glow)",
    dim: "var(--accent-rose-dim)",
  },
  QA: {
    label: "QA",
    color: "var(--text-tertiary)",
    glow: "transparent",
    dim: "var(--text-muted)",
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Get color CSS variable for an agent type
 */
export function getAgentColor(agent: AgentType): string {
  return AGENT_COLORS[agent]?.color || "var(--text-tertiary)";
}

/**
 * Get status configuration
 */
export function getStatusConfig(status: TaskStatus): StatusConfig {
  return STATUS_COLORS[status] || STATUS_COLORS.pending;
}

// =============================================================================
// ONBOARDING TYPES
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
