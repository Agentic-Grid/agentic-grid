/**
 * Project Service
 * Handles project creation in the sandbox directory
 * Projects are cloned from base-project template (like start_project.sh)
 */

import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import * as yaml from "js-yaml";

import type {
  Project,
  ProjectRegistry,
  RegistryProject,
  ProjectDiscovery,
} from "../types/kanban.types.js";

const execAsync = promisify(exec);

// =============================================================================
// CONFIGURATION
// =============================================================================

// Project root is three levels up from this file
// dashboard/server/services/project.service.ts -> project root
const PROJECT_ROOT = join(import.meta.dirname, "..", "..", "..");
const SANDBOX_DIR = join(PROJECT_ROOT, "sandbox");
const BASE_REPO = "Agentic-Grid/base-project";
const DEFAULT_BRANCH = "master";

// =============================================================================
// ERROR CLASSES
// =============================================================================

export class ProjectError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "ProjectError";
  }
}

// =============================================================================
// PROJECT SERVICE
// =============================================================================

export class ProjectService {
  private sandboxDir: string;
  private baseRepo: string;
  private defaultBranch: string;

  constructor(options?: {
    sandboxDir?: string;
    baseRepo?: string;
    defaultBranch?: string;
  }) {
    this.sandboxDir = options?.sandboxDir || SANDBOX_DIR;
    this.baseRepo = options?.baseRepo || BASE_REPO;
    this.defaultBranch = options?.defaultBranch || DEFAULT_BRANCH;
  }

  // ===========================================================================
  // PRIVATE: FILE OPERATIONS
  // ===========================================================================

  private ensureSandboxExists(): void {
    if (!existsSync(this.sandboxDir)) {
      mkdirSync(this.sandboxDir, { recursive: true });
    }
  }

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

  private getRegistryPath(): string {
    return join(this.sandboxDir, ".registry.yaml");
  }

  private getProjectPath(name: string): string {
    return join(this.sandboxDir, name);
  }

  private getProjectConfigPath(name: string): string {
    return join(this.getProjectPath(name), ".project.yaml");
  }

  // ===========================================================================
  // PRIVATE: REGISTRY OPERATIONS
  // ===========================================================================

  private loadRegistry(): ProjectRegistry {
    const registry = this.readYamlFile<ProjectRegistry>(this.getRegistryPath());
    if (registry) {
      return registry;
    }

    // Return default empty registry
    return {
      version: "1.0",
      updated_at: new Date().toISOString(),
      config: {
        auto_cleanup_days: 30,
        max_active_projects: 10,
        default_branch: this.defaultBranch,
      },
      projects: [],
      next_project_id: 1,
    };
  }

  private saveRegistry(registry: ProjectRegistry): void {
    registry.updated_at = new Date().toISOString();
    this.writeYamlFile(this.getRegistryPath(), registry);
  }

  private addProjectToRegistry(project: RegistryProject): void {
    const registry = this.loadRegistry();

    // Check if project already exists
    const existingIndex = registry.projects.findIndex(
      (p) => p.name === project.name,
    );

    if (existingIndex >= 0) {
      // Update existing entry
      registry.projects[existingIndex] = project;
    } else {
      // Add new entry
      registry.projects.push(project);
      registry.next_project_id++;
    }

    this.saveRegistry(registry);
  }

  // ===========================================================================
  // PRIVATE: VALIDATION
  // ===========================================================================

  private validateProjectName(name: string): void {
    if (!name || typeof name !== "string") {
      throw new ProjectError(
        "VALIDATION_ERROR",
        "Project name is required",
        400,
      );
    }

    // Must be lowercase alphanumeric with hyphens
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(name)) {
      throw new ProjectError(
        "VALIDATION_ERROR",
        "Project name must be lowercase alphanumeric with hyphens (no leading/trailing hyphens)",
        400,
      );
    }

