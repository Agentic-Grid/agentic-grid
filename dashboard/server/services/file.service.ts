/**
 * File Service
 * Handles file operations for sandbox projects with security measures
 */

import { readdir, readFile, writeFile, mkdir, rm, rename, stat } from "fs/promises";
import { join, normalize, extname, dirname, basename } from "path";
import { existsSync } from "fs";
import type {
  FileNode,
  FileContentResponse,
  WriteFileRequest,
  WriteFileResponse,
  CreateFileRequest,
  CreateFileResponse,
  MoveFileRequest,
  MoveFileResponse,
  SearchRequest,
  SearchResponse,
  SearchResult,
  SearchMatch,
  DeleteFileResponse,
  GitFileStatus,
} from "../types/file.types.js";
import { FileError } from "../types/file.types.js";
import { gitService } from "./git.service.js";

// =============================================================================
// CONFIGURATION
// =============================================================================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const WARN_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_SEARCH_RESULTS = 500;
const DEFAULT_DEPTH = 10;

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv',
  '.exe', '.dll', '.so', '.dylib',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.db', '.sqlite', '.sqlite3',
]);

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.next',
  '.nuxt',
  'coverage',
  '.cache',
  '.parcel-cache',
  'vendor',
  '.venv',
  'venv',
  'agents',
  'plans',
  'scripts',
  'templates',
]);

const IGNORED_FILES = new Set([
  'CLAUDE.md',
]);

// Language detection by extension
const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.json': 'json',
  '.md': 'markdown',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.sql': 'sql',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.lua': 'lua',
  '.r': 'r',
  '.R': 'r',
  '.vue': 'vue',
  '.svelte': 'svelte',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.dockerfile': 'dockerfile',
  '.env': 'plaintext',
  '.gitignore': 'plaintext',
  '.editorconfig': 'plaintext',
};

// =============================================================================
// FILE SERVICE CLASS
// =============================================================================

class FileService {
  /**
   * CRITICAL SECURITY: Validate path to prevent traversal attacks
   */
  private validatePath(projectPath: string, relativePath: string): string {
    const fullPath = join(projectPath, relativePath);
    const normalizedFull = normalize(fullPath);
    const normalizedProject = normalize(projectPath);

    if (!normalizedFull.startsWith(normalizedProject)) {
      throw new FileError('PATH_TRAVERSAL', 'Path traversal detected', 403);
    }

    return normalizedFull;
  }

  /**
   * Detect if a file is binary by extension
   */
  private isBinaryFile(filePath: string): boolean {
    const ext = extname(filePath).toLowerCase();
    return BINARY_EXTENSIONS.has(ext);
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = extname(filePath).toLowerCase();
    const name = basename(filePath).toLowerCase();

    // Special cases for filenames
    if (name === 'dockerfile') return 'dockerfile';
    if (name === 'makefile') return 'makefile';
    if (name === '.gitignore') return 'plaintext';
    if (name === '.env' || name.startsWith('.env.')) return 'plaintext';

    return LANGUAGE_MAP[ext] || 'plaintext';
  }

  /**
   * Check if directory should be ignored
   */
  private shouldIgnoreDir(name: string): boolean {
    return IGNORED_DIRS.has(name);
  }

  /**
   * Get git status for files in a directory
   */
  private async getGitStatusMap(projectPath: string): Promise<Map<string, GitFileStatus>> {
    const statusMap = new Map<string, GitFileStatus>();

    try {
      const isRepo = await gitService.isGitRepo(projectPath);
      if (!isRepo) return statusMap;

      const status = await gitService.getStatus(projectPath);

      // Map staged files
      for (const file of status.staged) {
        statusMap.set(file.path, file.status as GitFileStatus);
      }

      // Map unstaged files (overwrite staged status if also unstaged)
      for (const file of status.unstaged) {
        statusMap.set(file.path, file.status as GitFileStatus);
      }

      // Map untracked files
      for (const file of status.untracked) {
        statusMap.set(file, '?');
      }
    } catch {
      // Ignore git errors - just return empty map
    }

    return statusMap;
  }

