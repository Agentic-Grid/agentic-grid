/**
 * File Types
 * Type definitions for file operations in sandbox projects
 */

// =============================================================================
// FILE NODE (TREE STRUCTURE)
// =============================================================================

export type GitFileStatus = 'M' | 'A' | 'D' | 'U' | '?';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  children?: FileNode[];
  gitStatus?: GitFileStatus;
}

// =============================================================================
// FILE CONTENT
// =============================================================================

export interface FileContentResponse {
  path: string;
  content: string;
  encoding: 'utf-8' | 'base64';
  size: number;
  modified: string;
  language: string;
}

// =============================================================================
// WRITE FILE
// =============================================================================

export interface WriteFileRequest {
  content: string;
  createDirectories?: boolean;
  encoding?: 'utf-8' | 'base64';
}

export interface WriteFileResponse {
  path: string;
  size: number;
  modified: string;
}

// =============================================================================
// CREATE FILE/DIRECTORY
// =============================================================================

export interface CreateFileRequest {
  path: string;
  type: 'file' | 'directory';
  content?: string;
}

export interface CreateFileResponse {
  path: string;
  type: 'file' | 'directory';
  created: boolean;
}

// =============================================================================
// MOVE/RENAME FILE
// =============================================================================

export interface MoveFileRequest {
  sourcePath: string;
  destinationPath: string;
  overwrite?: boolean;
}

export interface MoveFileResponse {
  oldPath: string;
  newPath: string;
  success: boolean;
}

// =============================================================================
// SEARCH
// =============================================================================

export interface SearchRequest {
  pattern: string;
  path?: string;
  regex?: boolean;
  caseSensitive?: boolean;
  includeGlob?: string;
  excludeGlob?: string;
  maxResults?: number;
}

export interface SearchMatch {
  line: number;
  column: number;
  content: string;
  contextBefore?: string[];
  contextAfter?: string[];
}

export interface SearchResult {
  path: string;
  matches: SearchMatch[];
}

export interface SearchResponse {
  results: SearchResult[];
  totalMatches: number;
  truncated: boolean;
}

// =============================================================================
// DELETE
// =============================================================================

export interface DeleteFileResponse {
  path: string;
  deleted: boolean;
}

// =============================================================================
// ERROR
// =============================================================================

export type FileErrorCode =
  | 'PATH_TRAVERSAL'
  | 'FILE_NOT_FOUND'
  | 'FILE_TOO_LARGE'
  | 'DIRECTORY_NOT_EMPTY'
  | 'ALREADY_EXISTS'
  | 'PERMISSION_DENIED'
  | 'INVALID_PATH'
  | 'UNKNOWN_ERROR';

export class FileError extends Error {
  constructor(
    public code: FileErrorCode,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'FileError';
  }
}
