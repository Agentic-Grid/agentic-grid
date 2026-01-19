/**
 * Kanban API Routes
 * REST endpoints for task/feature/project management
 */

import { Router, Request, Response } from "express";
import { kanbanService } from "../services/kanban.service.js";
import { sessionSpawner } from "../services/session-spawner.service.js";
import { OnboardService } from "../services/onboard.service.js";
import { StateService } from "../services/state.service.js";
import type {
  TaskStatus,
  UpdateTaskStatusRequest,
  MoveTaskRequest,
  Task,
  TaskContext,
} from "../types/kanban.types.js";
import { join } from "path";

const router = Router();

// =============================================================================
// ERROR HANDLING
// =============================================================================

interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const error: ApiError = { error: message, code };
  if (details !== undefined) {
    error.details = details;
  }
  res.status(status).json(error);
}

// Valid task statuses for validation
const VALID_TASK_STATUSES: TaskStatus[] = [
  "pending",
  "in_progress",
  "blocked",
  "qa",
  "completed",
];

function isValidTaskStatus(status: unknown): status is TaskStatus {
  return (
    typeof status === "string" &&
    VALID_TASK_STATUSES.includes(status as TaskStatus)
  );
}

// =============================================================================
// PROJECT ROUTES
// =============================================================================

/**
 * GET /api/kanban/projects
 * List all projects
 */
router.get("/projects", async (_req: Request, res: Response) => {
  try {
    const projects = await kanbanService.listProjects();
    res.json({ data: projects });
  } catch (error) {
    console.error("Error listing projects:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list projects");
  }
});

/**
 * GET /api/kanban/projects/:id
 * Get a single project by ID or name
 */
router.get("/projects/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await kanbanService.getProject(id);

    if (!project) {
      sendError(res, 404, "NOT_FOUND", `Project not found: ${id}`);
      return;
    }

    res.json({ data: project });
  } catch (error) {
    console.error("Error getting project:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get project");
  }
});

// =============================================================================
// ONBOARDING ROUTES
// =============================================================================

/**
 * GET /api/kanban/projects/:name/onboard
 * Get the onboarding state for a project
 */
router.get("/projects/:name/onboard", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const state = OnboardService.getState(name);
    res.json({ data: state });
  } catch (error) {
    console.error("Error getting onboard state:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get onboard state");
  }
});

/**
 * POST /api/kanban/projects/:name/onboard/init
 * Initialize onboarding for a project (create QUESTIONS.yaml)
 */
router.post(
  "/projects/:name/onboard/init",
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const state = OnboardService.initialize(name);

      if (state.status === "error") {
        sendError(
          res,
          400,
          "INIT_ERROR",
          state.error || "Failed to initialize",
        );
        return;
      }

      res.json({ data: state });
    } catch (error) {
      console.error("Error initializing onboard:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to initialize onboarding");
    }
  },
);

/**
 * POST /api/kanban/projects/:name/onboard/answers
 * Save answers to QUESTIONS.yaml
 */
router.post(
  "/projects/:name/onboard/answers",
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const { answers } = req.body;

      if (!answers || typeof answers !== "object") {
        sendError(res, 400, "VALIDATION_ERROR", "answers object is required");
        return;
      }

      const state = OnboardService.saveAnswers(name, answers);

      if (state.status === "error") {
        sendError(
          res,
          400,
          "SAVE_ERROR",
          state.error || "Failed to save answers",
        );
        return;
      }

      res.json({ data: state });
    } catch (error) {
      console.error("Error saving answers:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to save answers");
    }
  },
);

/**
 * GET /api/kanban/projects/:name/onboard/pending
 * Get questions that still need answers
 */
router.get(
  "/projects/:name/onboard/pending",
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const pending = OnboardService.getPendingQuestions(name);
      res.json({ data: pending });
    } catch (error) {
      console.error("Error getting pending questions:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to get pending questions");
    }
  },
);

/**
 * POST /api/kanban/projects/:name/onboard/start
 * Start the Claude /onboard session after questions are complete
 */
