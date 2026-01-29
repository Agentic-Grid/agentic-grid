/**
 * Git API Routes
 * REST endpoints for git operations in sandbox projects
 */

import { Router, Request, Response } from "express";
import { join } from "path";
import { gitService } from "../services/git.service.js";
import type {
  StageRequest,
  UnstageRequest,
  CommitRequest,
  PushRequest,
  ResetCommitRequest,
} from "../types/git.types.js";

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
  details?: unknown,
): void {
  const error: ApiError = { error: message, code };
  if (details !== undefined) {
    error.details = details;
  }
  res.status(status).json(error);
}

/**
 * Get the full path for a project in the sandbox
 */
function getProjectPath(projectName: string): string {
  // Sanitize project name to prevent path traversal
  const sanitized = projectName.replace(/[^a-zA-Z0-9_-]/g, "");
  return join(SANDBOX_DIR, sanitized);
}

// =============================================================================
// GIT STATUS
// =============================================================================

/**
 * GET /api/git/:projectName/status
 * Get the current git status for a project
 */
router.get("/:projectName/status", async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const projectPath = getProjectPath(projectName);

    // Check if it's a git repo
    const isRepo = await gitService.isGitRepo(projectPath);
    if (!isRepo) {
      sendError(res, 400, "NOT_GIT_REPO", "Directory is not a git repository");
      return;
    }

    const status = await gitService.getStatus(projectPath);
    res.json({ data: status });
  } catch (error) {
    console.error("Error getting git status:", error);
    sendError(res, 500, "GIT_STATUS_ERROR", "Failed to get git status");
  }
});

// =============================================================================
// GIT DIFF
// =============================================================================

/**
 * GET /api/git/:projectName/diff
 * Get diff for specific file(s) or all files
 *
 * Query params:
 * - file: specific file to get diff for (optional)
 * - staged: whether to get staged diff (default: false)
 * - context: number of context lines (default: 3)
 */
router.get("/:projectName/diff", async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const { file, staged, context } = req.query;
    const projectPath = getProjectPath(projectName);

    // Check if it's a git repo
    const isRepo = await gitService.isGitRepo(projectPath);
    if (!isRepo) {
      sendError(res, 400, "NOT_GIT_REPO", "Directory is not a git repository");
      return;
    }

    const isStaged = staged === "true";
    const contextLines = context ? parseInt(context as string, 10) : 3;

    const diff = await gitService.getDiff(
      projectPath,
      file as string | undefined,
      isStaged,
      contextLines,
    );

    res.json({ data: diff });
  } catch (error) {
    console.error("Error getting git diff:", error);
    sendError(res, 500, "GIT_DIFF_ERROR", "Failed to get git diff");
  }
});

// =============================================================================
// STAGE / UNSTAGE
// =============================================================================

/**
 * POST /api/git/:projectName/stage
 * Stage files for commit
 *
 * Body:
 * - files: array of file paths to stage
 * - all: boolean to stage all changes
 */
router.post("/:projectName/stage", async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const { files, all } = req.body as StageRequest;
    const projectPath = getProjectPath(projectName);

    // Check if it's a git repo
    const isRepo = await gitService.isGitRepo(projectPath);
    if (!isRepo) {
      sendError(res, 400, "NOT_GIT_REPO", "Directory is not a git repository");
      return;
    }

    if (all) {
      await gitService.stageAll(projectPath);
    } else if (files && files.length > 0) {
      await gitService.stage(projectPath, files);
    } else {
      sendError(res, 400, "INVALID_REQUEST", "Must provide files array or all=true");
      return;
    }

    res.json({ data: { success: true } });
  } catch (error) {
    console.error("Error staging files:", error);
    sendError(res, 500, "GIT_STAGE_ERROR", "Failed to stage files");
  }
});

/**
 * POST /api/git/:projectName/unstage
 * Unstage files
 *
 * Body:
 * - files: array of file paths to unstage
 * - all: boolean to unstage all changes
 */
router.post("/:projectName/unstage", async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const { files, all } = req.body as UnstageRequest;
    const projectPath = getProjectPath(projectName);

    // Check if it's a git repo
    const isRepo = await gitService.isGitRepo(projectPath);
    if (!isRepo) {
      sendError(res, 400, "NOT_GIT_REPO", "Directory is not a git repository");
      return;
    }

    if (all) {
      await gitService.unstageAll(projectPath);
    } else if (files && files.length > 0) {
      await gitService.unstage(projectPath, files);
    } else {
      sendError(res, 400, "INVALID_REQUEST", "Must provide files array or all=true");
      return;
    }

    res.json({ data: { success: true } });
  } catch (error) {
    console.error("Error unstaging files:", error);
    sendError(res, 500, "GIT_UNSTAGE_ERROR", "Failed to unstage files");
  }
});

// =============================================================================
// COMMIT
// =============================================================================

/**
 * POST /api/git/:projectName/commit
 * Create a commit with staged changes
 *
 * Body:
 * - message: commit message (required)
 */
router.post("/:projectName/commit", async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const { message } = req.body as CommitRequest;
    const projectPath = getProjectPath(projectName);

    // Validate message
    if (!message || !message.trim()) {
      sendError(res, 400, "INVALID_MESSAGE", "Commit message is required");
      return;
    }

    // Check if it's a git repo
    const isRepo = await gitService.isGitRepo(projectPath);
    if (!isRepo) {
      sendError(res, 400, "NOT_GIT_REPO", "Directory is not a git repository");
      return;
    }

    const commit = await gitService.commit(projectPath, message.trim());
    res.json({ data: commit });
  } catch (error) {
    console.error("Error creating commit:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create commit";
    sendError(res, 500, "GIT_COMMIT_ERROR", errorMessage);
  }
});

