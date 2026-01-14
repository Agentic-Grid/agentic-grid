/**
 * YAML Task Writer Service
 * Writes task YAML files for Claude-readable task storage
 * Manages task files in sandbox/<project>/plans/features/<featureId>/tasks/
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from "fs";
import { join, basename } from "path";
import * as yaml from "js-yaml";

import type {
  Task,
  TaskStatus,
  TaskIndex,
  ProgressEntry,
  AgentType,
  TaskPriority,
  TaskType,
  QAConfig,
} from "../types/kanban.types.js";

// =============================================================================
// CONFIGURATION
// =============================================================================

// Project root is three levels up from this file
const PROJECT_ROOT = join(import.meta.dirname, "..", "..", "..");
const DEFAULT_SANDBOX_DIR = join(PROJECT_ROOT, "sandbox");

// =============================================================================
// ERROR CLASSES
// =============================================================================

export class TaskWriterError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "TaskWriterError";
  }
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface CreateTaskInput {
  title: string;
  agent: AgentType;
  type?: TaskType;
  priority?: TaskPriority;
  phase?: number;
  instructions: string;
  files?: string[];
  contracts?: string[];
  depends_on?: string[];
  blocks?: string[];
  estimated_minutes?: number;
}

export interface UpdateTaskInput {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  phase?: number;
  instructions?: string;
  files?: string[];
  contracts?: string[];
  depends_on?: string[];
  blocks?: string[];
  estimated_minutes?: number;
  actual_minutes?: number;
  started_at?: string;
  completed_at?: string;
}

// =============================================================================
// YAML TASK WRITER SERVICE
// =============================================================================

export class YamlTaskWriterService {
  private sandboxDir: string;

  constructor(sandboxDir?: string) {
    this.sandboxDir = sandboxDir || DEFAULT_SANDBOX_DIR;
  }

  // ===========================================================================
  // PRIVATE: FILE OPERATIONS
  // ===========================================================================

  private readYamlFile<T>(filePath: string): T | null {
    try {
      if (!existsSync(filePath)) {
        return null;
      }
      const content = readFileSync(filePath, "utf-8");
      return yaml.load(content) as T;
    } catch (error) {
      console.error(`Error reading YAML file ${filePath}:`, error);
      return null;
    }
  }

  private writeYamlFile<T>(filePath: string, data: T): void {
    const content = yaml.dump(data, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });
    writeFileSync(filePath, content, "utf-8");
  }

  // ===========================================================================
  // PRIVATE: PATH HELPERS
  // ===========================================================================

  private getProjectPath(projectName: string): string {
    return join(this.sandboxDir, projectName);
  }

  private getFeaturesDir(projectPath: string): string {
    return join(projectPath, "plans", "features");
  }

  private findFeatureDir(
    projectPath: string,
    featureId: string,
  ): string | null {
    const featuresDir = this.getFeaturesDir(projectPath);

    if (!existsSync(featuresDir)) {
      return null;
    }

    try {
      const entries = readdirSync(featuresDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith(featureId)) {
          return join(featuresDir, entry.name);
        }
      }
    } catch {
      // Ignore errors
    }

    return null;
  }

  private getTasksDir(featureDir: string): string {
    return join(featureDir, "tasks");
  }

  private getTaskPath(featureDir: string, taskId: string): string {
    return join(this.getTasksDir(featureDir), `${taskId}.yaml`);
  }

  private getTaskIndexPath(featureDir: string): string {
    return join(featureDir, "index.yaml");
  }

  // ===========================================================================
  // PRIVATE: ID GENERATION
  // ===========================================================================

  private async getNextTaskId(featureDir: string): Promise<string> {
    const index = this.readYamlFile<TaskIndex>(
      this.getTaskIndexPath(featureDir),
    );
    const nextId = index?.next_task_id || 1;
    return `TASK-${String(nextId).padStart(3, "0")}`;
  }

  // ===========================================================================
  // PRIVATE: FEATURE DIRECTORY CREATION
  // ===========================================================================

  /**
   * Create a new feature directory with proper structure
   * Returns the full path to the created feature directory
   */
  private async createFeatureDir(
    projectPath: string,
    featureId: string,
    firstTaskTitle?: string,
  ): Promise<string> {
    const featuresDir = this.getFeaturesDir(projectPath);

    // Ensure features directory exists
    if (!existsSync(featuresDir)) {
      mkdirSync(featuresDir, { recursive: true });
    }

    // Generate a slug from the feature ID and first task title
    const slug = firstTaskTitle
      ? firstTaskTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 30)
      : "feature";

    // Create the feature directory name: FEAT-001-slug
    const featureDirName = `${featureId}-${slug}`;
    const featureDir = join(featuresDir, featureDirName);

    // Create the directory and subdirectories
    mkdirSync(featureDir, { recursive: true });
    mkdirSync(join(featureDir, "tasks"), { recursive: true });

    const now = new Date().toISOString();

    // Create the feature.yaml file (required for kanban service to list features)
    const feature = {
      id: featureId,
      project_id: basename(projectPath),
      name: firstTaskTitle || featureId,
      slug: slug,
      description: `Auto-generated feature for ${firstTaskTitle || featureId}`,
      status: "planning" as const,
      priority: "medium" as const,
      type: "enhancement" as const,
      phase: 1,
      owner_agent: "ORCHESTRATOR" as const,
      metrics: {
        tasks_total: 0,
        tasks_pending: 0,
        tasks_in_progress: 0,
        tasks_blocked: 0,
        tasks_qa: 0,
        tasks_completed: 0,
        estimated_minutes: 0,
        actual_minutes: 0,
      },
      execution: {
        current_phase: 1,
        parallel_tasks: [],
        completed_phases: [],
        active_agents: [],
      },
      created_at: now,
      updated_at: now,
    };

    this.writeYamlFile(join(featureDir, "feature.yaml"), feature);

    // Create the feature index file
    const featureIndex: TaskIndex = {
      feature_id: featureId,
      feature_name: firstTaskTitle || featureId,
      updated_at: now,
      summary: {
        total: 0,
        pending: 0,
        in_progress: 0,
        blocked: 0,
        qa: 0,
        completed: 0,
      },
      by_status: {
        pending: [],
        in_progress: [],
        blocked: [],
        qa: [],
        completed: [],
      },
      by_agent: {},
      by_phase: {},
      execution_order: [],
      next_task_id: 1,
    };

    this.writeYamlFile(this.getTaskIndexPath(featureDir), featureIndex);

    console.log(`Created feature directory at ${featureDir}`);
    return featureDir;
  }

  // ===========================================================================
  // PUBLIC: WRITE OPERATIONS
  // ===========================================================================

  /**
   * Write a new task to the feature's tasks directory
   * Creates the feature directory if it doesn't exist
   */
  async writeTask(
    projectPath: string,
    featureId: string,
    taskInput: CreateTaskInput,
  ): Promise<Task> {
    // Find or create the feature directory
    let featureDir = this.findFeatureDir(projectPath, featureId);

    if (!featureDir) {
      // Create feature directory with slug derived from featureId
      featureDir = await this.createFeatureDir(
        projectPath,
        featureId,
        taskInput.title,
      );
    }

    // Ensure tasks directory exists
    const tasksDir = this.getTasksDir(featureDir);
    if (!existsSync(tasksDir)) {
      mkdirSync(tasksDir, { recursive: true });
    }

    // Generate task ID
    const taskId = await this.getNextTaskId(featureDir);
    const now = new Date().toISOString();

    // Build task object
    const task: Task = {
      id: taskId,
      feature_id: featureId,
      title: taskInput.title,
      agent: taskInput.agent,
      status: "pending",
      priority: taskInput.priority || "medium",
      type: taskInput.type || "implementation",
      phase: taskInput.phase || 1,
      estimated_minutes: taskInput.estimated_minutes,
      depends_on: taskInput.depends_on || [],
      blocks: taskInput.blocks || [],
      files: taskInput.files || [],
      contracts: taskInput.contracts || [],
      instructions: taskInput.instructions,
      progress: [
        {
          timestamp: now,
          agent: "ORCHESTRATOR",
          action: "created",
          note: "Task created via API",
        },
      ],
      qa: {
        required: true,
        status: "pending",
        checklist: [],
      },
      created_at: now,
      updated_at: now,
    };

    // Write task file
    const taskPath = this.getTaskPath(featureDir, taskId);
    this.writeYamlFile(taskPath, task);

    // Update index
    await this.regenerateTaskIndex(featureDir, featureId);

    console.log(`Task ${taskId} created at ${taskPath}`);
    return task;
  }

  /**
   * Update an existing task
   */
  async updateTask(
    projectPath: string,
    featureId: string,
    taskId: string,
    updates: UpdateTaskInput,
  ): Promise<Task> {
    const featureDir = this.findFeatureDir(projectPath, featureId);

    if (!featureDir) {
      throw new TaskWriterError(
        "FEATURE_NOT_FOUND",
        `Feature '${featureId}' not found in project`,
        404,
      );
    }

    const taskPath = this.getTaskPath(featureDir, taskId);
    const task = this.readYamlFile<Task>(taskPath);

    if (!task) {
      throw new TaskWriterError(
        "TASK_NOT_FOUND",
        `Task '${taskId}' not found in feature '${featureId}'`,
        404,
      );
    }

    const now = new Date().toISOString();

    // Apply updates
    if (updates.title !== undefined) task.title = updates.title;
    if (updates.status !== undefined) task.status = updates.status;
    if (updates.priority !== undefined) task.priority = updates.priority;
    if (updates.phase !== undefined) task.phase = updates.phase;
    if (updates.instructions !== undefined)
      task.instructions = updates.instructions;
    if (updates.files !== undefined) task.files = updates.files;
    if (updates.contracts !== undefined) task.contracts = updates.contracts;
    if (updates.depends_on !== undefined) task.depends_on = updates.depends_on;
    if (updates.blocks !== undefined) task.blocks = updates.blocks;
    if (updates.estimated_minutes !== undefined)
      task.estimated_minutes = updates.estimated_minutes;
    if (updates.actual_minutes !== undefined)
      task.actual_minutes = updates.actual_minutes;
    if (updates.started_at !== undefined) task.started_at = updates.started_at;
    if (updates.completed_at !== undefined)
      task.completed_at = updates.completed_at;

    task.updated_at = now;

    // Add progress entry
    task.progress.push({
      timestamp: now,
      agent: task.agent,
      action: "updated",
      note: `Task updated: ${Object.keys(updates).join(", ")}`,
    });

    // Write updated task
    this.writeYamlFile(taskPath, task);

    // Regenerate index
    await this.regenerateTaskIndex(featureDir, featureId);

    return task;
  }

  // ===========================================================================
  // PUBLIC: READ OPERATIONS
  // ===========================================================================

  /**
   * Read all tasks for a feature
   */
  async readTasks(projectPath: string, featureId: string): Promise<Task[]> {
    const featureDir = this.findFeatureDir(projectPath, featureId);

    if (!featureDir) {
      throw new TaskWriterError(
        "FEATURE_NOT_FOUND",
        `Feature '${featureId}' not found in project`,
        404,
      );
    }

    const tasksDir = this.getTasksDir(featureDir);
    const tasks: Task[] = [];

    if (!existsSync(tasksDir)) {
      return tasks;
    }

    try {
      const entries = readdirSync(tasksDir);
      for (const entry of entries) {
        if (entry.endsWith(".yaml")) {
          const task = this.readYamlFile<Task>(join(tasksDir, entry));
          if (task) {
            tasks.push(task);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading tasks from ${tasksDir}:`, error);
    }

    // Sort by phase, then by ID
    return tasks.sort((a, b) => {
      if (a.phase !== b.phase) {
        return a.phase - b.phase;
      }
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * Read a single task by ID
   */
  async readTask(
    projectPath: string,
    featureId: string,
    taskId: string,
  ): Promise<Task | null> {
    const featureDir = this.findFeatureDir(projectPath, featureId);

    if (!featureDir) {
      return null;
    }

    const taskPath = this.getTaskPath(featureDir, taskId);
    return this.readYamlFile<Task>(taskPath);
  }

  // ===========================================================================
  // PUBLIC: STATUS OPERATIONS
  // ===========================================================================

  /**
   * Update a task's status with proper progress tracking
   */
  async updateTaskStatus(
    projectPath: string,
    taskId: string,
    status: TaskStatus,
    note?: string,
  ): Promise<Task> {
    // Find task across all features
    const result = await this.findTask(projectPath, taskId);

    if (!result) {
      throw new TaskWriterError(
        "TASK_NOT_FOUND",
        `Task '${taskId}' not found in project`,
        404,
      );
    }

    const { featureDir, task } = result;
    const now = new Date().toISOString();

    // Validate status transition
    if (!this.isValidStatusTransition(task.status, status)) {
      throw new TaskWriterError(
        "INVALID_TRANSITION",
        `Invalid status transition from '${task.status}' to '${status}'`,
        400,
      );
    }

    // Update status
    task.status = status;
    task.updated_at = now;

    // Update timestamps based on status
    if (status === "in_progress" && !task.started_at) {
      task.started_at = now;
    } else if (status === "completed") {
      task.completed_at = now;
    }

    // Add progress entry
    const progressEntry: ProgressEntry = {
      timestamp: now,
      agent: task.agent,
      action: `status_${status}`,
      note: note || `Status changed to ${status}`,
    };
    task.progress.push(progressEntry);

    // Write updated task
    const taskPath = this.getTaskPath(featureDir, taskId);
    this.writeYamlFile(taskPath, task);

    // Regenerate index
    await this.regenerateTaskIndex(featureDir, task.feature_id);

    return task;
  }

  /**
   * Find a task across all features in a project
   */
  private async findTask(
    projectPath: string,
    taskId: string,
  ): Promise<{ featureDir: string; task: Task } | null> {
    const featuresDir = this.getFeaturesDir(projectPath);

    if (!existsSync(featuresDir)) {
      return null;
    }

    try {
      const entries = readdirSync(featuresDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          const featureDir = join(featuresDir, entry.name);
          const taskPath = this.getTaskPath(featureDir, taskId);

          if (existsSync(taskPath)) {
            const task = this.readYamlFile<Task>(taskPath);
            if (task) {
              return { featureDir, task };
            }
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return null;
  }

  /**
   * Check if a status transition is valid
   */
  private isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      pending: ["in_progress", "blocked"],
      in_progress: ["pending", "blocked", "qa", "completed"],
      blocked: ["pending", "in_progress"],
      qa: ["in_progress", "completed"],
      completed: ["in_progress"], // Allow reopening
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  // ===========================================================================
  // PUBLIC: INDEX OPERATIONS
  // ===========================================================================

  /**
   * Regenerate the task index for a feature
   */
  async regenerateTaskIndex(
    featureDir: string,
    featureId: string,
  ): Promise<TaskIndex> {
    const tasksDir = this.getTasksDir(featureDir);
    const tasks: Task[] = [];

    if (existsSync(tasksDir)) {
      const entries = readdirSync(tasksDir);
      for (const entry of entries) {
        if (entry.endsWith(".yaml")) {
          const task = this.readYamlFile<Task>(join(tasksDir, entry));
          if (task) {
            tasks.push(task);
          }
        }
      }
    }

    const now = new Date().toISOString();

    const index: TaskIndex = {
      version: "1.0",
      updated_at: now,
      feature_id: featureId,
      summary: {
        total: tasks.length,
        pending: 0,
        in_progress: 0,
        blocked: 0,
        qa: 0,
        completed: 0,
      },
      by_status: {
        pending: [],
        in_progress: [],
        blocked: [],
        qa: [],
        completed: [],
      },
      by_phase: {},
      by_agent: {} as Record<AgentType, string[]>,
      dependencies: {},
      next_task_id: 1,
    };

    for (const task of tasks) {
      // Update summary counts
      index.summary[task.status]++;

      // Build by_status entries
      const entry = {
        id: task.id,
        title: task.title,
        agent: task.agent,
        phase: task.phase,
        priority: task.priority,
        started_at: task.started_at,
        completed_at: task.completed_at,
        blocked_by: task.status === "blocked" ? task.depends_on : undefined,
      };

      index.by_status[task.status].push(entry);

      // Build by_phase
      if (!index.by_phase[task.phase]) {
        index.by_phase[task.phase] = [];
      }
      index.by_phase[task.phase].push(task.id);

      // Build by_agent
      if (!index.by_agent[task.agent]) {
        index.by_agent[task.agent] = [];
      }
      index.by_agent[task.agent].push(task.id);

      // Build dependencies
      index.dependencies[task.id] = {
        depends_on: task.depends_on,
        blocks: task.blocks,
      };

      // Track next ID
      const idNum = parseInt(task.id.replace("TASK-", ""), 10);
      if (!isNaN(idNum) && idNum >= index.next_task_id) {
        index.next_task_id = idNum + 1;
      }
    }

    // Write index
    this.writeYamlFile(this.getTaskIndexPath(featureDir), index);

    return index;
  }

  // ===========================================================================
  // PUBLIC: UTILITY
  // ===========================================================================

  /**
   * Get the sandbox directory path
   */
  getSandboxDir(): string {
    return this.sandboxDir;
  }
}

// Export singleton instance
export const yamlTaskWriterService = new YamlTaskWriterService();