router.post(
  "/projects/:name/onboard/start",
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const { skipPermissions = false } = req.body;

      // Check if onboarding is complete
      if (!OnboardService.isComplete(name)) {
        const pending = OnboardService.getPendingQuestions(name);
        sendError(
          res,
          400,
          "INCOMPLETE",
          `Onboarding not complete. ${pending.length} questions remaining.`,
          { pending: pending.map((q) => q.id) },
        );
        return;
      }

      // Build the project path
      const PROJECT_ROOT = join(import.meta.dirname, "..", "..", "..");
      const projectPath = join(PROJECT_ROOT, "sandbox", name);

      // Spawn Claude with /onboard command
      const result = await sessionSpawner.spawnAgentSession(
        projectPath,
        "onboard",
        "DISCOVERY",
        "/onboard\n\nProcess the completed QUESTIONS.yaml and generate the full project plan including PROJECT.md, features, and tasks with optimized context.",
        {
          dangerouslySkipPermissions: skipPermissions,
          sessionName: `Onboard: ${name}`,
        },
      );

      if (!result.success) {
        sendError(
          res,
          500,
          "SPAWN_FAILED",
          result.error || "Failed to spawn onboard session",
        );
        return;
      }

      res.json({
        data: {
          success: true,
          sessionId: result.sessionInfo?.sessionId,
          pid: result.sessionInfo?.pid,
          projectName: name,
        },
      });
    } catch (error) {
      console.error("Error starting onboard session:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to start onboard session");
    }
  },
);

// =============================================================================
// FEATURE ROUTES
// =============================================================================

/**
 * GET /api/kanban/features
 * List all features, optionally filtered by project
 */
router.get("/features", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const features = await kanbanService.listFeatures(projectId);
    res.json({ data: features });
  } catch (error) {
    console.error("Error listing features:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list features");
  }
});

/**
 * GET /api/kanban/features/:id
 * Get a single feature by ID
 */
router.get("/features/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const feature = await kanbanService.getFeature(id);

    if (!feature) {
      sendError(res, 404, "NOT_FOUND", `Feature not found: ${id}`);
      return;
    }

    res.json({ data: feature });
  } catch (error) {
    console.error("Error getting feature:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get feature");
  }
});

/**
 * GET /api/kanban/features/:id/tasks
 * List all tasks for a feature
 */
router.get("/features/:id/tasks", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // First check if feature exists
    const feature = await kanbanService.getFeature(id);
    if (!feature) {
      sendError(res, 404, "NOT_FOUND", `Feature not found: ${id}`);
      return;
    }

    const tasks = await kanbanService.listTasks(id);
    res.json({ data: tasks });
  } catch (error) {
    console.error("Error listing tasks:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list tasks");
  }
});

// =============================================================================
// TASK ROUTES
// =============================================================================

/**
 * GET /api/kanban/tasks/:id
 * Get a single task by ID
 */
router.get("/tasks/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const task = await kanbanService.getTask(id);

    if (!task) {
      sendError(res, 404, "NOT_FOUND", `Task not found: ${id}`);
      return;
    }

    res.json({ data: task });
  } catch (error) {
    console.error("Error getting task:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get task");
  }
});

/**
 * PUT /api/kanban/tasks/:id/status
 * Update a task's status
 */
router.put("/tasks/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as UpdateTaskStatusRequest;

    // Validate status
    if (!status) {
      sendError(res, 400, "VALIDATION_ERROR", "status is required");
      return;
    }

    if (!isValidTaskStatus(status)) {
      sendError(res, 400, "VALIDATION_ERROR", `Invalid status: ${status}`, {
        validStatuses: VALID_TASK_STATUSES,
      });
      return;
    }

    // Check task exists
    const existingTask = await kanbanService.getTask(id);
    if (!existingTask) {
      sendError(res, 404, "NOT_FOUND", `Task not found: ${id}`);
      return;
    }

    // Update status
    const task = await kanbanService.updateTaskStatus(id, status);
    res.json({ data: task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Check for invalid transition error
    if (message.includes("Invalid status transition")) {
      sendError(res, 400, "INVALID_TRANSITION", message);
      return;
    }

    console.error("Error updating task status:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update task status");
  }
});

/**
 * PUT /api/kanban/tasks/:id/move
 * Move a task to a new column (Kanban drag-and-drop)
 */
