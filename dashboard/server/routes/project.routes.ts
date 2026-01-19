/**
 * Project API Routes
 * REST endpoints for project creation and task management in sandbox
 */

import { Router, Request, Response } from "express";
import { projectService, ProjectError } from "../services/project.service.js";
import {
  yamlTaskWriterService,
  TaskWriterError,
} from "../services/yaml-task-writer.service.js";
import type {
  AgentType,
  TaskStatus,
  TaskPriority,
  TaskType,
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

// Valid values for validation
const VALID_AGENTS: AgentType[] = [
  "DISCOVERY",
  "DESIGNER",
  "DATA",
  "BACKEND",
  "FRONTEND",
  "DEVOPS",
  "QA",
];

const VALID_TASK_STATUSES: TaskStatus[] = [
  "pending",
  "in_progress",
  "blocked",
  "qa",
  "completed",
];

const VALID_PRIORITIES: TaskPriority[] = ["high", "medium", "low"];

const VALID_TASK_TYPES: TaskType[] = [
  "enhancement",
  "design",
  "schema",
  "implementation",
  "automation",
  "validation",
];

function isValidAgent(agent: unknown): agent is AgentType {
  return typeof agent === "string" && VALID_AGENTS.includes(agent as AgentType);
}

function isValidTaskStatus(status: unknown): status is TaskStatus {
  return (
    typeof status === "string" &&
    VALID_TASK_STATUSES.includes(status as TaskStatus)
  );
}

function isValidPriority(priority: unknown): priority is TaskPriority {
  return (
    typeof priority === "string" &&
    VALID_PRIORITIES.includes(priority as TaskPriority)
  );
}

function isValidTaskType(type: unknown): type is TaskType {
  return (
    typeof type === "string" && VALID_TASK_TYPES.includes(type as TaskType)
  );
}

// =============================================================================
// PROJECT ROUTES
// =============================================================================

/**
 * POST /api/projects/validate-name
 * Validate a project name before creation
 * Checks: format, sandbox existence, GitHub repo existence
 */
router.post("/validate-name", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "name is required and must be a string",
      );
      return;
    }

    const result = await projectService.validateProjectNameAvailability(name);

    res.json({
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error validating project name:", message);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to validate project name");
  }
});

/**
 * POST /api/projects/create
 * Create a new project in the sandbox directory
 */
router.post("/create", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "name is required and must be a string",
      );
      return;
    }

    const project = await projectService.createProject(name);

    res.status(201).json({
      data: {
        success: true,
        project,
        message: `Project '${name}' created successfully`,
      },
    });
  } catch (error) {
    if (error instanceof ProjectError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating project:", message);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create project");
  }
});

/**
 * GET /api/projects/sandbox
 * List all projects in the sandbox
 */
router.get("/sandbox", async (_req: Request, res: Response) => {
  try {
    const projects = await projectService.listProjects();
    res.json({ data: projects });
  } catch (error) {
    console.error("Error listing sandbox projects:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to list projects");
  }
});

/**
 * GET /api/projects/sandbox/:name
 * Get a single project from sandbox by name or ID
 */
router.get("/sandbox/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const project = await projectService.getProject(name);

    if (!project) {
      sendError(res, 404, "NOT_FOUND", `Project '${name}' not found`);
      return;
    }

    res.json({ data: project });
  } catch (error) {
    console.error("Error getting project:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get project");
  }
});

/**
 * GET /api/projects/sandbox/:name/exists
 * Check if a project exists
 */
router.get("/sandbox/:name/exists", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const exists = await projectService.projectExists(name);
    res.json({ data: { exists, name } });
  } catch (error) {
    console.error("Error checking project existence:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to check project");
  }
});

// =============================================================================
// TASK ROUTES
// =============================================================================

/**
 * POST /api/projects/:name/tasks
 * Create a new task in a project's feature
 */
router.post("/:name/tasks", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const {
      featureId,
      title,
      agent,
      type,
      priority,
      phase,
      instructions,
      files,
      contracts,
      depends_on,
      blocks,
      estimated_minutes,
    } = req.body;

    // Validation
    if (!featureId || typeof featureId !== "string") {
      sendError(res, 400, "VALIDATION_ERROR", "featureId is required");
      return;
    }

    if (!title || typeof title !== "string") {
      sendError(res, 400, "VALIDATION_ERROR", "title is required");
      return;
    }

    if (!agent) {
      sendError(res, 400, "VALIDATION_ERROR", "agent is required");
      return;
    }

    if (!isValidAgent(agent)) {
      sendError(res, 400, "VALIDATION_ERROR", `Invalid agent: ${agent}`, {
        validAgents: VALID_AGENTS,
      });
      return;
    }

    if (!instructions || typeof instructions !== "string") {
      sendError(res, 400, "VALIDATION_ERROR", "instructions is required");
      return;
    }

    // Optional field validation
    if (type !== undefined && !isValidTaskType(type)) {
      sendError(res, 400, "VALIDATION_ERROR", `Invalid type: ${type}`, {
        validTypes: VALID_TASK_TYPES,
      });
      return;
    }

    if (priority !== undefined && !isValidPriority(priority)) {
      sendError(res, 400, "VALIDATION_ERROR", `Invalid priority: ${priority}`, {
        validPriorities: VALID_PRIORITIES,
      });
      return;
    }

    // Check project exists
    const projectExists = await projectService.projectExists(name);
    if (!projectExists) {
      sendError(res, 404, "NOT_FOUND", `Project '${name}' not found`);
      return;
    }

    // Get project path
    const projectPath = `${projectService.getSandboxDir()}/${name}`;

    // Create task
    const task = await yamlTaskWriterService.writeTask(projectPath, featureId, {
      title,
      agent,
      type,
      priority,
      phase,
      instructions,
      files,
      contracts,
      depends_on,
      blocks,
      estimated_minutes,
    });

    res.status(201).json({ data: task });
  } catch (error) {
    if (error instanceof TaskWriterError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating task:", message);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to create task");
  }
});

