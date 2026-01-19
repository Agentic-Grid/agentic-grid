/**
 * Orchestrator Service
 * Manages parallel execution of agent tasks for features
 * Analyzes dependencies, groups tasks by phase, and spawns sessions in parallel
 */

import {
  sessionSpawner,
  SessionInfo,
  SpawnResult,
} from "./session-spawner.service.js";
import { kanbanService } from "./kanban.service.js";
import { StateService } from "./state.service.js";
import type { Task, AgentType, TaskStatus } from "../types/kanban.types.js";

// =============================================================================
// TYPES
// =============================================================================

export interface TaskExecution {
  taskId: string;
  agent: AgentType;
  phase: number;
  sessionId?: string;
  pid?: number;
  status: "pending" | "spawning" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface PhaseExecution {
  phase: number;
  tasks: TaskExecution[];
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
}

export interface FeatureExecution {
  featureId: string;
  projectPath: string;
  status: "pending" | "running" | "completed" | "failed" | "partial";
  phases: PhaseExecution[];
  startedAt: string;
  completedAt?: string;
  tasksTotal: number;
  tasksCompleted: number;
  tasksFailed: number;
}

export interface ExecuteOptions {
  /** Skip permission prompts for full automation */
  dangerouslySkipPermissions?: boolean;
  /** Only execute tasks for specific agents */
  filterAgents?: AgentType[];
  /** Only execute specific phases */
  filterPhases?: number[];
  /** Maximum parallel sessions per phase */
  maxParallelSessions?: number;
  /** Timeout per task in milliseconds */
  taskTimeoutMs?: number;
  /** Dry run - analyze but don't execute */
  dryRun?: boolean;
}

// =============================================================================
// DEPENDENCY ANALYSIS
// =============================================================================

interface DependencyGraph {
  tasks: Map<string, Task>;
  dependsOn: Map<string, Set<string>>;
  blocks: Map<string, Set<string>>;
}

function buildDependencyGraph(tasks: Task[]): DependencyGraph {
  const graph: DependencyGraph = {
    tasks: new Map(),
    dependsOn: new Map(),
    blocks: new Map(),
  };

  for (const task of tasks) {
    graph.tasks.set(task.id, task);
    graph.dependsOn.set(task.id, new Set(task.depends_on || []));
    graph.blocks.set(task.id, new Set(task.blocks || []));
  }

  return graph;
}

function getExecutablePhases(tasks: Task[]): Map<number, Task[]> {
  const phases = new Map<number, Task[]>();

  for (const task of tasks) {
    const phase = task.phase || 1;
    if (!phases.has(phase)) {
      phases.set(phase, []);
    }
    phases.get(phase)!.push(task);
  }

  return new Map([...phases.entries()].sort((a, b) => a[0] - b[0]));
}

function canExecuteTask(task: Task, completedTasks: Set<string>): boolean {
  if (!task.depends_on || task.depends_on.length === 0) {
    return true;
  }
  return task.depends_on.every((depId) => completedTasks.has(depId));
}

// =============================================================================
// ORCHESTRATOR CLASS
// =============================================================================

export class OrchestratorService {
  private activeExecutions: Map<string, FeatureExecution> = new Map();