router.put("/tasks/:id/move", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { column, order } = req.body as MoveTaskRequest;

    // Validate column
    if (!column) {
      sendError(res, 400, "VALIDATION_ERROR", "column is required");
      return;
    }

    if (!isValidTaskStatus(column)) {
      sendError(res, 400, "VALIDATION_ERROR", `Invalid column: ${column}`, {
        validColumns: VALID_TASK_STATUSES,
      });
      return;
    }

    // Check task exists
    const existingTask = await kanbanService.getTask(id);
    if (!existingTask) {
      sendError(res, 404, "NOT_FOUND", `Task not found: ${id}`);
      return;
    }

    // Move task
    const task = await kanbanService.moveTask(id, column, order);
    res.json({ data: task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Check for invalid transition error
    if (message.includes("Invalid status transition")) {
      sendError(res, 400, "INVALID_TRANSITION", message);
      return;
    }

    console.error("Error moving task:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to move task");
  }
});

// =============================================================================
// INDEX ROUTES
// =============================================================================

/**
 * GET /api/kanban/index/features
 * Get the feature index for a project
 */
router.get("/index/features", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;

    if (!projectId) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "projectId query parameter is required",
      );
      return;
    }

    const index = await kanbanService.getFeatureIndex(projectId);

    if (!index) {
      sendError(
        res,
        404,
        "NOT_FOUND",
        `Feature index not found for project: ${projectId}`,
      );
      return;
    }

    res.json({ data: index });
  } catch (error) {
    console.error("Error getting feature index:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get feature index");
  }
});

/**
 * GET /api/kanban/index/:featureId
 * Get the task index for a feature
 */
router.get("/index/:featureId", async (req: Request, res: Response) => {
  try {
    const { featureId } = req.params;
    const index = await kanbanService.getTaskIndex(featureId);

    if (!index) {
      sendError(
        res,
        404,
        "NOT_FOUND",
        `Task index not found for feature: ${featureId}`,
      );
      return;
    }

    res.json({ data: index });
  } catch (error) {
    console.error("Error getting task index:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get task index");
  }
});

/**
 * POST /api/kanban/index/regenerate
 * Regenerate indexes for a feature
 */