  /**
   * Build file tree for a project directory
   */
  async getFileTree(
    projectPath: string,
    startPath: string = '',
    depth: number = DEFAULT_DEPTH
  ): Promise<FileNode[]> {
    const fullPath = this.validatePath(projectPath, startPath);
    const gitStatusMap = await this.getGitStatusMap(projectPath);

    return this.buildTree(projectPath, fullPath, gitStatusMap, depth);
  }

  /**
   * Recursively build the file tree
   */
  private async buildTree(
    projectRoot: string,
    dirPath: string,
    gitStatusMap: Map<string, GitFileStatus>,
    depth: number
  ): Promise<FileNode[]> {
    if (depth <= 0) return [];

    let entries;
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch {
      return [];
    }

    const nodes: FileNode[] = [];

    for (const entry of entries) {
      const name = entry.name;

      // Skip ignored directories
      if (entry.isDirectory() && this.shouldIgnoreDir(name)) {
        continue;
      }

      // Skip hidden files (except common config files)
      if (name.startsWith('.') && !this.isAllowedHiddenFile(name)) {
        continue;
      }

      // Skip ignored files
      if (entry.isFile() && IGNORED_FILES.has(name)) {
        continue;
      }

      const entryPath = join(dirPath, name);
      const relativePath = entryPath.substring(projectRoot.length + 1);

      try {
        const stats = await stat(entryPath);

        const node: FileNode = {
          name,
          path: relativePath,
          type: entry.isDirectory() ? 'directory' : 'file',
          modified: stats.mtime.toISOString(),
        };

        if (entry.isFile()) {
          node.size = stats.size;
        }

        // Add git status if available
        const gitStatus = gitStatusMap.get(relativePath);
        if (gitStatus) {
          node.gitStatus = gitStatus;
        }

        // Recursively get children for directories
        if (entry.isDirectory()) {
          node.children = await this.buildTree(
            projectRoot,
            entryPath,
            gitStatusMap,
            depth - 1
          );
        }

        nodes.push(node);
      } catch {
        // Skip files we can't stat
        continue;
      }
    }

    // Sort: directories first, then alphabetically
    nodes.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  }

  /**
   * Check if hidden file should be shown
   */
  private isAllowedHiddenFile(name: string): boolean {
    const allowed = new Set([
      '.env',
      '.env.local',
      '.env.development',
      '.env.production',
      '.env.example',
      '.gitignore',
      '.gitattributes',
      '.editorconfig',
      '.prettierrc',
      '.prettierrc.json',
      '.prettierrc.yaml',
      '.prettierrc.yml',
      '.eslintrc',
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yaml',
      '.eslintrc.yml',
      '.babelrc',
      '.babelrc.json',
      '.npmrc',
      '.nvmrc',
      '.node-version',
      '.python-version',
      '.ruby-version',
      '.dockerignore',
    ]);
    return allowed.has(name);
  }