  /**
   * Execute all tasks for a feature in parallel phases
   * @param projectPath - The project directory
   * @param featureId - The feature identifier
   * @param tasks - Array of tasks to execute
   * @param options - Execution options
   */
  async executeFeatureParallel(
    projectPath: string,
    featureId: string,
    tasks: Task[],
    options: ExecuteOptions = {},
  ): Promise<FeatureExecution> {
    const {
      dangerouslySkipPermissions = false,
      filterAgents,
      filterPhases,
      maxParallelSessions = 5,
      taskTimeoutMs = 600000, // 10 minutes default
      dryRun = false,
    } = options;

    // Filter tasks if needed
    let filteredTasks = tasks.filter(
      (t) => t.status === "pending" || t.status === "in_progress",
    );

    if (filterAgents && filterAgents.length > 0) {
      filteredTasks = filteredTasks.filter((t) =>
        filterAgents.includes(t.agent),
      );
    }

    if (filterPhases && filterPhases.length > 0) {
      filteredTasks = filteredTasks.filter((t) =>
        filterPhases.includes(t.phase),
      );
    }

    // Group tasks by phase
    const phaseGroups = getExecutablePhases(filteredTasks);

    // Initialize execution record
    const execution: FeatureExecution = {
      featureId,
      projectPath,
      status: "pending",
      phases: [],
      startedAt: new Date().toISOString(),
      tasksTotal: filteredTasks.length,
      tasksCompleted: 0,
      tasksFailed: 0,
    };

    // Build phase executions
    for (const [phaseNum, phaseTasks] of phaseGroups) {
      const phaseExec: PhaseExecution = {
        phase: phaseNum,
        tasks: phaseTasks.map((t) => ({
          taskId: t.id,
          agent: t.agent,
          phase: t.phase,
          status: "pending" as const,
        })),
        status: "pending",
      };
      execution.phases.push(phaseExec);
    }

    // If dry run, return the execution plan without running
    if (dryRun) {
      return execution;
    }

    // Track this execution
    this.activeExecutions.set(featureId, execution);
    execution.status = "running";

    // Update state - execution started
    const projectName = projectPath.split("/").pop() || "unknown";
    try {
      const feature = await kanbanService.getFeature(featureId);
      StateService.setExecutionMode(
        projectName,
        "running",
        featureId,
        feature?.title,
        1,
      );
    } catch (e) {
      console.error(`Failed to update state for execution start:`, e);
    }

    // Track completed tasks for dependency resolution
    const completedTasks = new Set<string>();

    try {
      // Execute phases sequentially, tasks within phase in parallel
      for (const phaseExec of execution.phases) {
        phaseExec.status = "running";
        phaseExec.startedAt = new Date().toISOString();

        // Spawn all tasks in this phase in parallel (up to max)
        const taskPromises: Promise<void>[] = [];
        let activeCount = 0;

        for (const taskExec of phaseExec.tasks) {
          const task = tasks.find((t) => t.id === taskExec.taskId);
          if (!task) continue;

          // Check dependencies are met
          if (!canExecuteTask(task, completedTasks)) {
            taskExec.status = "pending";
            taskExec.error = "Dependencies not met";
            continue;
          }

          // Respect max parallel sessions
          while (activeCount >= maxParallelSessions) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            activeCount = phaseExec.tasks.filter(
              (t) => t.status === "running" || t.status === "spawning",
            ).length;
          }

          activeCount++;
          taskExec.status = "spawning";
          taskExec.startedAt = new Date().toISOString();

          const taskPromise = this.executeTask(projectPath, task, taskExec, {
            dangerouslySkipPermissions,
            timeoutMs: taskTimeoutMs,
          }).then(() => {
            if (taskExec.status === "completed") {
              completedTasks.add(task.id);
              execution.tasksCompleted++;
            } else if (taskExec.status === "failed") {
              execution.tasksFailed++;
            }
          });

          taskPromises.push(taskPromise);
        }

        // Wait for all tasks in this phase to complete
        await Promise.all(taskPromises);

        // Update phase status
        const allCompleted = phaseExec.tasks.every(
          (t) => t.status === "completed",
        );
        const anyFailed = phaseExec.tasks.some((t) => t.status === "failed");

        if (allCompleted) {
          phaseExec.status = "completed";
        } else if (anyFailed) {
          phaseExec.status = "failed";
        }

        phaseExec.completedAt = new Date().toISOString();
      }

      // Determine overall status
      const allPhasesCompleted = execution.phases.every(
        (p) => p.status === "completed",
      );
      const anyPhaseFailed = execution.phases.some(
        (p) => p.status === "failed",
      );

      if (allPhasesCompleted) {
        execution.status = "completed";
      } else if (anyPhaseFailed && execution.tasksCompleted > 0) {
        execution.status = "partial";
      } else if (anyPhaseFailed) {
        execution.status = "failed";
      }

      execution.completedAt = new Date().toISOString();

      // Update state - execution completed
      try {
        StateService.setExecutionMode(projectName, "idle");
      } catch (e) {
        console.error(`Failed to update state for execution end:`, e);
      }
    } catch (error) {
      execution.status = "failed";
      execution.completedAt = new Date().toISOString();
      console.error(`Feature execution failed for ${featureId}:`, error);

      // Update state - execution failed
      try {
        StateService.setExecutionMode(projectName, "idle");
      } catch (e) {
        console.error(`Failed to update state for execution end:`, e);
      }
    }