// =============================================================================
// HISTORY
// =============================================================================

/**
 * GET /api/git/:projectName/history
 * Get commit history
 *
 * Query params:
 * - limit: number of commits to return (default: 20)
 * - skip: number of commits to skip (default: 0)
 */
router.get("/:projectName/history", async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const { limit, skip } = req.query;
    const projectPath = getProjectPath(projectName);

    // Check if it's a git repo
    const isRepo = await gitService.isGitRepo(projectPath);
    if (!isRepo) {
      sendError(res, 400, "NOT_GIT_REPO", "Directory is not a git repository");
      return;
    }

    const limitNum = limit ? parseInt(limit as string, 10) : 20;
    const skipNum = skip ? parseInt(skip as string, 10) : 0;

    const history = await gitService.getHistoryWithStatus(projectPath, limitNum, skipNum);
    res.json({ data: history });
  } catch (error) {
    console.error("Error getting git history:", error);
    sendError(res, 500, "GIT_HISTORY_ERROR", "Failed to get git history");
  }
});

// =============================================================================
// COMMIT DIFF
// =============================================================================

/**
 * GET /api/git/:projectName/commits/:hash/diff
 * Get the diff for a specific commit (all files changed)
 */
router.get("/:projectName/commits/:hash/diff", async (req: Request, res: Response) => {
  try {
    const { projectName, hash } = req.params;
    const projectPath = getProjectPath(projectName);

    // Check if it's a git repo
    const isRepo = await gitService.isGitRepo(projectPath);
    if (!isRepo) {
      sendError(res, 400, "NOT_GIT_REPO", "Directory is not a git repository");
      return;
    }

    // Validate hash format (basic check)
    if (!/^[a-f0-9]{4,40}$/.test(hash)) {
      sendError(res, 400, "INVALID_HASH", "Invalid commit hash format");
      return;
    }

    const diffs = await gitService.getCommitDiff(projectPath, hash);
    res.json({ data: diffs });
  } catch (error) {
    console.error("Error getting commit diff:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to get commit diff";
    sendError(res, 500, "GIT_COMMIT_DIFF_ERROR", errorMessage);
  }
});

// =============================================================================
// PUSH
// =============================================================================

/**
 * POST /api/git/:projectName/push
 * Push commits to remote
 *
 * Body:
 * - remote: remote name (default: "origin")
 * - branch: branch name (optional, defaults to current branch)
 */
router.post("/:projectName/push", async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const { remote, branch } = req.body as PushRequest;
    const projectPath = getProjectPath(projectName);

    // Check if it's a git repo
    const isRepo = await gitService.isGitRepo(projectPath);
    if (!isRepo) {
      sendError(res, 400, "NOT_GIT_REPO", "Directory is not a git repository");
      return;
    }

    const result = await gitService.push(projectPath, remote, branch);
    res.json({ data: result });
  } catch (error) {
    console.error("Error pushing:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to push";
    sendError(res, 500, "GIT_PUSH_ERROR", errorMessage);
  }
});

// =============================================================================
// RESET (Revert unpushed commit)
// =============================================================================

/**
 * POST /api/git/:projectName/reset
 * Soft reset a commit, moving changes back to the working tree
 *
 * Body:
 * - commitHash: specific commit to reset to (optional, defaults to HEAD~1)
 */
router.post("/:projectName/reset", async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const { commitHash } = req.body as ResetCommitRequest;
    const projectPath = getProjectPath(projectName);

    // Check if it's a git repo
    const isRepo = await gitService.isGitRepo(projectPath);
    if (!isRepo) {
      sendError(res, 400, "NOT_GIT_REPO", "Directory is not a git repository");
      return;
    }

    // Safety check: don't allow resetting pushed commits
    if (commitHash) {
      const isPushed = await gitService.isCommitPushed(projectPath, commitHash);
      if (isPushed) {
        sendError(
          res,
          400,
          "COMMIT_PUSHED",
          "Cannot reset a commit that has been pushed to remote",
        );
        return;
      }
    }

    await gitService.resetCommit(projectPath, commitHash);
    res.json({ data: { success: true, message: "Commit reset successfully" } });
  } catch (error) {
    console.error("Error resetting commit:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to reset commit";
    sendError(res, 500, "GIT_RESET_ERROR", errorMessage);
  }
});

// =============================================================================
// INIT
// =============================================================================

/**
 * POST /api/git/:projectName/init
 * Initialize a new git repository
 */
router.post("/:projectName/init", async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const projectPath = getProjectPath(projectName);

    // Check if it's already a git repo
    const isRepo = await gitService.isGitRepo(projectPath);
    if (isRepo) {
      sendError(res, 400, "ALREADY_GIT_REPO", "Directory is already a git repository");
      return;
    }

    await gitService.init(projectPath);
    res.json({ data: { success: true, message: "Git repository initialized" } });
  } catch (error) {
    console.error("Error initializing git repo:", error);
    sendError(res, 500, "GIT_INIT_ERROR", "Failed to initialize git repository");
  }
});

/**
 * GET /api/git/:projectName/is-repo
 * Check if a directory is a git repository
 */
router.get("/:projectName/is-repo", async (req: Request, res: Response) => {
  try {
    const { projectName } = req.params;
    const projectPath = getProjectPath(projectName);

    const isRepo = await gitService.isGitRepo(projectPath);
    res.json({ data: { isGitRepo: isRepo } });
  } catch (error) {
    console.error("Error checking git repo:", error);
    sendError(res, 500, "GIT_CHECK_ERROR", "Failed to check git repository status");
  }
});

export default router;