  /**
   * Read file content
   */
  async readFile(projectPath: string, filePath: string): Promise<FileContentResponse> {
    const fullPath = this.validatePath(projectPath, filePath);

    // Check if file exists
    if (!existsSync(fullPath)) {
      throw new FileError('FILE_NOT_FOUND', `File not found: ${filePath}`, 404);
    }

    const stats = await stat(fullPath);

    // Check file size
    if (stats.size > MAX_FILE_SIZE) {
      throw new FileError(
        'FILE_TOO_LARGE',
        `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        413
      );
    }

    const isBinary = this.isBinaryFile(fullPath);

    let content: string;
    let encoding: 'utf-8' | 'base64';

    if (isBinary) {
      const buffer = await readFile(fullPath);
      content = buffer.toString('base64');
      encoding = 'base64';
    } else {
      content = await readFile(fullPath, 'utf-8');
      encoding = 'utf-8';
    }

    return {
      path: filePath,
      content,
      encoding,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      language: this.detectLanguage(fullPath),
    };
  }

  /**
   * Write file content
   */
  async writeFile(
    projectPath: string,
    filePath: string,
    request: WriteFileRequest
  ): Promise<WriteFileResponse> {
    const fullPath = this.validatePath(projectPath, filePath);
    const dir = dirname(fullPath);

    // Create directories if requested
    if (request.createDirectories && !existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // Check if directory exists
    if (!existsSync(dir)) {
      throw new FileError(
        'FILE_NOT_FOUND',
        `Parent directory does not exist: ${dirname(filePath)}`,
        404
      );
    }

    // Decode content if base64
    let content: string | Buffer = request.content;
    if (request.encoding === 'base64') {
      content = Buffer.from(request.content, 'base64');
    }

    await writeFile(fullPath, content);

    const stats = await stat(fullPath);

    return {
      path: filePath,
      size: stats.size,
      modified: stats.mtime.toISOString(),
    };
  }

  /**
   * Create a new file or directory
   */
  async createFile(projectPath: string, request: CreateFileRequest): Promise<CreateFileResponse> {
    const fullPath = this.validatePath(projectPath, request.path);

    // Check if already exists
    if (existsSync(fullPath)) {
      throw new FileError('ALREADY_EXISTS', `Path already exists: ${request.path}`, 409);
    }

    if (request.type === 'directory') {
      await mkdir(fullPath, { recursive: true });
    } else {
      // Ensure parent directory exists
      const dir = dirname(fullPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      await writeFile(fullPath, request.content || '');
    }

    return {
      path: request.path,
      type: request.type,
      created: true,
    };
  }

  /**
   * Delete a file or directory
   */
  async deleteFile(
    projectPath: string,
    filePath: string,
    recursive: boolean = false
  ): Promise<DeleteFileResponse> {
    const fullPath = this.validatePath(projectPath, filePath);

    // Check if exists
    if (!existsSync(fullPath)) {
      throw new FileError('FILE_NOT_FOUND', `File not found: ${filePath}`, 404);
    }

    const stats = await stat(fullPath);

    if (stats.isDirectory() && !recursive) {
      // Check if directory is empty
      const entries = await readdir(fullPath);
      if (entries.length > 0) {
        throw new FileError(
          'DIRECTORY_NOT_EMPTY',
          'Directory is not empty. Use recursive=true to delete.',
          400
        );
      }
    }

    await rm(fullPath, { recursive, force: true });

    return {
      path: filePath,
      deleted: true,
    };
  }

  /**
   * Move or rename a file
   */
  async moveFile(projectPath: string, request: MoveFileRequest): Promise<MoveFileResponse> {
    const sourceFull = this.validatePath(projectPath, request.sourcePath);
    const destFull = this.validatePath(projectPath, request.destinationPath);

    // Check source exists
    if (!existsSync(sourceFull)) {
      throw new FileError('FILE_NOT_FOUND', `Source not found: ${request.sourcePath}`, 404);
    }

    // Check destination doesn't exist (unless overwrite)
    if (existsSync(destFull) && !request.overwrite) {
      throw new FileError('ALREADY_EXISTS', `Destination already exists: ${request.destinationPath}`, 409);
    }

    // Ensure destination directory exists
    const destDir = dirname(destFull);
    if (!existsSync(destDir)) {
      await mkdir(destDir, { recursive: true });
    }

    await rename(sourceFull, destFull);

    return {
      oldPath: request.sourcePath,
      newPath: request.destinationPath,
      success: true,
    };
  }

  /**
   * Search files for pattern
   */
  async searchFiles(projectPath: string, request: SearchRequest): Promise<SearchResponse> {
    const searchPath = request.path
      ? this.validatePath(projectPath, request.path)
      : projectPath;

    const results: SearchResult[] = [];
    let totalMatches = 0;
    const maxResults = request.maxResults || MAX_SEARCH_RESULTS;

    // Build regex pattern
    let pattern: RegExp;
    try {
      if (request.regex) {
        pattern = new RegExp(request.pattern, request.caseSensitive ? 'g' : 'gi');
      } else {
        // Escape special regex chars for literal search
        const escaped = request.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = new RegExp(escaped, request.caseSensitive ? 'g' : 'gi');
      }
    } catch {
      throw new FileError('INVALID_PATH', 'Invalid search pattern', 400);
    }

    // Parse glob patterns
    const includePattern = request.includeGlob ? this.globToRegex(request.includeGlob) : null;
    const excludePattern = request.excludeGlob ? this.globToRegex(request.excludeGlob) : null;

    await this.searchInDirectory(
      projectPath,
      searchPath,
      pattern,
      includePattern,
      excludePattern,
      results,
      maxResults,
      { count: 0 }
    );

    for (const result of results) {
      totalMatches += result.matches.length;
    }

    return {
      results,
      totalMatches,
      truncated: totalMatches >= maxResults,
    };
  }

  /**
   * Convert glob pattern to regex
   */
  private globToRegex(glob: string): RegExp {
    const escaped = glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`, 'i');
  }

  /**
   * Recursively search directory for matches
   */
  private async searchInDirectory(
    projectRoot: string,
    dirPath: string,
    pattern: RegExp,
    includePattern: RegExp | null,
    excludePattern: RegExp | null,
    results: SearchResult[],
    maxResults: number,
    matchCount: { count: number }
  ): Promise<void> {
    if (matchCount.count >= maxResults) return;

    let entries;
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (matchCount.count >= maxResults) return;

      const name = entry.name;

      // Skip ignored directories
      if (entry.isDirectory() && this.shouldIgnoreDir(name)) {
        continue;
      }

      // Skip hidden files/directories
      if (name.startsWith('.')) {
        continue;
      }

      const entryPath = join(dirPath, name);
      const relativePath = entryPath.substring(projectRoot.length + 1);

      if (entry.isDirectory()) {
        await this.searchInDirectory(
          projectRoot,
          entryPath,
          pattern,
          includePattern,
          excludePattern,
          results,
          maxResults,
          matchCount
        );
      } else if (entry.isFile()) {
        // Skip binary files
        if (this.isBinaryFile(name)) {
          continue;
        }

        // Check include/exclude patterns
        if (includePattern && !includePattern.test(name)) {
          continue;
        }
        if (excludePattern && excludePattern.test(name)) {
          continue;
        }

        const matches = await this.searchInFile(entryPath, relativePath, pattern, maxResults - matchCount.count);
        if (matches.length > 0) {
          results.push({
            path: relativePath,
            matches,
          });
          matchCount.count += matches.length;
        }
      }
    }
  }

  /**
   * Search for pattern in a file
   */
  private async searchInFile(
    filePath: string,
    relativePath: string,
    pattern: RegExp,
    maxMatches: number
  ): Promise<SearchMatch[]> {
    const matches: SearchMatch[] = [];

    try {
      const stats = await stat(filePath);

      // Skip large files
      if (stats.size > WARN_FILE_SIZE) {
        return matches;
      }

      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length && matches.length < maxMatches; i++) {
        const line = lines[i];
        pattern.lastIndex = 0; // Reset regex state

        let match;
        while ((match = pattern.exec(line)) !== null && matches.length < maxMatches) {
          const searchMatch: SearchMatch = {
            line: i + 1,
            column: match.index + 1,
            content: line.trim(),
          };

          // Add context lines
          if (i > 0) {
            searchMatch.contextBefore = [lines[i - 1].trim()];
          }
          if (i < lines.length - 1) {
            searchMatch.contextAfter = [lines[i + 1].trim()];
          }

          matches.push(searchMatch);

          // Prevent infinite loop for zero-width matches
          if (match[0].length === 0) {
            pattern.lastIndex++;
          }
        }
      }
    } catch {
      // Skip files we can't read
    }

    return matches;
  }
}

export const fileService = new FileService();