    // Max length
    if (name.length > 50) {
      throw new ProjectError(
        "VALIDATION_ERROR",
        "Project name must be 50 characters or less",
        400,
      );
    }
  }

  /**
   * Check if a GitHub repo exists for the given name
   * Uses gh CLI to check the authenticated user's repos
   */
  private async checkGitHubRepoExists(name: string): Promise<boolean> {
    try {
      // Use gh CLI to check if repo exists for the authenticated user
      const { stdout } = await execAsync(`gh repo view "${name}" --json name`, {
        timeout: 15000,
      });
      // If we get here without error, the repo exists
      return stdout.trim().length > 0;
    } catch {
      // If gh fails, the repo doesn't exist (or gh is not installed/authenticated)
      return false;
    }
  }

  // ===========================================================================
  // PUBLIC: PROJECT OPERATIONS
  // ===========================================================================

  /**
   * Validate a project name before creation
   * Returns validation result with specific error if invalid
   */
  async validateProjectNameAvailability(name: string): Promise<{
    valid: boolean;
    error?: string;
    code?: string;
  }> {
    // Check format first
    try {
      this.validateProjectName(name);
    } catch (error) {
      if (error instanceof ProjectError) {
        return { valid: false, error: error.message, code: error.code };
      }
      return {
        valid: false,
        error: "Invalid project name",
        code: "VALIDATION_ERROR",
      };
    }

    // Check if exists in sandbox
    const projectPath = this.getProjectPath(name);
    if (existsSync(projectPath)) {
      return {
        valid: false,
        error: `A project named '${name}' already exists in your sandbox`,
        code: "SANDBOX_EXISTS",
      };
    }

    // Check if exists on GitHub
    const githubExists = await this.checkGitHubRepoExists(name);
    if (githubExists) {
      return {
        valid: false,
        error: `A repository named '${name}' already exists on your GitHub account`,
        code: "GITHUB_EXISTS",
      };
    }

    return { valid: true };
  }

  /**
   * Create a new project in the sandbox directory
   * Clones from base-project template using git
   */
  async createProject(name: string): Promise<Project> {
    this.validateProjectName(name);
    this.ensureSandboxExists();

    const projectPath = this.getProjectPath(name);

    // Check if project already exists
    if (existsSync(projectPath)) {
      throw new ProjectError(
        "PROJECT_EXISTS",
        `Project '${name}' already exists`,
        409,
      );
    }

    const now = new Date().toISOString();
    const projectId = `proj_${Date.now().toString(36)}`;

    try {
      // Clone the base-project repo
      // Using git clone directly (similar to start_project.sh pattern)
      const cloneUrl = `https://github.com/${this.baseRepo}.git`;

      console.log(`Cloning ${cloneUrl} to ${projectPath}...`);

      await execAsync(
        `git clone --branch ${this.defaultBranch} --single-branch "${cloneUrl}" "${projectPath}"`,
        { timeout: 60000 }, // 1 minute timeout
      );

      // Remove the .git directory to start fresh
      await execAsync(`rm -rf "${join(projectPath, ".git")}"`, {
        timeout: 10000,
      });

      // Initialize new git repo
      await execAsync(`git init`, {
        cwd: projectPath,
        timeout: 10000,
      });

      // Initialize project structure
      await this.initializeProjectStructure(projectPath, name, projectId);

      // Create project config
      const project: Project = {
        id: projectId,
        name,
        slug: name,
        path: projectPath,
        status: "active",
        discovery: {
          completed: false,
        },
        metrics: {
          features_total: 0,
          features_completed: 0,
          tasks_total: 0,
          tasks_pending: 0,
          tasks_in_progress: 0,
          tasks_blocked: 0,
          tasks_qa: 0,
          tasks_completed: 0,
        },
        execution: {
          mode: "idle",
        },
        source: {
          template: this.baseRepo,
          forked_at: now,
        },
        created_at: now,
        updated_at: now,
      };

      // Write project config
      this.writeYamlFile(this.getProjectConfigPath(name), project);

      // Add to registry
      const registryProject: RegistryProject = {
        id: projectId,
        name,
        path: projectPath,
        status: "active",
        created_at: now,
        updated_at: now,
        discovery: {
          completed: false,
        },
        metrics: project.metrics,
        execution: project.execution,
      };

      this.addProjectToRegistry(registryProject);

      // Stage all files and create initial commit so the working tree starts clean
      await execAsync(`git add -A`, {
        cwd: projectPath,
        timeout: 10000,
      });
      await execAsync(
        `git commit -m "Initial commit: project scaffolded from base-project template"`,
        {
          cwd: projectPath,
          timeout: 10000,
        },
      );

      console.log(`Project '${name}' created successfully at ${projectPath}`);

      return project;
    } catch (error) {
      // Clean up on failure
      if (existsSync(projectPath)) {
        try {
          await execAsync(`rm -rf "${projectPath}"`, { timeout: 10000 });
        } catch {
          // Ignore cleanup errors
        }
      }

      if (error instanceof ProjectError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to create project '${name}':`, message);
      throw new ProjectError(
        "CREATE_FAILED",
        `Failed to create project: ${message}`,
        500,
      );
    }
  }

  /**
   * Initialize the project directory structure
   */
  private async initializeProjectStructure(
    projectPath: string,
    name: string,
    projectId: string,
  ): Promise<void> {
    const now = new Date().toISOString();

    // Ensure required directories exist
    const directories = [
      "plans",
      "plans/features",
      "plans/tasks",
      "plans/changes",
      "contracts",
    ];

    for (const dir of directories) {
      const dirPath = join(projectPath, dir);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
    }

    // Create .index.yaml in plans/features if it doesn't exist
    const featureIndexPath = join(
      projectPath,
      "plans",
      "features",
      ".index.yaml",
    );
    if (!existsSync(featureIndexPath)) {
      const featureIndex = {
        version: "1.0",
        updated_at: now,
        project_id: projectId,
        summary: {
          total: 0,
          planning: 0,
          in_progress: 0,
          qa: 0,
          completed: 0,
          archived: 0,
        },
        by_status: {
          planning: [],
          in_progress: [],
          qa: [],
          completed: [],
          archived: [],
        },
        by_priority: {
          high: [],
          medium: [],
          low: [],
        },
        execution_order: [],
        next_feature_id: 1,
      };
      this.writeYamlFile(featureIndexPath, featureIndex);
    }

    // Create CURRENT.md if it doesn't exist
    const currentMdPath = join(projectPath, "plans", "CURRENT.md");
    if (!existsSync(currentMdPath)) {
      const currentMd = `# Current Work - ${name}

> Project created: ${new Date().toLocaleDateString()}

## Status

- [ ] Discovery phase pending
- [ ] Requirements gathering
- [ ] Task breakdown

## Next Steps

1. Run \`/discovery\` to gather requirements
2. Review generated PRD
3. Begin implementation

## Notes

_Add project notes here_
`;
      writeFileSync(currentMdPath, currentMd, "utf-8");
    }
  }

  /**
   * List all projects in the sandbox
   */
  async listProjects(): Promise<Project[]> {
    this.ensureSandboxExists();

    const registry = this.loadRegistry();
    const projects: Project[] = [];

    for (const regProject of registry.projects) {
      const config = this.readYamlFile<Project>(
        this.getProjectConfigPath(regProject.name),
      );

      if (config) {
        projects.push(config);
      } else {
        // Create minimal project from registry
        projects.push({
          id: regProject.id,
          name: regProject.name,
          path: regProject.path,
          status: regProject.status,
          discovery: regProject.discovery,
          metrics: regProject.metrics,
          execution: regProject.execution,
          created_at: regProject.created_at,
          updated_at: regProject.updated_at,
        });
      }
    }

    return projects;
  }

  /**
   * Get a single project by name or ID
   */
  async getProject(nameOrId: string): Promise<Project | null> {
    this.ensureSandboxExists();

    const registry = this.loadRegistry();
    const regProject = registry.projects.find(
      (p) => p.name === nameOrId || p.id === nameOrId,
    );

    if (!regProject) {
      // Try direct path lookup
      const projectPath = this.getProjectPath(nameOrId);
      if (existsSync(projectPath)) {
        return this.readYamlFile<Project>(this.getProjectConfigPath(nameOrId));
      }
      return null;
    }

    const config = this.readYamlFile<Project>(
      this.getProjectConfigPath(regProject.name),
    );

    return (
      config || {
        id: regProject.id,
        name: regProject.name,
        path: regProject.path,
        status: regProject.status,
        discovery: regProject.discovery,
        metrics: regProject.metrics,
        execution: regProject.execution,
        created_at: regProject.created_at,
        updated_at: regProject.updated_at,
      }
    );
  }

  /**
   * Check if a project exists
   */
  async projectExists(name: string): Promise<boolean> {
    const projectPath = this.getProjectPath(name);
    return existsSync(projectPath);
  }

  /**
   * Get the sandbox directory path
   */
  getSandboxDir(): string {
    return this.sandboxDir;
  }
}

// Export singleton instance
export const projectService = new ProjectService();
