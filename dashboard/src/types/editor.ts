/**
 * Editor Types
 * Type definitions for the Visual Code Editor feature
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

export interface FileContent {
  path: string;
  content: string;
  encoding: 'utf-8' | 'base64';
  size: number;
  modified: string;
  language: string;
}

// =============================================================================
// EDITOR TAB
// =============================================================================

export interface EditorTab {
  path: string;
  name: string;
  language: string;
  isDirty: boolean;
  content: string;
  originalContent: string;
  encoding?: 'utf-8' | 'base64';
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
// DELETE
// =============================================================================

export interface DeleteFileResponse {
  path: string;
  deleted: boolean;
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
