/**
 * Kanban Service
 * File-based operations for the Kanban task management system
 * Reads/writes YAML files in the sandbox directory structure
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
  rmSync,
} from "fs";
import { homedir } from "os";
import { join } from "path";
import * as yaml from "js-yaml";

import type {
  Project,
  Feature,
  Task,
  TaskStatus,
  TaskIndex,
  FeatureIndex,
  ProjectRegistry,
  FileLocks,
  Dashboard,
  ProgressEntry,
  TaskIndexEntry,
  FeatureIndexEntry,
  AgentType,
  TaskPriority,
} from "../types/kanban.types.js";

// =============================================================================
// CONFIGURATION
// =============================================================================

// Project root is one level up from dashboard folder
// dashboard/server/services/kanban.service.ts -> project root
const PROJECT_ROOT = join(import.meta.dirname, "..", "..", "..");

// Sandbox directory is at project root level
const DEFAULT_SANDBOX_DIR = join(PROJECT_ROOT, "sandbox");

export class KanbanService {
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
    try {
      const content = yaml.dump(data, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false,
      });
      writeFileSync(filePath, content, "utf-8");
    } catch (error) {
      console.error(`Error writing YAML file ${filePath}:`, error);
      throw error;
    }
  }

  private ensureSandboxExists(): boolean {
    return existsSync(this.sandboxDir);
  }

  // ===========================================================================
  // PRIVATE: PATH HELPERS
  // ===========================================================================

  private getRegistryPath(): string {
    return join(this.sandboxDir, ".registry.yaml");
  }

  private getDashboardPath(): string {
    return join(this.sandboxDir, ".dashboard.yaml");
  }

  private getLocksPath(): string {
    return join(this.sandboxDir, ".locks.yaml");
  }

  private getProjectPath(projectName: string): string {
    return join(this.sandboxDir, projectName);
  }

  private getProjectConfigPath(projectName: string): string {
    return join(this.getProjectPath(projectName), ".project.yaml");
  }

  private getFeatureIndexPath(projectName: string): string {
    return join(
      this.getProjectPath(projectName),
      "plans",
      "features",
      ".index.yaml",
    );
  }

  private findFeatureDir(
    projectName: string,
    featureId: string,
  ): string | null {
    const featuresDir = join(
      this.getProjectPath(projectName),
      "plans",
      "features",
    );

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

  private findFeatureDirById(
    featureId: string,
  ): { projectName: string; featureDir: string } | null {
    if (!this.ensureSandboxExists()) {
      return null;
    }

    try {
      const entries = readdirSync(this.sandboxDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          const featureDir = this.findFeatureDir(entry.name, featureId);
          if (featureDir) {
            return { projectName: entry.name, featureDir };
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return null;
  }

  private getFeatureYamlPath(featureDir: string): string {
    return join(featureDir, "feature.yaml");
  }

  private getTaskIndexPath(featureDir: string): string {
    return join(featureDir, "index.yaml");
  }

  private getTasksDir(featureDir: string): string {
    return join(featureDir, "tasks");
  }

  private getTaskPath(featureDir: string, taskId: string): string {
    return join(this.getTasksDir(featureDir), `${taskId}.yaml`);
  }

  private findTaskPath(
    taskId: string,
  ): { featureDir: string; taskPath: string; projectName: string } | null {
    if (!this.ensureSandboxExists()) {
      return null;
    }

    try {
      const projects = readdirSync(this.sandboxDir, { withFileTypes: true });
      for (const projectEntry of projects) {
        if (!projectEntry.isDirectory() || projectEntry.name.startsWith(".")) {
          continue;
        }

        const featuresDir = join(
          this.sandboxDir,
          projectEntry.name,
          "plans",
          "features",
        );
        if (!existsSync(featuresDir)) {
          continue;
        }

        const features = readdirSync(featuresDir, { withFileTypes: true });
        for (const featureEntry of features) {
          if (
            !featureEntry.isDirectory() ||
            featureEntry.name.startsWith(".")
          ) {
            continue;
          }

          const featureDir = join(featuresDir, featureEntry.name);
          const taskPath = this.getTaskPath(featureDir, taskId);

          if (existsSync(taskPath)) {
            return { featureDir, taskPath, projectName: projectEntry.name };
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return null;
  }

  // ===========================================================================
  // PUBLIC: PROJECT OPERATIONS
  // ===========================================================================

  /**
   * List all projects from the registry
   */
  async listProjects(): Promise<Project[]> {
    if (!this.ensureSandboxExists()) {
      return [];
    }

    // Always scan directories to get all projects in sandbox
    const scannedProjects = this.scanProjects();

    // Merge with registry data if available (registry may have additional metadata)
    const registry = this.readYamlFile<ProjectRegistry>(this.getRegistryPath());
    if (registry?.projects) {
      const registryMap = new Map(registry.projects.map((p) => [p.name, p]));

      return scannedProjects.map((scanned) => {
        const registryData = registryMap.get(scanned.name);
        if (registryData) {
          // Use registry data but ensure path is correct
          return {
            id: registryData.id,
            name: registryData.name,
            slug: registryData.name,
            path: registryData.path || scanned.path,
            status: registryData.status,
            discovery: registryData.discovery,
            metrics: registryData.metrics,
            execution: registryData.execution,
            git: registryData.git,
            created_at: registryData.created_at,
            updated_at: registryData.updated_at,
          };
        }
        // Project not in registry - use scanned data
        return scanned;
      });
    }

    return scannedProjects;
  }

  /**
   * Delete a project and all associated data
   * - Removes the project folder from sandbox
   * - Removes Claude session files for the project
   */
  async deleteProject(
    projectName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const projectPath = this.getProjectPath(projectName);

      // Check if project exists
      if (!existsSync(projectPath)) {
        return { success: false, error: `Project not found: ${projectName}` };
      }

      // 1. Delete the project folder
      rmSync(projectPath, { recursive: true, force: true });

      // 2. Delete Claude session files for this project
      const claudeProjectsDir = join(homedir(), ".claude", "projects");
      if (existsSync(claudeProjectsDir)) {
        try {
          const projectFolders = readdirSync(claudeProjectsDir, {
            withFileTypes: true,
          });
          for (const folder of projectFolders) {
            if (folder.isDirectory()) {
              // Session folders are named like: -Users-diego-Projects-project-name
              // or contain the project name in some form
              const folderPath = join(claudeProjectsDir, folder.name);
              const decodedName = folder.name.replace(/-/g, "/");

              // Check if this folder relates to our project
              if (
                folder.name.includes(projectName) ||
                decodedName.includes(projectName) ||
                folder.name.endsWith(`-${projectName}`)
              ) {
                rmSync(folderPath, { recursive: true, force: true });
                console.log(`Deleted Claude sessions folder: ${folder.name}`);
              }
            }
          }
        } catch (err) {
          // Continue even if we can't delete session files
          console.warn("Could not clean up Claude session files:", err);
        }
      }

      // 3. Update registry if it exists
      const registryPath = this.getRegistryPath();
      const registry = this.readYamlFile<ProjectRegistry>(registryPath);
      if (registry && registry.projects) {
        registry.projects = registry.projects.filter(
          (p) => p.name !== projectName && p.id !== projectName,
        );
        registry.updated_at = new Date().toISOString();
        this.writeYamlFile(registryPath, registry);
      }

      return { success: true };
    } catch (error) {
      console.error(`Error deleting project ${projectName}:`, error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete project",
      };
    }
  }

  /**
   * Scan project directories when registry is not available
   */
  private scanProjects(): Project[] {
    const projects: Project[] = [];

    try {
      const entries = readdirSync(this.sandboxDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith(".")) {
          const projectConfig = this.readYamlFile<Project>(
            this.getProjectConfigPath(entry.name),
          );

          if (projectConfig) {
            projects.push(projectConfig);
          } else {
            // Create minimal project entry from directory
            const stat = statSync(join(this.sandboxDir, entry.name));
            projects.push({
              id: `proj_${entry.name}`,
              name: entry.name,
              slug: entry.name,
              path: join(this.sandboxDir, entry.name),
              status: "active",
              discovery: { completed: false },
              created_at: stat.birthtime.toISOString(),
              updated_at: stat.mtime.toISOString(),
            });
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return projects;
  }

  /**
   * Get a single project by ID or name
   */
  async getProject(idOrName: string): Promise<Project | null> {
    // First check registry
    const registry = this.readYamlFile<ProjectRegistry>(this.getRegistryPath());
    if (registry?.projects) {
      const project = registry.projects.find(
        (p) => p.id === idOrName || p.name === idOrName,
      );
      if (project) {
        // Try to get full config
        const fullConfig = this.readYamlFile<Project>(
          this.getProjectConfigPath(project.name),
        );
        return (
          fullConfig || {
            id: project.id,
            name: project.name,
            path: project.path,
            status: project.status,
            discovery: project.discovery,
            metrics: project.metrics,
            execution: project.execution,
            git: project.git,
            created_at: project.created_at,
            updated_at: project.updated_at,
          }
        );
      }
    }

    // Fall back to direct directory check
    const projectPath = this.getProjectPath(idOrName);
    if (existsSync(projectPath)) {
      const config = this.readYamlFile<Project>(
        this.getProjectConfigPath(idOrName),
      );
      if (config) {
        return config;
      }
    }

    return null;
  }

  // ===========================================================================
  // PUBLIC: FEATURE OPERATIONS
  // ===========================================================================

  /**
   * List all features, optionally filtered by project
   */
  async listFeatures(projectId?: string): Promise<Feature[]> {
    const features: Feature[] = [];

    if (!this.ensureSandboxExists()) {
      return features;
    }

    const projectsToScan = projectId
      ? [projectId]
      : readdirSync(this.sandboxDir, { withFileTypes: true })
          .filter((e) => e.isDirectory() && !e.name.startsWith("."))
          .map((e) => e.name);

    for (const projectName of projectsToScan) {
      const featuresDir = join(
        this.getProjectPath(projectName),
        "plans",
        "features",
      );

      if (!existsSync(featuresDir)) {
        continue;
      }

      try {
        const entries = readdirSync(featuresDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith(".")) {
            const featureDir = join(featuresDir, entry.name);
            const feature = this.readYamlFile<Feature>(
              this.getFeatureYamlPath(featureDir),
            );
            if (feature) {
              // Add project_id and name for cross-project views
              feature.project_id = projectName;
              feature.name = feature.title;
              features.push(feature);
            }
          }
        }
      } catch {
        // Ignore errors
      }
    }

    return features;
  }

  /**
   * Get a single feature by ID
   */
  async getFeature(featureId: string): Promise<Feature | null> {
    const result = this.findFeatureDirById(featureId);
    if (!result) {
      return null;
    }

    const feature = this.readYamlFile<Feature>(
      this.getFeatureYamlPath(result.featureDir),
    );

    if (feature) {
      // Add project_id and name for consistency with listFeatures
      feature.project_id = result.projectName;
      feature.name = feature.title;
    }

    return feature;
  }

  /**
   * Update a feature's session_id
   * Used to link a Claude session to a feature for development tracking
   */
  async updateFeatureSession(
    featureId: string,
    sessionId: string | null,
  ): Promise<Feature | null> {
    const result = this.findFeatureDirById(featureId);
    if (!result) {
      return null;
    }

    const featurePath = this.getFeatureYamlPath(result.featureDir);
    const feature = this.readYamlFile<Feature>(featurePath);
    if (!feature) {
      return null;
    }

    // Update session_id and timestamp
    feature.session_id = sessionId;
    feature.updated_at = new Date().toISOString();

    // Write updated feature
    this.writeYamlFile(featurePath, feature);

    // Add project_id and name for consistency
    feature.project_id = result.projectName;
    feature.name = feature.title;

    return feature;
  }

  /**
   * Get the feature index for a project
   */
  async getFeatureIndex(projectId: string): Promise<FeatureIndex | null> {
    return this.readYamlFile<FeatureIndex>(this.getFeatureIndexPath(projectId));
  }

  // ===========================================================================
  // PUBLIC: TASK OPERATIONS
  // ===========================================================================

  /**
   * List all tasks for a feature
   */
  async listTasks(featureId: string): Promise<Task[]> {
    const result = this.findFeatureDirById(featureId);
    if (!result) {
      return [];
    }

    const tasks: Task[] = [];
    const tasksDir = this.getTasksDir(result.featureDir);

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
    } catch {
      // Ignore errors
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
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<Task | null> {
    const result = this.findTaskPath(taskId);
    if (!result) {
      return null;
    }

    return this.readYamlFile<Task>(result.taskPath);
  }

  /**
   * Get the task index for a feature
   */
  async getTaskIndex(featureId: string): Promise<TaskIndex | null> {
    const result = this.findFeatureDirById(featureId);
    if (!result) {
      return null;
    }

    return this.readYamlFile<TaskIndex>(
      this.getTaskIndexPath(result.featureDir),
    );
  }

  /**
   * Update a task's status
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
  ): Promise<Task | null> {
    const result = this.findTaskPath(taskId);
    if (!result) {
      return null;
    }

    const task = this.readYamlFile<Task>(result.taskPath);
    if (!task) {
      return null;
    }

    // Validate status transition
    if (!this.isValidStatusTransition(task.status, status)) {
      throw new Error(
        `Invalid status transition from '${task.status}' to '${status}'`,
      );
    }

    // Update task
    const now = new Date().toISOString();
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
      note: `Status changed to ${status}`,
    };
    task.progress.push(progressEntry);

    // Write updated task
    this.writeYamlFile(result.taskPath, task);

    // Regenerate index
    await this.regenerateTaskIndex(result.featureDir);

    return task;
  }

  /**
   * Move a task to a new column (status) with optional order
   */
  async moveTask(
    taskId: string,
    column: TaskStatus,
    order?: number,
  ): Promise<Task | null> {
    // Moving is essentially a status update
    return this.updateTaskStatus(taskId, column);
  }

  /**
   * Check if a status transition is valid
   */
  private isValidStatusTransition(from: TaskStatus, to: TaskStatus): boolean {
    // Define valid transitions
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
  async regenerateTaskIndex(featureDir: string): Promise<TaskIndex> {
    const tasks = await this.listTasksFromDir(featureDir);
    const featureYaml = this.readYamlFile<Feature>(
      this.getFeatureYamlPath(featureDir),
    );
    const featureId = featureYaml?.id || "UNKNOWN";

    const index: TaskIndex = {
      version: "1.0",
      updated_at: new Date().toISOString(),
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
      const entry: TaskIndexEntry = {
        id: task.id,
        title: task.title,
        agent: task.agent,
        phase: task.phase,
        priority: task.priority,
      };

      if (task.started_at) {
        entry.started_at = task.started_at;
      }
      if (task.completed_at) {
        entry.completed_at = task.completed_at;
      }
      if (task.status === "blocked" && task.depends_on.length > 0) {
        entry.blocked_by = task.depends_on;
      }

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

  /**
   * Regenerate all indexes for a feature
   */
  async regenerateIndexes(featureId: string): Promise<void> {
    const result = this.findFeatureDirById(featureId);
    if (!result) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    await this.regenerateTaskIndex(result.featureDir);
    // Could also regenerate feature index here if needed
  }

  /**
   * Helper to list tasks from a specific feature directory
   */
  private async listTasksFromDir(featureDir: string): Promise<Task[]> {
    const tasks: Task[] = [];
    const tasksDir = this.getTasksDir(featureDir);

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
    } catch {
      // Ignore errors
    }

    return tasks;
  }

  // ===========================================================================
  // PUBLIC: DASHBOARD & LOCKS
  // ===========================================================================

  /**
   * Get the aggregated dashboard data
   */
  async getDashboard(): Promise<Dashboard | null> {
    return this.readYamlFile<Dashboard>(this.getDashboardPath());
  }

  /**
   * Get current file locks
   */
  async getLocks(): Promise<FileLocks | null> {
    return this.readYamlFile<FileLocks>(this.getLocksPath());
  }

  // ===========================================================================
  // PUBLIC: CREATE OPERATIONS (for auto-documenting work)
  // ===========================================================================

  /**
   * Create a new feature
   */
  async createFeature(
    projectName: string,
    featureData: {
      id: string;
      title: string;
      description: string;
      type?: "feature" | "bugfix" | "enhancement" | "refactor";
      priority?: "high" | "medium" | "low";
      source?: string; // e.g., "user_request", "claude_code", "discovery"
    },
  ): Promise<Feature> {
    const featuresDir = join(
      this.getProjectPath(projectName),
      "plans",
      "features",
    );

    // Create features directory if it doesn't exist
    const { mkdirSync } = await import("fs");
    if (!existsSync(featuresDir)) {
      mkdirSync(featuresDir, { recursive: true });
    }

    // Generate feature ID if not provided
    const featureId =
      featureData.id || `FEAT-${Date.now().toString(36).toUpperCase()}`;
    const featureSlug = featureData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    const featureDirName = `${featureId}-${featureSlug}`;
    const featureDir = join(featuresDir, featureDirName);

    // Create feature directory and tasks subdirectory
    mkdirSync(featureDir, { recursive: true });
    mkdirSync(join(featureDir, "tasks"), { recursive: true });

    const now = new Date().toISOString();
    const feature: Feature = {
      id: featureId,
      title: featureData.title,
      description: featureData.description,
      type: featureData.type || "feature",
      status: "planning",
      priority: featureData.priority || "medium",
      source: featureData.source || "user_request",
      created_at: now,
      updated_at: now,
      tasks: {
        total: 0,
        pending: 0,
        in_progress: 0,
        blocked: 0,
        qa: 0,
        completed: 0,
      },
      execution: {
        mode: "manual",
        current_phase: 0,
      },
      history: [
        {
          timestamp: now,
          action: "created",
          agent: "ORCHESTRATOR",
          note: `Feature created from ${featureData.source || "user request"}`,
        },
      ],
    };

    // Write feature.yaml
    this.writeYamlFile(this.getFeatureYamlPath(featureDir), feature);

    // Create empty index.yaml
    const emptyIndex: TaskIndex = {
      version: "1.0",
      updated_at: now,
      feature_id: featureId,
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
      by_phase: {},
      by_agent: {} as Record<AgentType, string[]>,
      dependencies: {},
      next_task_id: 1,
    };
    this.writeYamlFile(this.getTaskIndexPath(featureDir), emptyIndex);

    return feature;
  }

  /**
   * Create a new task within a feature
   */
  async createTask(
    featureId: string,
    taskData: {
      title: string;
      agent: AgentType;
      type?: "design" | "implementation" | "validation" | "research";
      priority?: TaskPriority;
      phase?: number;
      instructions: string;
      files?: string[];
      contracts?: string[];
      depends_on?: string[];
      source?: string;
    },
  ): Promise<Task> {
    const result = this.findFeatureDirById(featureId);
    if (!result) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    // Get current index to determine next task ID
    const index = await this.getTaskIndex(featureId);
    const nextId = index?.next_task_id || 1;
    const taskId = `TASK-${String(nextId).padStart(3, "0")}`;

    const now = new Date().toISOString();
    const task: Task = {
      id: taskId,
      feature_id: featureId,
      title: taskData.title,
      agent: taskData.agent,
      status: "pending",
      priority: taskData.priority || "medium",
      type: taskData.type || "implementation",
      phase: taskData.phase || 1,
      depends_on: taskData.depends_on || [],
      blocks: [],
      files: taskData.files || [],
      contracts: taskData.contracts || [],
      instructions: taskData.instructions,
      progress: [
        {
          timestamp: now,
          agent: "ORCHESTRATOR",
          action: "created",
          note: `Task created from ${taskData.source || "user request"}`,
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
    const taskPath = this.getTaskPath(result.featureDir, taskId);
    this.writeYamlFile(taskPath, task);

    // Regenerate index
    await this.regenerateTaskIndex(result.featureDir);

    return task;
  }

  /**
   * Quick method to create a feature + task in one call
   * Used by Claude Code to auto-document work requests
   */
  async createWorkItem(
    projectName: string,
    request: {
      title: string;
      description: string;
      type: "feature" | "bugfix" | "enhancement";
      agent: AgentType;
      instructions: string;
      priority?: "high" | "medium" | "low";
      files?: string[];
    },
  ): Promise<{ feature: Feature; task: Task }> {
    // Create the feature
    const feature = await this.createFeature(projectName, {
      id: `FEAT-${Date.now().toString(36).toUpperCase()}`,
      title: request.title,
      description: request.description,
      type: request.type,
      priority: request.priority,
      source: "claude_code",
    });

    // Create the initial task
    const task = await this.createTask(feature.id, {
      title: request.title,
      agent: request.agent,
      type: "implementation",
      priority: request.priority,
      phase: 1,
      instructions: request.instructions,
      files: request.files,
      source: "claude_code",
    });

    return { feature, task };
  }

  // ===========================================================================
  // PUBLIC: UNIFIED DATA OPERATIONS
  // ===========================================================================

  /**
   * Get all projects with their features and tasks in a single call
   * Used by dashboard and kanban views to minimize API calls
   */
  async getAllProjectsWithData(): Promise<{
    projects: Array<Project & { features: Array<Feature & { tasks: Task[] }> }>;
  }> {
    const result: {
      projects: Array<
        Project & { features: Array<Feature & { tasks: Task[] }> }
      >;
    } = {
      projects: [],
    };

    if (!this.ensureSandboxExists()) {
      return result;
    }

    // Get all projects
    const projects = await this.listProjects();

    for (const project of projects) {
      const projectName = project.name;
      const projectWithData: Project & {
        features: Array<Feature & { tasks: Task[] }>;
      } = {
        ...project,
        features: [],
      };

      // Get features for this project
      const featuresDir = join(
        this.getProjectPath(projectName),
        "plans",
        "features",
      );

      if (existsSync(featuresDir)) {
        try {
          const entries = readdirSync(featuresDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith(".")) {
              const featureDir = join(featuresDir, entry.name);
              const feature = this.readYamlFile<Feature>(
                this.getFeatureYamlPath(featureDir),
              );

              if (feature) {
                // Add project_id and name for cross-project views
                feature.project_id = projectName;
                feature.name = feature.title;

                // Get tasks for this feature
                const tasks: Task[] = [];
                const tasksDir = this.getTasksDir(featureDir);

                if (existsSync(tasksDir)) {
                  try {
                    const taskEntries = readdirSync(tasksDir);
                    for (const taskEntry of taskEntries) {
                      if (taskEntry.endsWith(".yaml")) {
                        const task = this.readYamlFile<Task>(
                          join(tasksDir, taskEntry),
                        );
                        if (task) {
                          tasks.push(task);
                        }
                      }
                    }
                  } catch {
                    // Ignore task read errors
                  }
                }

                // Sort tasks by phase, then by ID
                tasks.sort((a, b) => {
                  if (a.phase !== b.phase) {
                    return a.phase - b.phase;
                  }
                  return a.id.localeCompare(b.id);
                });

                projectWithData.features.push({
                  ...feature,
                  tasks,
                });
              }
            }
          }
        } catch {
          // Ignore feature read errors
        }
      }

      result.projects.push(projectWithData);
    }

    return result;
  }
}

// Export a singleton instance for convenience
export const kanbanService = new KanbanService();
