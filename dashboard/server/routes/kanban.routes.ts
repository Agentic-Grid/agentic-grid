/**
 * Kanban API Routes
 * REST endpoints for task/feature/project management
 */

import { Router, Request, Response } from "express";
import { kanbanService } from "../services/kanban.service.js";
import type {
  TaskStatus,
  UpdateTaskStatusRequest,
  MoveTaskRequest,
} from "../types/kanban.types.js";

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

export default router;