/**
 * GET /api/projects/:name/tasks
 * Get all tasks for a feature in a project
 */
router.get("/:name/tasks", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const featureId = req.query.featureId as string;

    if (!featureId) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "featureId query parameter is required",
      );
      return;
    }

    // Check project exists
    const projectExists = await projectService.projectExists(name);
    if (!projectExists) {
      sendError(res, 404, "NOT_FOUND", `Project '${name}' not found`);
      return;
    }

    const projectPath = `${projectService.getSandboxDir()}/${name}`;
    const tasks = await yamlTaskWriterService.readTasks(projectPath, featureId);

    res.json({ data: tasks });
  } catch (error) {
    if (error instanceof TaskWriterError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error getting tasks:", message);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get tasks");
  }
});

/**
 * GET /api/projects/:name/tasks/:taskId
 * Get a single task by ID
 */
router.get("/:name/tasks/:taskId", async (req: Request, res: Response) => {
  try {
    const { name, taskId } = req.params;
    const featureId = req.query.featureId as string;

    if (!featureId) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        "featureId query parameter is required",
      );
      return;
    }

    const projectExists = await projectService.projectExists(name);
    if (!projectExists) {
      sendError(res, 404, "NOT_FOUND", `Project '${name}' not found`);
      return;
    }

    const projectPath = `${projectService.getSandboxDir()}/${name}`;
    const task = await yamlTaskWriterService.readTask(
      projectPath,
      featureId,
      taskId,
    );

    if (!task) {
      sendError(res, 404, "NOT_FOUND", `Task '${taskId}' not found`);
      return;
    }

    res.json({ data: task });
  } catch (error) {
    if (error instanceof TaskWriterError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    console.error("Error getting task:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to get task");
  }
});

/**
 * PUT /api/projects/:name/tasks/:taskId/status
 * Update a task's status
 */
router.put(
  "/:name/tasks/:taskId/status",
  async (req: Request, res: Response) => {
    try {
      const { name, taskId } = req.params;
      const { status, note } = req.body;

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

      const projectExists = await projectService.projectExists(name);
      if (!projectExists) {
        sendError(res, 404, "NOT_FOUND", `Project '${name}' not found`);
        return;
      }

      const projectPath = `${projectService.getSandboxDir()}/${name}`;
      const task = await yamlTaskWriterService.updateTaskStatus(
        projectPath,
        taskId,
        status,
        note,
      );

      res.json({ data: task });
    } catch (error) {
      if (error instanceof TaskWriterError) {
        sendError(res, error.statusCode, error.code, error.message);
        return;
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error updating task status:", message);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to update task status");
    }
  },
);

/**
 * PUT /api/projects/:name/tasks/:taskId
 * Update a task
 */
router.put("/:name/tasks/:taskId", async (req: Request, res: Response) => {
  try {
    const { name, taskId } = req.params;
    const { featureId, ...updates } = req.body;

    if (!featureId) {
      sendError(res, 400, "VALIDATION_ERROR", "featureId is required in body");
      return;
    }

    // Validate optional fields
    if (updates.status !== undefined && !isValidTaskStatus(updates.status)) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        `Invalid status: ${updates.status}`,
        {
          validStatuses: VALID_TASK_STATUSES,
        },
      );
      return;
    }

    if (updates.priority !== undefined && !isValidPriority(updates.priority)) {
      sendError(
        res,
        400,
        "VALIDATION_ERROR",
        `Invalid priority: ${updates.priority}`,
        {
          validPriorities: VALID_PRIORITIES,
        },
      );
      return;
    }

    const projectExists = await projectService.projectExists(name);
    if (!projectExists) {
      sendError(res, 404, "NOT_FOUND", `Project '${name}' not found`);
      return;
    }

    const projectPath = `${projectService.getSandboxDir()}/${name}`;
    const task = await yamlTaskWriterService.updateTask(
      projectPath,
      featureId,
      taskId,
      updates,
    );

    res.json({ data: task });
  } catch (error) {
    if (error instanceof TaskWriterError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    console.error("Error updating task:", error);
    sendError(res, 500, "INTERNAL_ERROR", "Failed to update task");
  }
});

export default router;
