/**
 * Git Types
 * Type definitions for Git operations in sandbox projects
 */

// =============================================================================
// FILE CHANGE TYPES
// =============================================================================

export type FileStatus = 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '?';

export interface FileChange {
  path: string;
  status: FileStatus;
  oldPath?: string;
  insertions?: number;
  deletions?: number;
}

// =============================================================================
// GIT STATUS
// =============================================================================

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: string[];
}

// =============================================================================
// DIFF TYPES
// =============================================================================

export interface DiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface FileDiff {
  path: string;
  oldPath?: string;
  status: string;
  hunks: DiffHunk[];
  binary: boolean;
  additions: number;
  deletions: number;
}

// =============================================================================
// COMMIT TYPES
// =============================================================================

export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  email: string;
  timestamp: string;
  filesChanged: number;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface StageRequest {
  files: string[];
  all?: boolean;
}

export interface UnstageRequest {
  files: string[];
  all?: boolean;
}

export interface CommitRequest {
  message: string;
  files?: string[];
}

export interface PushRequest {
  remote?: string;
  branch?: string;
}

export interface ResetCommitRequest {
  commitHash?: string;
}

export interface GitStatusResponse {
  data: GitStatus;
}

export interface GitDiffResponse {
  data: FileDiff[];
}

export interface GitHistoryResponse {
  data: {
    commits: Commit[];
    total: number;
  };
}

export interface CommitResponse {
  data: Commit;
}
