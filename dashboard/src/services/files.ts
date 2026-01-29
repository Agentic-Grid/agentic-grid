/**
 * File API Service
 * Functions for interacting with the File REST API
 */

import type {
  FileNode,
  FileContent,
  WriteFileResponse,
  CreateFileResponse,
  DeleteFileResponse,
  MoveFileResponse,
  SearchResponse,
} from "../types/editor";

const BASE_URL = "/api/projects";

// =============================================================================
// ERROR HANDLING
// =============================================================================

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error || `API error: ${response.status} ${response.statusText}`
    );
  }
  const json = await response.json();
  return json.data;
}

// =============================================================================
// FILE TREE
// =============================================================================

/**
 * Get the file tree for a project
 * @param projectName - Name of the project in sandbox
 * @param path - Optional start path within project
 * @param depth - Maximum depth to traverse (default: 10)
 */
export async function getFileTree(
  projectName: string,
  path?: string,
  depth?: number
): Promise<FileNode[]> {
  const params = new URLSearchParams();
  if (path) params.set("path", path);
  if (depth !== undefined) params.set("depth", String(depth));

  const queryString = params.toString();
  const url = `${BASE_URL}/${encodeURIComponent(projectName)}/files${
    queryString ? `?${queryString}` : ""
  }`;

  const response = await fetch(url);
  return handleResponse<FileNode[]>(response);
}

// =============================================================================
// READ FILE
// =============================================================================

/**
 * Read file content
 * @param projectName - Name of the project in sandbox
 * @param filePath - Path to the file within the project
 */
export async function getFileContent(
  projectName: string,
  filePath: string
): Promise<FileContent> {
  const response = await fetch(
    `${BASE_URL}/${encodeURIComponent(projectName)}/files/${filePath}`
  );
  return handleResponse<FileContent>(response);
}

// =============================================================================
// WRITE FILE
// =============================================================================

/**
 * Write file content
 * @param projectName - Name of the project in sandbox
 * @param filePath - Path to the file within the project
 * @param content - File content to write
 * @param options - Optional: createDirectories, encoding
 */
export async function writeFile(
  projectName: string,
  filePath: string,
  content: string,
  options?: { createDirectories?: boolean; encoding?: "utf-8" | "base64" }
): Promise<WriteFileResponse> {
  const response = await fetch(
    `${BASE_URL}/${encodeURIComponent(projectName)}/files/${filePath}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        createDirectories: options?.createDirectories,
        encoding: options?.encoding,
      }),
    }
  );
  return handleResponse<WriteFileResponse>(response);
}

// =============================================================================
// CREATE FILE/DIRECTORY
// =============================================================================

/**
 * Create a new file or directory
 * @param projectName - Name of the project in sandbox
 * @param path - Path for the new file/directory
 * @param type - 'file' or 'directory'
 * @param content - Optional initial content for files
 */
export async function createFile(
  projectName: string,
  path: string,
  type: "file" | "directory",
  content?: string
): Promise<CreateFileResponse> {
  const response = await fetch(
    `${BASE_URL}/${encodeURIComponent(projectName)}/files`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, type, content }),
    }
  );
  return handleResponse<CreateFileResponse>(response);
}

// =============================================================================
// DELETE FILE/DIRECTORY
// =============================================================================

/**
 * Delete a file or directory
 * @param projectName - Name of the project in sandbox
 * @param filePath - Path to delete
 * @param recursive - Delete directory contents (required for non-empty dirs)
 */
export async function deleteFile(
  projectName: string,
  filePath: string,
  recursive?: boolean
): Promise<DeleteFileResponse> {
  const params = recursive ? "?recursive=true" : "";
  const response = await fetch(
    `${BASE_URL}/${encodeURIComponent(projectName)}/files/${filePath}${params}`,
    { method: "DELETE" }
  );
  return handleResponse<DeleteFileResponse>(response);
}

// =============================================================================
// MOVE/RENAME FILE
// =============================================================================

/**
 * Move or rename a file/directory
 * @param projectName - Name of the project in sandbox
 * @param sourcePath - Current path
 * @param destinationPath - New path
 * @param overwrite - Overwrite if destination exists
 */
export async function moveFile(
  projectName: string,
  sourcePath: string,
  destinationPath: string,
  overwrite?: boolean
): Promise<MoveFileResponse> {
  const response = await fetch(
    `${BASE_URL}/${encodeURIComponent(projectName)}/files/move`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourcePath, destinationPath, overwrite }),
    }
  );
  return handleResponse<MoveFileResponse>(response);
}

// =============================================================================
// SEARCH FILES
// =============================================================================

/**
 * Search for pattern in files
 * @param projectName - Name of the project in sandbox
 * @param pattern - Search pattern
 * @param options - Search options
 */
export async function searchFiles(
  projectName: string,
  pattern: string,
  options?: {
    path?: string;
    regex?: boolean;
    caseSensitive?: boolean;
    includeGlob?: string;
    excludeGlob?: string;
    maxResults?: number;
  }
): Promise<SearchResponse> {
  const response = await fetch(
    `${BASE_URL}/${encodeURIComponent(projectName)}/files/search`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern, ...options }),
    }
  );
  return handleResponse<SearchResponse>(response);
}