router.post("/index/regenerate", async (req: Request, res: Response) => {
  try {
    const { featureId } = req.body;

    if (!featureId) {
      sendError(res, 400, "VALIDATION_ERROR", "featureId is required");
      return;
    }

    await kanbanService.regenerateIndexes(featureId);
    res.json({ data: { success: true, featureId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Feature not found")) {
      sendError(res, 404, "NOT_FOUND", message);
      return;
    }

    console.error("Error regenerating indexes:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to regenerate indexes");
  }
});

// =============================================================================
// CREATE ROUTES (for auto-documenting work)
// =============================================================================

/**
 * POST /api/kanban/features
 * Create a new feature
 */
router.post("/features", async (req: Request, res: Response) => {
  try {
    const { projectName, title, description, type, priority, source } =
      req.body;

    if (!projectName) {
      sendError(res, 400, "VALIDATION_ERROR", "projectName is required");
      return;
    }

    if (!title) {
      sendError(res, 400, "VALIDATION_ERROR", "title is required");
      return;
    }

    const feature = await kanbanService.createFeature(projectName, {
      id: `FEAT-${Date.now().toString(36).toUpperCase()}`,
      title,
      description: description || title,
      type: type || "feature",
      priority: priority || "medium",
      source: source || "user_request",
    });

    res.status(201).json({ data: feature });
  } catch (error) {
    console.error("Error creating feature:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create feature");
  }
});

/**
 * POST /api/kanban/features/:id/tasks
 * Create a new task within a feature
 */
router.post("/features/:id/tasks", async (req: Request, res: Response) => {
  try {
    const { id: featureId } = req.params;
    const {
      title,
      agent,
      type,
      priority,
      phase,
      instructions,
      files,
      contracts,
      depends_on,
      source,
    } = req.body;

    if (!title) {
      sendError(res, 400, "VALIDATION_ERROR", "title is required");
      return;
    }

    if (!agent) {
      sendError(res, 400, "VALIDATION_ERROR", "agent is required");
      return;
    }

    if (!instructions) {
      sendError(res, 400, "VALIDATION_ERROR", "instructions is required");
      return;
    }

    const task = await kanbanService.createTask(featureId, {
      title,
      agent,
      type: type || "implementation",
      priority: priority || "medium",
      phase: phase || 1,
      instructions,
      files: files || [],
      contracts: contracts || [],
      depends_on: depends_on || [],
      source: source || "user_request",
    });

    res.status(201).json({ data: task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Feature not found")) {
      sendError(res, 404, "NOT_FOUND", message);
      return;
    }

    console.error("Error creating task:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create task");
  }
});

/**
 * POST /api/kanban/work-items
 * Quick endpoint to create a feature + task in one call
 * Used by Claude Code to auto-document work requests
 */
router.post("/work-items", async (req: Request, res: Response) => {
  try {
    const {
      projectName,
      title,
      description,
      type,
      agent,
      instructions,
      priority,
      files,
    } = req.body;

    if (!projectName) {
      sendError(res, 400, "VALIDATION_ERROR", "projectName is required");
      return;
    }

    if (!title) {
      sendError(res, 400, "VALIDATION_ERROR", "title is required");
      return;
    }

    if (!agent) {
      sendError(res, 400, "VALIDATION_ERROR", "agent is required");
      return;
    }

    if (!instructions) {
      sendError(res, 400, "VALIDATION_ERROR", "instructions is required");
      return;
    }

    const result = await kanbanService.createWorkItem(projectName, {
      title,
      description: description || title,
      type: type || "feature",
      agent,
      instructions,
      priority: priority || "medium",
      files: files || [],
    });

    res.status(201).json({ data: result });
  } catch (error) {
    console.error("Error creating work item:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create work item");
  }
});

// =============================================================================
// DASHBOARD & LOCKS ROUTES
// =============================================================================

/**
 * GET /api/kanban/dashboard
 * Get aggregated dashboard data
 */
router.get("/dashboard", async (_req: Request, res: Response) => {
  try {
    const dashboard = await kanbanService.getDashboard();

    if (!dashboard) {
      // Return empty dashboard structure if file doesn't exist
      res.json({
        data: {
          version: "1.0",
          updated_at: new Date().toISOString(),
          totals: {
            projects: 0,
            projects_active: 0,
            projects_paused: 0,
            features: 0,
            features_in_progress: 0,
            tasks_total: 0,
            tasks_pending: 0,
            tasks_in_progress: 0,
            tasks_blocked: 0,
            tasks_qa: 0,
            tasks_completed: 0,
          },
          agents_active: [],
          recent_activity: [],
        },
      });
      return;
    }

    res.json({ data: dashboard });
  } catch (error) {
    console.error("Error getting dashboard:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get dashboard");
  }
});

/**
 * GET /api/kanban/locks
 * Get current file locks
 */
router.get("/locks", async (_req: Request, res: Response) => {
  try {
    const locks = await kanbanService.getLocks();

    if (!locks) {
      // Return empty locks structure if file doesn't exist
      res.json({
        data: {
          version: "1.0",
          updated_at: new Date().toISOString(),
          locks: [],
        },
      });
      return;
    }

    res.json({ data: locks });
  } catch (error) {
    console.error("Error getting locks:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get locks");
  }
});

// =============================================================================
// TASK EXECUTION ROUTES
// =============================================================================

/**
 * POST /api/kanban/tasks/:id/start
 * Start a Claude session to work on a task
 * Spawns a new Claude Code session with task context and instructions
 */
router.post("/tasks/:id/start", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { skipPermissions = false } = req.body;

    // Get the task
    const task = await kanbanService.getTask(id);
    if (!task) {
      sendError(res, 404, "NOT_FOUND", `Task not found: ${id}`);
      return;
    }

    // Get the feature to find project context
    const feature = await kanbanService.getFeature(task.feature_id);
    if (!feature) {
      sendError(res, 404, "NOT_FOUND", `Feature not found: ${task.feature_id}`);
      return;
    }

    // Find the project path from the feature
    // The feature.project_id is set when listing features across projects
    const projectId = feature.project_id;
    if (!projectId) {
      sendError(
        res,
        400,
        "MISSING_PROJECT",
        "Feature does not have a project_id. Cannot determine project path.",
      );
      return;
    }

    // Build the project path
    const PROJECT_ROOT = join(import.meta.dirname, "..", "..", "..");
    const projectPath = join(PROJECT_ROOT, "sandbox", projectId);

    // Build the prompt for Claude with task context
    const agentPrompt = buildTaskPrompt(task, feature, projectId);

    // Spawn the session
    const result = await sessionSpawner.spawnAgentSession(
      projectPath,
      task.id,
      task.agent,
      agentPrompt,
      {
        dangerouslySkipPermissions: skipPermissions,
        sessionName: `${task.agent}: ${task.title}`,
      },
    );

    if (!result.success) {
      sendError(
        res,
        500,
        "SPAWN_FAILED",
        result.error || "Failed to spawn session",
      );
      return;
    }

    // Update task status to in_progress
    try {
      await kanbanService.updateTaskStatus(id, "in_progress");
    } catch {
      // Task might already be in_progress, that's okay
    }

    res.json({
      data: {
        success: true,
        sessionId: result.sessionInfo?.sessionId,
        pid: result.sessionInfo?.pid,
        taskId: task.id,
        agent: task.agent,
        projectPath,
      },
    });
  } catch (error) {
    console.error("Error starting task:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to start task");
  }
});

/**
 * Build a prompt for Claude to work on a specific task
 * Uses optimized context if available, falls back to legacy format
 */
function buildTaskPrompt(
  task: Task,
  feature: {
    id: string;
    title: string;
    description: string;
    summary?: string;
  },
  projectId: string,
): string {
  // If task has optimized context, use it
  if (task.context) {
    return buildOptimizedPrompt(task, task.context);
  }

  // Legacy fallback for tasks without optimized context
  const filesList = Array.isArray(task.files)
    ? task.files.join(", ")
    : [...(task.files?.create || []), ...(task.files?.modify || [])].join(", ");

  const contractsList = Array.isArray(task.contracts)
    ? task.contracts.map((c) => (typeof c === "string" ? c : c.path)).join(", ")
    : "";

  return `You are the ${task.agent} agent working on task ${task.id} for project "${projectId}".

## Feature Context
- Feature: ${feature.id} - ${feature.title}
- Description: ${feature.summary || feature.description}

## Task Details
- Task ID: ${task.id}
- Title: ${task.title}
- Priority: ${task.priority}
- Phase: ${task.phase}
${task.depends_on.length > 0 ? `- Dependencies: ${task.depends_on.join(", ")}` : ""}
${filesList ? `- Files to work on: ${filesList}` : ""}
${contractsList ? `- Related contracts: ${contractsList}` : ""}

## Instructions
${task.instructions || "Complete the task as described."}

## Guidelines
1. Read relevant contracts and existing code before making changes
2. Follow the project's coding patterns and conventions
3. Update task status when you complete the work
4. If blocked, explain what's blocking you
5. Focus only on this specific task - don't expand scope

Start working on this task now.`;
}

/**
 * Build optimized prompt using the new context structure
 * Total: ~400 tokens instead of 2000+
 */
function buildOptimizedPrompt(task: Task, context: TaskContext): string {
  const { project, feature, task: taskDetails } = context;

  // Build files list
  const files = taskDetails.files;
  const filesList = [
    ...(files.create || []).map((f) => `+ ${f}`),
    ...(files.modify || []).map((f) => `~ ${f}`),
  ].join("\n    ");

  // Build contracts list
  const contractsList =
    taskDetails.contracts
      ?.map((c) => `- ${c.path}${c.section ? `#${c.section}` : ""}`)
      .join("\n    ") || "";

  // Build dependencies list
  const depsList =
    taskDetails.depends_on_completed
      ?.map((d) => `- ${d.id}: ${d.summary} ✓`)
      .join("\n") || "";

  // Build expected results
  const expectedResults =
    task.expected_results?.map((r) => `- ${r.test}`).join("\n") || "";

  return `# Task: ${task.id} - ${task.title}

## Project Context
${project}

## Feature Context
${feature}

## Your Task
**Objective:** ${taskDetails.objective}

**Requirements:**
${taskDetails.requirements.map((r) => `- ${r}`).join("\n")}

**Files:**
    ${filesList || "No specific files listed"}

${contractsList ? `**Reference contracts:**\n    ${contractsList}` : ""}

${depsList ? `**Completed dependencies:**\n${depsList}` : ""}

${
  expectedResults
    ? `## Expected Results
When complete, the following should be true:
${expectedResults}`
    : ""
}

---
When finished, update task status and provide summary of changes.`;
}

// =============================================================================
// STATE ROUTES - Single Source of Truth for Agent Synchronization
// =============================================================================

/**
 * GET /api/kanban/projects/:name/state
 * Get the current project state (what's happening, who's working on what)
 */
router.get("/projects/:name/state", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const state = StateService.load(name);
    res.json({ data: state });
  } catch (error) {
    console.error("Error getting project state:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get project state");
  }
});