    return execution;
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    projectPath: string,
    task: Task,
    taskExec: TaskExecution,
    options: { dangerouslySkipPermissions: boolean; timeoutMs: number },
  ): Promise<void> {
    const { dangerouslySkipPermissions, timeoutMs } = options;

    // Build task instructions
    const instructions = this.buildTaskInstructions(task);

    // Spawn the session
    const result: SpawnResult = await sessionSpawner.spawnAgentSession(
      projectPath,
      task.id,
      task.agent,
      instructions,
      { dangerouslySkipPermissions },
    );

    if (!result.success || !result.sessionInfo) {
      taskExec.status = "failed";
      taskExec.error = result.error || "Failed to spawn session";
      return;
    }

    taskExec.sessionId = result.sessionInfo.sessionId;
    taskExec.pid = result.sessionInfo.pid;
    taskExec.status = "running";

    // Update task status in kanban
    try {
      await kanbanService.updateTaskStatus(task.id, "in_progress");
    } catch (e) {
      console.error(`Failed to update task status for ${task.id}:`, e);
    }

    // Update state - agent started work
    try {
      const projectName = projectPath.split("/").pop() || "unknown";
      StateService.agentStartWork(projectName, task.agent, task.id);
    } catch (e) {
      console.error(`Failed to update state for ${task.id}:`, e);
    }

    // Wait for completion with timeout
    const waitResult = await sessionSpawner.waitForSession(
      result.sessionInfo.sessionId,
      timeoutMs,
    );

    taskExec.completedAt = new Date().toISOString();

    const projectName = projectPath.split("/").pop() || "unknown";

    if (waitResult.completed && waitResult.status === "completed") {
      taskExec.status = "completed";
      // Update task status in kanban
      try {
        await kanbanService.updateTaskStatus(task.id, "completed");
      } catch (e) {
        console.error(`Failed to update task status for ${task.id}:`, e);
      }
      // Update state - agent completed work
      try {
        StateService.agentCompleteWork(
          projectName,
          task.agent,
          task.id,
          `Completed ${task.title}`,
        );
      } catch (e) {
        console.error(`Failed to update state for ${task.id}:`, e);
      }
    } else {
      taskExec.status = "failed";
      taskExec.error = `Session ended with status: ${waitResult.status}`;
      // Update state - agent work failed
      try {
        StateService.agentCompleteWork(
          projectName,
          task.agent,
          task.id,
          `Failed: ${waitResult.status}`,
        );
      } catch (e) {
        console.error(`Failed to update state for ${task.id}:`, e);
      }
    }
  }

  /**
   * Build instructions for a task
   */
  private buildTaskInstructions(task: Task): string {
    const parts: string[] = [];

    // Add agent context
    parts.push(`You are the ${task.agent} agent executing task ${task.id}.`);
    parts.push("");

    // Add task title and ID
    parts.push(`## Task: ${task.title}`);
    parts.push(`**ID:** ${task.id}`);
    parts.push(`**Priority:** ${task.priority}`);
    parts.push(`**Phase:** ${task.phase}`);
    parts.push("");

    // Add main instructions
    if (task.instructions) {
      parts.push("## Instructions");
      parts.push(task.instructions);
      parts.push("");
    }

    // Add file context if present
    if (task.files) {
      parts.push("## Files to modify");
      if (Array.isArray(task.files)) {
        for (const file of task.files) {
          parts.push(`- ${file}`);
        }
      } else {
        if (task.files.create) {
          parts.push("**Create:**");
          for (const file of task.files.create) {
            parts.push(`- ${file}`);
          }
        }
        if (task.files.modify) {
          parts.push("**Modify:**");
          for (const file of task.files.modify) {
            parts.push(`- ${file}`);
          }
        }
      }
      parts.push("");
    }

    // Add QA checklist if present
    if (task.qa && task.qa.checklist && task.qa.checklist.length > 0) {
      parts.push("## Success Criteria");
      for (const item of task.qa.checklist) {
        const text = typeof item === "string" ? item : item.item;
        parts.push(`- [ ] ${text}`);
      }
      parts.push("");
    }

    // Add dependency context
    if (task.depends_on && task.depends_on.length > 0) {
      parts.push(
        `**Note:** This task depends on: ${task.depends_on.join(", ")}`,
      );
      parts.push("Ensure those tasks are complete before proceeding.");
      parts.push("");
    }

    // Add completion instruction
    parts.push("---");
    parts.push(
      "When complete, ensure all success criteria are met and files are properly saved.",
    );

    return parts.join("\n");
  }

