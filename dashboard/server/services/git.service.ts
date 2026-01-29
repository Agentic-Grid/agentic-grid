/**
 * Git Service
 * Handles git operations for sandbox projects
 */

import { promisify } from "util";
import { exec } from "child_process";
import type {
  GitStatus,
  FileChange,
  FileStatus,
  FileDiff,
  DiffHunk,
  DiffLine,
  Commit,
} from "../types/git.types.js";

const execAsync = promisify(exec);

class GitService {
  /**
   * Execute a git command in the given project directory
   */
  private async runGit(
    projectPath: string,
    args: string,
  ): Promise<string> {
    try {
      const { stdout } = await execAsync(`git ${args}`, {
        cwd: projectPath,
        maxBuffer: 10 * 1024 * 1024, // 10MB for large diffs
      });
      return stdout;
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string; message?: string };
      // Git commands sometimes exit with non-zero even on success (e.g., diff with no changes)
      if (execError.stdout !== undefined) {
        return execError.stdout;
      }
      throw new Error(execError.stderr || execError.message || "Git command failed");
    }
  }

  /**
   * Check if a directory is a git repository
   */
  async isGitRepo(projectPath: string): Promise<boolean> {
    try {
      await this.runGit(projectPath, "rev-parse --is-inside-work-tree");
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the current git status
   */
  async getStatus(projectPath: string): Promise<GitStatus> {
    // Get branch info
    let branch = "main";
    let ahead = 0;
    let behind = 0;

    try {
      const branchOutput = await this.runGit(projectPath, "rev-parse --abbrev-ref HEAD");
      branch = branchOutput.trim();
    } catch {
      // Ignore - may be detached HEAD or no commits
    }

    // Get ahead/behind counts
    try {
      const trackOutput = await this.runGit(
        projectPath,
        `rev-list --left-right --count HEAD...@{upstream}`,
      );
      const [aheadStr, behindStr] = trackOutput.trim().split(/\s+/);
      ahead = parseInt(aheadStr, 10) || 0;
      behind = parseInt(behindStr, 10) || 0;
    } catch {
      // Ignore - may not have upstream configured
    }

    // Get status using porcelain v1 format
    const statusOutput = await this.runGit(projectPath, "status --porcelain=v1");
    const staged: FileChange[] = [];
    const unstaged: FileChange[] = [];
    const untracked: string[] = [];

    const lines = statusOutput.split("\n").filter((line) => line.length > 0);

    for (const line of lines) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      let filePath = line.substring(3);

      // Handle renamed files (old -> new format)
      let oldPath: string | undefined;
      if (filePath.includes(" -> ")) {
        const parts = filePath.split(" -> ");
        oldPath = parts[0];
        filePath = parts[1];
      }

      // Untracked files
      if (indexStatus === "?" && workTreeStatus === "?") {
        untracked.push(filePath);
        continue;
      }

      // Staged changes (index status)
      if (indexStatus !== " " && indexStatus !== "?") {
        staged.push({
          path: filePath,
          status: this.parseStatus(indexStatus),
          oldPath,
        });
      }

      // Unstaged changes (work tree status)
      if (workTreeStatus !== " " && workTreeStatus !== "?") {
        unstaged.push({
          path: filePath,
          status: this.parseStatus(workTreeStatus),
        });
      }
    }

    return {
      branch,
      ahead,
      behind,
      staged,
      unstaged,
      untracked,
    };
  }

  /**
   * Parse git status character to FileStatus
   */
  private parseStatus(char: string): FileStatus {
    const statusMap: Record<string, FileStatus> = {
      M: "M", // Modified
      A: "A", // Added
      D: "D", // Deleted
      R: "R", // Renamed
      C: "C", // Copied
      U: "U", // Unmerged
      "?": "?", // Untracked
    };
    return statusMap[char] || "M";
  }

  /**
   * Get diff for specific file(s) or all files
   */
  async getDiff(
    projectPath: string,
    file?: string,
    staged: boolean = false,
    context: number = 3,
  ): Promise<FileDiff[]> {
    const cachedFlag = staged ? "--cached" : "";
    const fileArg = file ? `-- "${file}"` : "";
    const diffArgs = `diff ${cachedFlag} --unified=${context} ${fileArg}`;

    const diffOutput = await this.runGit(projectPath, diffArgs);

    if (!diffOutput.trim()) {
      return [];
    }

    return this.parseDiff(diffOutput);
  }

  /**
   * Parse unified diff output into structured FileDiff objects
   */
  private parseDiff(diffOutput: string): FileDiff[] {
    const files: FileDiff[] = [];
    const fileChunks = diffOutput.split(/^diff --git /m).filter((chunk) => chunk.trim());

    for (const chunk of fileChunks) {
      const lines = chunk.split("\n");

      // Parse file paths from first line
      const headerMatch = lines[0].match(/a\/(.+) b\/(.+)/);
      if (!headerMatch) continue;

      const oldPath = headerMatch[1];
      const newPath = headerMatch[2];
      const path = newPath || oldPath;

      // Check for binary file
      if (chunk.includes("Binary files")) {
        files.push({
          path,
          oldPath: oldPath !== newPath ? oldPath : undefined,
          status: "M",
          hunks: [],
          binary: true,
          additions: 0,
          deletions: 0,
        });
        continue;
      }

      // Parse hunks
      const hunks: DiffHunk[] = [];
      let currentHunk: DiffHunk | null = null;
      let additions = 0;
      let deletions = 0;
      let oldLineNum = 0;
      let newLineNum = 0;

      for (const line of lines) {
        // Hunk header
        const hunkMatch = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (hunkMatch) {
          if (currentHunk) {
            hunks.push(currentHunk);
          }
          oldLineNum = parseInt(hunkMatch[1], 10);
          newLineNum = parseInt(hunkMatch[3], 10);
          currentHunk = {
            oldStart: oldLineNum,
            oldLines: parseInt(hunkMatch[2] || "1", 10),
            newStart: newLineNum,
            newLines: parseInt(hunkMatch[4] || "1", 10),
            lines: [],
          };
          continue;
        }

        if (!currentHunk) continue;

        // Diff lines
        if (line.startsWith("+") && !line.startsWith("+++")) {
          currentHunk.lines.push({
            type: "addition",
            content: line.substring(1),
            newLineNumber: newLineNum++,
          });
          additions++;
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          currentHunk.lines.push({
            type: "deletion",
            content: line.substring(1),
            oldLineNumber: oldLineNum++,
          });
          deletions++;
        } else if (line.startsWith(" ")) {
          currentHunk.lines.push({
            type: "context",
            content: line.substring(1),
            oldLineNumber: oldLineNum++,
            newLineNumber: newLineNum++,
          });
        }
      }

      if (currentHunk) {
        hunks.push(currentHunk);
      }

      files.push({
        path,
        oldPath: oldPath !== newPath ? oldPath : undefined,
        status: this.detectFileStatus(chunk),
        hunks,
        binary: false,
        additions,
        deletions,
      });
    }

    return files;
  }

  /**
   * Detect file status from diff chunk
   */
  private detectFileStatus(chunk: string): string {
    if (chunk.includes("new file mode")) return "A";
    if (chunk.includes("deleted file mode")) return "D";
    if (chunk.includes("rename from")) return "R";
    if (chunk.includes("copy from")) return "C";
    return "M";
  }

  /**
   * Stage files for commit
   */
  async stage(projectPath: string, files: string[]): Promise<void> {
    if (files.length === 0) return;

    const escapedFiles = files.map((f) => `"${f}"`).join(" ");
    await this.runGit(projectPath, `add ${escapedFiles}`);
  }

  /**
   * Stage all changes
   */
  async stageAll(projectPath: string): Promise<void> {
    await this.runGit(projectPath, "add -A");
  }

  /**
   * Unstage files
   */
  async unstage(projectPath: string, files: string[]): Promise<void> {
    if (files.length === 0) return;

    const escapedFiles = files.map((f) => `"${f}"`).join(" ");
    await this.runGit(projectPath, `reset HEAD ${escapedFiles}`);
  }

  /**
   * Unstage all files
   */
  async unstageAll(projectPath: string): Promise<void> {
    await this.runGit(projectPath, "reset HEAD");
  }

  /**
   * Create a commit
   */
  async commit(projectPath: string, message: string): Promise<Commit> {
    // Escape message for shell
    const escapedMessage = message.replace(/"/g, '\\"');
    await this.runGit(projectPath, `commit -m "${escapedMessage}"`);

    // Get the commit info
    const logOutput = await this.runGit(
      projectPath,
      'log -1 --format="%H|%h|%s|%an|%ae|%aI"',
    );

    const [hash, shortHash, msg, author, email, timestamp] = logOutput
      .trim()
      .replace(/^"|"$/g, "")
      .split("|");

    // Get files changed count
    const statOutput = await this.runGit(projectPath, "diff-tree --no-commit-id --name-only -r HEAD");
    const filesChanged = statOutput.trim().split("\n").filter((l) => l).length;

    return {
      hash,
      shortHash,
      message: msg,
      author,
      email,
      timestamp,
      filesChanged,
    };
  }

  /**
   * Get commit history
   */
  async getHistory(
    projectPath: string,
    limit: number = 20,
    skip: number = 0,
  ): Promise<{ commits: Commit[]; total: number }> {
    // Get total count
    let total = 0;
    try {
      const countOutput = await this.runGit(projectPath, "rev-list --count HEAD");
      total = parseInt(countOutput.trim(), 10) || 0;
    } catch {
      // Ignore - may have no commits
    }

    if (total === 0) {
      return { commits: [], total: 0 };
    }

    // Get commits
    const logOutput = await this.runGit(
      projectPath,
      `log --format="%H|%h|%s|%an|%ae|%aI" -n ${limit} --skip=${skip}`,
    );

    const commits: Commit[] = [];
    const lines = logOutput.trim().split("\n").filter((l) => l);

    for (const line of lines) {
      const cleanLine = line.replace(/^"|"$/g, "");
      const [hash, shortHash, message, author, email, timestamp] = cleanLine.split("|");

      commits.push({
        hash,
        shortHash,
        message,
        author,
        email,
        timestamp,
        filesChanged: 0, // Would need additional query per commit
      });
    }

    return { commits, total };
  }

  /**
   * Push commits to remote
   */
  async push(
    projectPath: string,
    remote: string = "origin",
    branch?: string,
  ): Promise<{ pushed: boolean; message: string }> {
    try {
      // Get current branch if not specified
      if (!branch) {
        const branchOutput = await this.runGit(projectPath, "rev-parse --abbrev-ref HEAD");
        branch = branchOutput.trim();
      }

      const output = await this.runGit(projectPath, `push ${remote} ${branch}`);
      return { pushed: true, message: output.trim() || "Push successful" };
    } catch (error: unknown) {
      const execError = error as { stderr?: string; message?: string };
      const msg = execError.stderr || execError.message || "Push failed";
      // Check if it's "Everything up-to-date"
      if (msg.includes("Everything up-to-date")) {
        return { pushed: true, message: "Everything up-to-date" };
      }
      throw new Error(msg);
    }
  }

  /**
   * Soft reset a commit - moves changes back to the working tree
   * This undoes the commit but keeps all changes as unstaged modifications
   */
  async resetCommit(
    projectPath: string,
    commitHash?: string,
  ): Promise<void> {
    // Default to resetting the last commit
    const target = commitHash ? commitHash : "HEAD~1";
    await this.runGit(projectPath, `reset --soft ${target}`);
  }

  /**
   * Get the hash of the commit that the upstream is pointing to,
   * so we can determine which local commits haven't been pushed
   */
  async getUpstreamHead(projectPath: string): Promise<string | null> {
    try {
      const output = await this.runGit(projectPath, "rev-parse @{upstream}");
      return output.trim();
    } catch {
      return null; // No upstream configured
    }
  }

  /**
   * Check if a specific commit has been pushed to remote
   */
  async isCommitPushed(
    projectPath: string,
    commitHash: string,
  ): Promise<boolean> {
    try {
      // Check if the commit is an ancestor of any remote branch
      const output = await this.runGit(
        projectPath,
        `branch -r --contains ${commitHash}`,
      );
      return output.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get history with pushed/unpushed status
   */
  async getHistoryWithStatus(
    projectPath: string,
    limit: number = 30,
    skip: number = 0,
  ): Promise<{ commits: (Commit & { pushed: boolean })[]; total: number; ahead: number }> {
    const { commits, total } = await this.getHistory(projectPath, limit, skip);

    if (commits.length === 0) {
      return { commits: [], total: 0, ahead: 0 };
    }

    // Get ahead count to know how many unpushed commits there are
    let ahead = 0;
    try {
      const trackOutput = await this.runGit(
        projectPath,
        "rev-list --count HEAD...@{upstream}",
      );
      // rev-list --left-right --count gives "ahead\tbehind"
      const leftRightOutput = await this.runGit(
        projectPath,
        "rev-list --left-right --count HEAD...@{upstream}",
      );
      const [aheadStr] = leftRightOutput.trim().split(/\s+/);
      ahead = parseInt(aheadStr, 10) || 0;
    } catch {
      // No upstream - all commits are "unpushed"
      ahead = total;
    }

    // Get list of unpushed commit hashes
    let unpushedHashes = new Set<string>();
    if (ahead > 0) {
      try {
        const unpushedOutput = await this.runGit(
          projectPath,
          "log @{upstream}..HEAD --format=%H",
        );
        unpushedHashes = new Set(
          unpushedOutput.trim().split("\n").filter((h) => h),
        );
      } catch {
        // If no upstream, mark all as unpushed
        for (const commit of commits) {
          unpushedHashes.add(commit.hash);
        }
      }
    }

    const commitsWithStatus = commits.map((commit) => ({
      ...commit,
      pushed: !unpushedHashes.has(commit.hash),
    }));

    return { commits: commitsWithStatus, total, ahead };
  }

  /**
   * Get diff for a specific commit (all files changed in that commit)
   */
  async getCommitDiff(
    projectPath: string,
    commitHash: string,
  ): Promise<FileDiff[]> {
    // For the root commit (no parent), use --root flag
    let diffOutput: string;
    try {
      diffOutput = await this.runGit(
        projectPath,
        `diff ${commitHash}^..${commitHash}`,
      );
    } catch {
      // If the commit has no parent (root commit), use diff-tree --root
      diffOutput = await this.runGit(
        projectPath,
        `diff-tree -p --root ${commitHash}`,
      );
    }

    if (!diffOutput.trim()) {
      return [];
    }

    return this.parseDiff(diffOutput);
  }

  /**
   * Initialize a new git repository
   */
  async init(projectPath: string): Promise<void> {
    await this.runGit(projectPath, "init");
  }
}

export const gitService = new GitService();