/**
 * GET /api/kanban/projects/:name/state/summary
 * Get a human-readable summary of project state (for agents)
 */
router.get(
  "/projects/:name/state/summary",
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const summary = StateService.getSummary(name);
      res.json({ data: summary });
    } catch (error) {
      console.error("Error getting state summary:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to get state summary");
    }
  },
);

/**
 * POST /api/kanban/projects/:name/state/agent-start
 * Called when an agent starts working on a task
 */
router.post(
  "/projects/:name/state/agent-start",
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const { agent, taskId } = req.body;

      if (!agent || !taskId) {
        sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "agent and taskId are required",
        );
        return;
      }

      const state = StateService.agentStartWork(name, agent, taskId);
      res.json({ data: state });
    } catch (error) {
      console.error("Error updating agent state:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to update agent state");
    }
  },
);

/**
 * POST /api/kanban/projects/:name/state/agent-complete
 * Called when an agent completes a task
 */
router.post(
  "/projects/:name/state/agent-complete",
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const { agent, taskId, note } = req.body;

      if (!agent || !taskId) {
        sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "agent and taskId are required",
        );
        return;
      }

      const state = StateService.agentCompleteWork(name, agent, taskId, note);
      res.json({ data: state });
    } catch (error) {
      console.error("Error updating agent state:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to update agent state");
    }
  },
);