  /**
   * Get execution status for a feature
   */
  getExecution(featureId: string): FeatureExecution | undefined {
    return this.activeExecutions.get(featureId);
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): FeatureExecution[] {
    return Array.from(this.activeExecutions.values()).filter(
      (e) => e.status === "running",
    );
  }

  /**
   * Cancel an execution
   */
  async cancelExecution(featureId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(featureId);
    if (!execution) return false;

    // Kill all running sessions
    for (const phase of execution.phases) {
      for (const task of phase.tasks) {
        if (task.sessionId && task.status === "running") {
          await sessionSpawner.killSession(task.sessionId);
          task.status = "failed";
          task.error = "Cancelled by user";
        }
      }
    }

    execution.status = "failed";
    execution.completedAt = new Date().toISOString();

    return true;
  }

  /**
   * Analyze tasks and return execution plan without running
   */
  async analyzeFeature(
    featureId: string,
    tasks: Task[],
    options: ExecuteOptions = {},
  ): Promise<{
    phases: Array<{
      phase: number;
      tasks: Array<{
        id: string;
        agent: AgentType;
        title: string;
        dependsOn: string[];
        canExecute: boolean;
      }>;
      canRunParallel: boolean;
    }>;
    totalTasks: number;
    estimatedMinutes: number;
  }> {
    const { filterAgents, filterPhases } = options;

    let filteredTasks = tasks.filter(
      (t) => t.status === "pending" || t.status === "in_progress",
    );

    if (filterAgents && filterAgents.length > 0) {
      filteredTasks = filteredTasks.filter((t) =>
        filterAgents.includes(t.agent),
      );
    }

    if (filterPhases && filterPhases.length > 0) {
      filteredTasks = filteredTasks.filter((t) =>
        filterPhases.includes(t.phase),
      );
    }

    const phaseGroups = getExecutablePhases(filteredTasks);
    const completedTasks = new Set<string>();

    const phases = [];
    let totalEstimated = 0;

    for (const [phaseNum, phaseTasks] of phaseGroups) {
      const phaseTotalMinutes = phaseTasks.reduce(
        (sum, t) => sum + (t.estimated_minutes || 10),
        0,
      );
      // Parallel execution means we take the max, not sum
      const maxMinutes = Math.max(
        ...phaseTasks.map((t) => t.estimated_minutes || 10),
      );

      phases.push({
        phase: phaseNum,
        tasks: phaseTasks.map((t) => ({
          id: t.id,
          agent: t.agent,
          title: t.title,
          dependsOn: t.depends_on || [],
          canExecute: canExecuteTask(t, completedTasks),
        })),
        canRunParallel: phaseTasks.every((t) =>
          canExecuteTask(t, completedTasks),
        ),
      });

      // Assume tasks in a phase run in parallel
      totalEstimated += maxMinutes;

      // Mark phase tasks as "completed" for next phase dependency check
      for (const t of phaseTasks) {
        completedTasks.add(t.id);
      }
    }

    return {
      phases,
      totalTasks: filteredTasks.length,
      estimatedMinutes: totalEstimated,
    };
  }
}

// Export singleton instance
export const orchestrator = new OrchestratorService();
