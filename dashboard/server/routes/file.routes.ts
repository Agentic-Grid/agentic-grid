/**
 * File API Routes
 * REST endpoints for file operations in sandbox projects
 */

import { Router, Request, Response } from "express";
import { join } from "path";
import { fileService } from "../services/file.service.js";
import { FileError } from "../types/file.types.js";
import type {
  WriteFileRequest,
  CreateFileRequest,
  MoveFileRequest,
  SearchRequest,
} from "../types/file.types.js";

const router = Router();

// =============================================================================
// CONFIGURATION
// =============================================================================

// Project root is one level up from dashboard folder
const PROJECT_ROOT = join(import.meta.dirname, "..", "..", "..");
const SANDBOX_DIR = join(PROJECT_ROOT, "sandbox");

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
  details?: unknown
): void {
  const error: ApiError = { error: message, code };
  if (details !== undefined) {
    error.details = details;
  }
  res.status(status).json(error);
}

/**
 * Handle FileError or generic errors
 */
function handleError(res: Response, error: unknown): void {
  if (error instanceof FileError) {
    sendError(res, error.statusCode, error.code, error.message);
  } else {
    console.error("File operation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    sendError(res, 500, "UNKNOWN_ERROR", message);
  }
}

/**
 * Get the full path for a project in the sandbox
 */
function getProjectPath(projectName: string): string {
  // Sanitize project name to prevent path traversal
  const sanitized = projectName.replace(/[^a-zA-Z0-9_-]/g, "");
  return join(SANDBOX_DIR, sanitized);
}

/**
 * Extract file path from named wildcard route parameter.
 * Express 5 with path-to-regexp v8 returns wildcard params as string arrays.
 */
function getFilePath(req: Request): string {
  const filePath = req.params.filePath;
  if (Array.isArray(filePath)) {
    return filePath.join("/");
  }
  return filePath || "";
}

// =============================================================================
// FILE TREE
// =============================================================================

/**
 * GET /api/projects/:projectName/files
 * Get the file tree for a project
 *
 * Query params:
 * - path: start path within project (optional)
 * - depth: maximum depth to traverse (default: 10)
 */
router.get("/:projectName/files", async (req: Request, res: Response) => {
  try {
    const projectName = req.params.projectName as string;
    const startPath = req.query.path as string | undefined;
    const depth = req.query.depth as string | undefined;
    const projectPath = getProjectPath(projectName);

    const depthNum = depth ? parseInt(depth, 10) : 10;

    const tree = await fileService.getFileTree(
      projectPath,
      startPath || "",
      depthNum
    );

    res.json({ data: tree });
  } catch (error) {
    handleError(res, error);
  }
});

// =============================================================================
// READ FILE
// =============================================================================

/**
 * GET /api/projects/:projectName/files/*
 * Read file content
 *
 * The wildcard captures the file path including subdirectories
 */
router.get("/:projectName/files/*filePath", async (req: Request, res: Response) => {
  try {
    const projectName = req.params.projectName as string;
    const filePath = getFilePath(req);
    const projectPath = getProjectPath(projectName);

    if (!filePath) {
      sendError(res, 400, "INVALID_PATH", "File path is required");
      return;
    }

    const content = await fileService.readFile(projectPath, filePath);
    res.json({ data: content });
  } catch (error) {
    handleError(res, error);
  }
});

// =============================================================================
// WRITE FILE
// =============================================================================

/**
 * PUT /api/projects/:projectName/files/*
 * Write file content
 *
 * Body:
 * - content: file content (string)
 * - createDirectories: create parent dirs if missing (optional)
 * - encoding: 'utf-8' or 'base64' (optional)
 */
router.put("/:projectName/files/*filePath", async (req: Request, res: Response) => {
  try {
    const projectName = req.params.projectName as string;
    const filePath = getFilePath(req);
    const projectPath = getProjectPath(projectName);
    const body = req.body as WriteFileRequest;

    if (!filePath) {
      sendError(res, 400, "INVALID_PATH", "File path is required");
      return;
    }

    if (body.content === undefined) {
      sendError(res, 400, "INVALID_REQUEST", "Content is required");
      return;
    }

    const result = await fileService.writeFile(projectPath, filePath, body);
    res.json({ data: result });
  } catch (error) {
    handleError(res, error);
  }
});

// =============================================================================
// CREATE FILE/DIRECTORY
// =============================================================================

/**
 * POST /api/projects/:projectName/files
 * Create a new file or directory
 *
 * Body:
 * - path: path to create
 * - type: 'file' or 'directory'
 * - content: initial content for files (optional)
 */
router.post("/:projectName/files", async (req: Request, res: Response) => {
  try {
    const projectName = req.params.projectName as string;
    const projectPath = getProjectPath(projectName);
    const body = req.body as CreateFileRequest;

    if (!body.path) {
      sendError(res, 400, "INVALID_PATH", "Path is required");
      return;
    }

    if (!body.type || !["file", "directory"].includes(body.type)) {
      sendError(res, 400, "INVALID_REQUEST", "Type must be 'file' or 'directory'");
      return;
    }

    const result = await fileService.createFile(projectPath, body);
    res.status(201).json({ data: result });
  } catch (error) {
    handleError(res, error);
  }
});

// =============================================================================
// DELETE FILE/DIRECTORY
// =============================================================================

/**
 * DELETE /api/projects/:projectName/files/*
 * Delete a file or directory
 *
 * Query params:
 * - recursive: delete directory contents (optional)
 */
router.delete("/:projectName/files/*filePath", async (req: Request, res: Response) => {
  try {
    const projectName = req.params.projectName as string;
    const filePath = getFilePath(req);
    const recursive = req.query.recursive as string | undefined;
    const projectPath = getProjectPath(projectName);

    if (!filePath) {
      sendError(res, 400, "INVALID_PATH", "File path is required");
      return;
    }

    const isRecursive = recursive === "true";
    const result = await fileService.deleteFile(projectPath, filePath, isRecursive);
    res.json({ data: result });
  } catch (error) {
    handleError(res, error);
  }
});

// =============================================================================
// MOVE/RENAME FILE
// =============================================================================

/**
 * POST /api/projects/:projectName/files/move
 * Move or rename a file/directory
 *
 * Body:
 * - sourcePath: current path
 * - destinationPath: new path
 * - overwrite: overwrite if exists (optional)
 */
router.post("/:projectName/files/move", async (req: Request, res: Response) => {
  try {
    const projectName = req.params.projectName as string;
    const projectPath = getProjectPath(projectName);
    const body = req.body as MoveFileRequest;

    if (!body.sourcePath) {
      sendError(res, 400, "INVALID_PATH", "Source path is required");
      return;
    }

    if (!body.destinationPath) {
      sendError(res, 400, "INVALID_PATH", "Destination path is required");
      return;
    }

    const result = await fileService.moveFile(projectPath, body);
    res.json({ data: result });
  } catch (error) {
    handleError(res, error);
  }
});

// =============================================================================
// SEARCH FILES
// =============================================================================

/**
 * POST /api/projects/:projectName/files/search
 * Search for pattern in files
 *
 * Body:
 * - pattern: search pattern (required)
 * - path: limit search to path (optional)
 * - regex: treat pattern as regex (optional)
 * - caseSensitive: case sensitive search (optional)
 * - includeGlob: file pattern to include (optional)
 * - excludeGlob: file pattern to exclude (optional)
 * - maxResults: maximum results (optional, default 500)
 */
router.post("/:projectName/files/search", async (req: Request, res: Response) => {
  try {
    const projectName = req.params.projectName as string;
    const projectPath = getProjectPath(projectName);
    const body = req.body as SearchRequest;

    if (!body.pattern) {
      sendError(res, 400, "INVALID_REQUEST", "Search pattern is required");
      return;
    }

    const results = await fileService.searchFiles(projectPath, body);
    res.json({ data: results });
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