/**
 * POST /api/kanban/projects/:name/state/agent-blocked
 * Called when an agent is blocked
 */
router.post(
  "/projects/:name/state/agent-blocked",
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const { agent, taskId, blockedByTask, reason } = req.body;

      if (!agent || !taskId || !blockedByTask || !reason) {
        sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "agent, taskId, blockedByTask, and reason are required",
        );
        return;
      }

      const state = StateService.agentBlocked(
        name,
        agent,
        taskId,
        blockedByTask,
        reason,
      );
      res.json({ data: state });
    } catch (error) {
      console.error("Error updating agent state:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to update agent state");
    }
  },
);

/**
 * POST /api/kanban/projects/:name/state/sync-progress
 * Sync progress metrics from current task states
 */
router.post(
  "/projects/:name/state/sync-progress",
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;

      // Get all features and count task statuses
      const features = await kanbanService.listFeatures(name);
      let tasksTotal = 0;
      let tasksPending = 0;
      let tasksInProgress = 0;
      let tasksBlocked = 0;
      let tasksQa = 0;
      let tasksCompleted = 0;
      let featuresCompleted = 0;
      let featuresInProgress = 0;

      for (const feature of features) {
        const tasks = await kanbanService.listTasks(feature.id);
        tasksTotal += tasks.length;

        for (const task of tasks) {
          switch (task.status) {
            case "pending":
              tasksPending++;
              break;
            case "in_progress":
              tasksInProgress++;
              break;
            case "blocked":
              tasksBlocked++;
              break;
            case "qa":
              tasksQa++;
              break;
            case "completed":
              tasksCompleted++;
              break;
          }
        }

        if (feature.status === "completed") {
          featuresCompleted++;
        } else if (feature.status === "in_progress") {
          featuresInProgress++;
        }
      }

      const state = StateService.syncProgress(name, {
        features_total: features.length,
        features_completed: featuresCompleted,
        features_in_progress: featuresInProgress,
        tasks_total: tasksTotal,
        tasks_pending: tasksPending,
        tasks_in_progress: tasksInProgress,
        tasks_blocked: tasksBlocked,
        tasks_qa: tasksQa,
        tasks_completed: tasksCompleted,
      });

      res.json({ data: state });
    } catch (error) {
      console.error("Error syncing progress:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to sync progress");
    }
  },
);

export default router;
