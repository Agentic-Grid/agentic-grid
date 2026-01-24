/**
 * Resource Installer Service
 * Handles installing, creating, editing, and removing resources
 * Propagates changes to all sandbox projects
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  readdirSync,
  statSync,
  copyFileSync,
  rmSync,
} from 'fs';
import { join, dirname, basename } from 'path';
import { homedir } from 'os';
import * as yaml from 'js-yaml';

import type {
  Resource,
  ResourceType,
  CreateResourceRequest,
  UpdateResourceRequest,
  InstallResourceRequest,
  ClaudeSettings,
  MCPServerConfig,
  HookConfig,
  MarketplaceEntry,
} from '../types/resource.types.js';
import { resourceDiscoveryService } from './resource-discovery.service.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const PROJECT_ROOT = join(import.meta.dirname, '..', '..', '..');
const SANDBOX_DIR = join(PROJECT_ROOT, 'sandbox');
const PLATFORM_CLAUDE_DIR = join(PROJECT_ROOT, '.claude');
const GLOBAL_CLAUDE_DIR = join(homedir(), '.claude');

// =============================================================================
// ERROR CLASSES
// =============================================================================

export class ResourceError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = 'ResourceError';
  }
}

// =============================================================================
// RESOURCE INSTALLER SERVICE
// =============================================================================

export class ResourceInstallerService {
  private projectRoot: string;
  private sandboxDir: string;
  private platformClaudeDir: string;

  constructor(options?: {
    projectRoot?: string;
    sandboxDir?: string;
    platformClaudeDir?: string;
  }) {
    this.projectRoot = options?.projectRoot || PROJECT_ROOT;
    this.sandboxDir = options?.sandboxDir || SANDBOX_DIR;
    this.platformClaudeDir = options?.platformClaudeDir || PLATFORM_CLAUDE_DIR;
  }

  // ===========================================================================
  // PUBLIC: CREATE RESOURCES
  // ===========================================================================

  /**
   * Create a new markdown-based resource (skill, agent, or command)
   */
  async createResource(request: CreateResourceRequest): Promise<Resource> {
    const { name, type, description, content, category, tags } = request;

    // Validate type
    if (!['skill', 'agent', 'command'].includes(type)) {
      throw new ResourceError(
        'INVALID_TYPE',
        `Cannot create resource of type '${type}'. Only skill, agent, and command can be created.`,
        400,
      );
    }

    // Validate name
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!sanitizedName || sanitizedName.length < 2) {
      throw new ResourceError('INVALID_NAME', 'Resource name must be at least 2 characters', 400);
    }

    // Get target directory
    const targetDir = this.getResourceDirectory(type);
    this.ensureDirectoryExists(targetDir);

    // Determine file path
    let filePath: string;
    if (type === 'skill') {
      // Skills go in subdirectory with SKILL.md
      const skillDir = join(targetDir, sanitizedName);
      this.ensureDirectoryExists(skillDir);
      filePath = join(skillDir, 'SKILL.md');
    } else {
      // Agents and commands are single files
      filePath = join(targetDir, `${sanitizedName}.md`);
    }

    // Check if exists
    if (existsSync(filePath)) {
      throw new ResourceError(
        'ALREADY_EXISTS',
        `Resource '${name}' already exists`,
        409,
      );
    }

    // Build frontmatter
    const frontmatter = this.buildFrontmatter(type, {
      name: sanitizedName,
      description,
    });

    // Combine frontmatter and content
    const fullContent = `---\n${yaml.dump(frontmatter)}---\n\n${content}`;

    // Write file
    writeFileSync(filePath, fullContent, 'utf-8');

    // Propagate to all sandbox projects
    await this.propagateToSandboxProjects(type, sanitizedName, fullContent);

    // Return created resource
    const resource = await resourceDiscoveryService.getResourceById(
      `${type}-project-${sanitizedName}`,
    );

    if (!resource) {
      throw new ResourceError('CREATE_FAILED', 'Failed to create resource', 500);
    }

    return resource;
  }

  /**
   * Update an existing resource
   */
  async updateResource(id: string, request: UpdateResourceRequest): Promise<Resource> {
    const resource = await resourceDiscoveryService.getResourceById(id);

    if (!resource) {
      throw new ResourceError('NOT_FOUND', `Resource '${id}' not found`, 404);
    }

    if (!resource.filePath) {
      throw new ResourceError(
        'NOT_EDITABLE',
        'This resource cannot be edited (no file path)',
        400,
      );
    }

    // Read current content
    let content = readFileSync(resource.filePath, 'utf-8');

    // Update content if provided
    if (request.content !== undefined) {
      content = request.content;
    }

    // Update frontmatter if name or description changed
    if (request.name || request.description) {
      const { frontmatter, body } = this.parseFrontmatter(content);

      if (request.name) {
        frontmatter.name = request.name;
      }
      if (request.description) {
        frontmatter.description = request.description;
      }

      const newFrontmatter = yaml.dump(frontmatter);
      content = `---\n${newFrontmatter}---\n\n${request.content !== undefined ? request.content : body}`;
    }

    // Write updated content
    writeFileSync(resource.filePath, content, 'utf-8');

    // Propagate to all sandbox projects
    await this.propagateToSandboxProjects(
      resource.type,
      resource.name,
      content,
    );

    // Return updated resource
    const updated = await resourceDiscoveryService.getResourceById(id);
    if (!updated) {
      throw new ResourceError('UPDATE_FAILED', 'Failed to update resource', 500);
    }

    return updated;
  }

  /**
   * Delete a resource
   */
  async deleteResource(id: string): Promise<void> {
    const resource = await resourceDiscoveryService.getResourceById(id);

    if (!resource) {
      throw new ResourceError('NOT_FOUND', `Resource '${id}' not found`, 404);
    }

    if (!resource.filePath) {
      throw new ResourceError(
        'NOT_DELETABLE',
        'This resource cannot be deleted (no file path)',
        400,
      );
    }

    // For skills, delete the entire directory
    if (resource.type === 'skill') {
      const skillDir = dirname(resource.filePath);
      if (existsSync(skillDir)) {
        rmSync(skillDir, { recursive: true, force: true });
      }
    } else {
      // For agents and commands, delete the file
      if (existsSync(resource.filePath)) {
        unlinkSync(resource.filePath);
      }
    }

    // Remove from all sandbox projects
    await this.removeFromSandboxProjects(resource.type, resource.name);
  }

  // ===========================================================================
  // PUBLIC: INSTALL FROM MARKETPLACE
  // ===========================================================================

  /**
   * Install a resource from the marketplace
   */
  async installFromMarketplace(entry: MarketplaceEntry, config?: Record<string, string>): Promise<Resource> {
    switch (entry.type) {
      case 'skill':
      case 'agent':
      case 'command':
        return this.installMarkdownResource(entry);

      case 'mcp':
        return this.installMCPServer(entry, config);

      case 'plugin':
        throw new ResourceError(
          'MANUAL_INSTALL_REQUIRED',
          'Plugins require manual installation. Please follow the setup instructions.',
          400,
        );

      default:
        throw new ResourceError(
          'UNSUPPORTED_TYPE',
          `Cannot install resource of type '${entry.type}'`,
          400,
        );
    }
  }

  /**
   * Install a markdown-based resource from marketplace
   */
  private async installMarkdownResource(entry: MarketplaceEntry): Promise<Resource> {
    if (!entry.contentUrl) {
      throw new ResourceError(
        'NO_CONTENT_URL',
        'Marketplace entry has no content URL',
        400,
      );
    }

    // Fetch content from URL
    const response = await fetch(entry.contentUrl);
    if (!response.ok) {
      throw new ResourceError(
        'FETCH_FAILED',
        `Failed to fetch resource content: ${response.statusText}`,
        500,
      );
    }

    const content = await response.text();

    // Create the resource
    return this.createResource({
      name: entry.name,
      type: entry.type as 'skill' | 'agent' | 'command',
      description: entry.description,
      content,
      category: entry.category,
      tags: entry.tags,
    });
  }

  /**
   * Install an MCP server
   */
  private async installMCPServer(
    entry: MarketplaceEntry,
    config?: Record<string, string>,
  ): Promise<Resource> {
    if (!entry.command) {
      throw new ResourceError(
        'INVALID_MCP',
        'MCP entry missing command',
        400,
      );
    }

    // Build MCP server config
    const mcpConfig: MCPServerConfig = {
      command: entry.command,
      args: entry.args || [],
      env: { ...entry.env },
    };

    // Apply user config (environment variables)
    if (config && entry.configSchema) {
      for (const field of entry.configSchema.fields) {
        if (field.envVar && config[field.name]) {
          mcpConfig.env = mcpConfig.env || {};
          mcpConfig.env[field.envVar] = config[field.name];
        }
      }
    }

    // Update settings.json in platform .claude directory
    const settingsPath = join(this.platformClaudeDir, 'settings.json');
    const settings = this.loadSettings(settingsPath);

    settings.mcpServers = settings.mcpServers || {};
    settings.mcpServers[entry.name] = mcpConfig;

    this.saveSettings(settingsPath, settings);

    // Propagate to all sandbox projects
    await this.propagateMCPToSandboxProjects(entry.name, mcpConfig);

    // Return installed resource
    const resource = await resourceDiscoveryService.getResourceById(
      `mcp-project-${entry.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    );

    if (!resource) {
      // Build a resource object manually
      return {
        id: `mcp-project-${entry.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: entry.name,
        description: entry.description,
        type: 'mcp',
        source: 'marketplace',
        category: entry.category,
        tags: entry.tags,
        installed: true,
        enabled: true,
        trustLevel: entry.trustLevel,
        package: entry.package || entry.command,
        command: entry.command,
        args: entry.args || [],
        env: mcpConfig.env,
        requiresConfig: entry.requiresConfig || false,
        installedAt: new Date().toISOString(),
      };
    }

    return resource;
  }

  /**
   * Uninstall an MCP server
   */
  async uninstallMCPServer(name: string): Promise<void> {
    // Remove from platform settings
    const settingsPath = join(this.platformClaudeDir, 'settings.json');
    const settings = this.loadSettings(settingsPath);

    if (settings.mcpServers && settings.mcpServers[name]) {
      delete settings.mcpServers[name];
      this.saveSettings(settingsPath, settings);
    }

    // Remove from all sandbox projects
    await this.removeMCPFromSandboxProjects(name);
  }

  // ===========================================================================
  // PUBLIC: HOOKS MANAGEMENT
  // ===========================================================================

  /**
   * Add a hook
   */
  async addHook(event: string, command: string, runInBackground?: boolean): Promise<void> {
    const settingsPath = join(this.platformClaudeDir, 'settings.json');
    const settings = this.loadSettings(settingsPath);

    settings.hooks = settings.hooks || {};
    settings.hooks[event] = settings.hooks[event] || [];

    const hookConfig: HookConfig = {
      event: event as any,
      command,
      runInBackground,
    };

    settings.hooks[event].push(hookConfig);

    this.saveSettings(settingsPath, settings);

    // Propagate to sandbox projects
    await this.propagateSettingsToSandboxProjects();
  }

  /**
   * Remove a hook
   */
  async removeHook(event: string, index: number): Promise<void> {
    const settingsPath = join(this.platformClaudeDir, 'settings.json');
    const settings = this.loadSettings(settingsPath);

    if (settings.hooks && settings.hooks[event]) {
      settings.hooks[event].splice(index, 1);
      if (settings.hooks[event].length === 0) {
        delete settings.hooks[event];
      }
      this.saveSettings(settingsPath, settings);
    }

    // Propagate to sandbox projects
    await this.propagateSettingsToSandboxProjects();
  }

  // ===========================================================================
  // PUBLIC: PERMISSIONS MANAGEMENT
  // ===========================================================================

  /**
   * Add a permission
   */
  async addPermission(pattern: string, action: 'allow' | 'deny'): Promise<void> {
    const settingsPath = join(this.platformClaudeDir, 'settings.json');
    const settings = this.loadSettings(settingsPath);

    settings.permissions = settings.permissions || {};

    if (action === 'allow') {
      settings.permissions.allow = settings.permissions.allow || [];
      if (!settings.permissions.allow.includes(pattern)) {
        settings.permissions.allow.push(pattern);
      }
    } else {
      settings.permissions.deny = settings.permissions.deny || [];
      if (!settings.permissions.deny.includes(pattern)) {
        settings.permissions.deny.push(pattern);
      }
    }

    this.saveSettings(settingsPath, settings);

    // Propagate to sandbox projects
    await this.propagateSettingsToSandboxProjects();
  }

  /**
   * Remove a permission
   */
  async removePermission(pattern: string, action: 'allow' | 'deny'): Promise<void> {
    const settingsPath = join(this.platformClaudeDir, 'settings.json');
    const settings = this.loadSettings(settingsPath);

    if (settings.permissions) {
      if (action === 'allow' && settings.permissions.allow) {
        settings.permissions.allow = settings.permissions.allow.filter(p => p !== pattern);
      }
      if (action === 'deny' && settings.permissions.deny) {
        settings.permissions.deny = settings.permissions.deny.filter(p => p !== pattern);
      }

      this.saveSettings(settingsPath, settings);
    }

    // Propagate to sandbox projects
    await this.propagateSettingsToSandboxProjects();
  }

  // ===========================================================================
  // PRIVATE: PROPAGATION HELPERS
  // ===========================================================================

  /**
   * Propagate a markdown resource to all sandbox projects
   */
  private async propagateToSandboxProjects(
    type: ResourceType,
    name: string,
    content: string,
  ): Promise<void> {
    const projects = await resourceDiscoveryService.listSandboxProjects();

    for (const projectName of projects) {
      const projectClaudeDir = join(this.sandboxDir, projectName, '.claude');

      // Only propagate if project has .claude directory
      if (!existsSync(projectClaudeDir)) {
        continue;
      }

      const typeDir = this.getTypeDirectory(type);
      const targetDir = join(projectClaudeDir, typeDir);
      this.ensureDirectoryExists(targetDir);

      let filePath: string;
      if (type === 'skill') {
        const skillDir = join(targetDir, name);
        this.ensureDirectoryExists(skillDir);
        filePath = join(skillDir, 'SKILL.md');
      } else {
        filePath = join(targetDir, `${name}.md`);
      }

      writeFileSync(filePath, content, 'utf-8');
    }
  }

  /**
   * Remove a resource from all sandbox projects
   */
  private async removeFromSandboxProjects(type: ResourceType, name: string): Promise<void> {
    const projects = await resourceDiscoveryService.listSandboxProjects();

    for (const projectName of projects) {
      const projectClaudeDir = join(this.sandboxDir, projectName, '.claude');

      if (!existsSync(projectClaudeDir)) {
        continue;
      }

      const typeDir = this.getTypeDirectory(type);
      const targetDir = join(projectClaudeDir, typeDir);

      if (type === 'skill') {
        const skillDir = join(targetDir, name);
        if (existsSync(skillDir)) {
          rmSync(skillDir, { recursive: true, force: true });
        }
      } else {
        const filePath = join(targetDir, `${name}.md`);
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      }
    }
  }

  /**
   * Propagate MCP server config to all sandbox projects
   */
  private async propagateMCPToSandboxProjects(
    name: string,
    config: MCPServerConfig,
  ): Promise<void> {
    const projects = await resourceDiscoveryService.listSandboxProjects();

    for (const projectName of projects) {
      const projectClaudeDir = join(this.sandboxDir, projectName, '.claude');

      if (!existsSync(projectClaudeDir)) {
        continue;
      }

      const settingsPath = join(projectClaudeDir, 'settings.json');
      const settings = this.loadSettings(settingsPath);

      settings.mcpServers = settings.mcpServers || {};
      settings.mcpServers[name] = config;

      this.saveSettings(settingsPath, settings);
    }
  }

  /**
   * Remove MCP server from all sandbox projects
   */
  private async removeMCPFromSandboxProjects(name: string): Promise<void> {
    const projects = await resourceDiscoveryService.listSandboxProjects();

    for (const projectName of projects) {
      const projectClaudeDir = join(this.sandboxDir, projectName, '.claude');

      if (!existsSync(projectClaudeDir)) {
        continue;
      }

      const settingsPath = join(projectClaudeDir, 'settings.json');
      const settings = this.loadSettings(settingsPath);

      if (settings.mcpServers && settings.mcpServers[name]) {
        delete settings.mcpServers[name];
        this.saveSettings(settingsPath, settings);
      }
    }
  }

  /**
   * Propagate settings (hooks, permissions) to all sandbox projects
   */
  private async propagateSettingsToSandboxProjects(): Promise<void> {
    const platformSettingsPath = join(this.platformClaudeDir, 'settings.json');
    const platformSettings = this.loadSettings(platformSettingsPath);

    const projects = await resourceDiscoveryService.listSandboxProjects();

    for (const projectName of projects) {
      const projectClaudeDir = join(this.sandboxDir, projectName, '.claude');

      if (!existsSync(projectClaudeDir)) {
        continue;
      }

      const settingsPath = join(projectClaudeDir, 'settings.json');
      const projectSettings = this.loadSettings(settingsPath);

      // Merge hooks
      if (platformSettings.hooks) {
        projectSettings.hooks = { ...platformSettings.hooks };
      }

      // Merge permissions
      if (platformSettings.permissions) {
        projectSettings.permissions = { ...platformSettings.permissions };
      }

      this.saveSettings(settingsPath, projectSettings);
    }
  }

  // ===========================================================================
  // PRIVATE: HELPER METHODS
  // ===========================================================================

  private getResourceDirectory(type: ResourceType): string {
    const typeDir = this.getTypeDirectory(type);
    return join(this.platformClaudeDir, typeDir);
  }

  private getTypeDirectory(type: ResourceType): string {
    switch (type) {
      case 'skill':
        return 'skills';
      case 'agent':
        return 'agents';
      case 'command':
        return 'commands';
      default:
        throw new ResourceError('INVALID_TYPE', `Invalid resource type: ${type}`, 400);
    }
  }

  private ensureDirectoryExists(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private buildFrontmatter(
    type: ResourceType,
    data: { name: string; description: string },
  ): Record<string, unknown> {
    const frontmatter: Record<string, unknown> = {
      name: data.name,
      description: data.description,
    };

    if (type === 'skill') {
      frontmatter['allowed-tools'] = 'Read, Write, Edit, Bash, Grep, Glob';
    }

    if (type === 'agent') {
      frontmatter.tools = 'Read, Write, Edit, Bash, Grep, Glob';
      frontmatter.model = 'claude-sonnet-4-20250514';
    }

    return frontmatter;
  }

  private parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (match) {
      try {
        const frontmatter = yaml.load(match[1]) as Record<string, unknown>;
        return { frontmatter, body: match[2] };
      } catch {
        // Invalid YAML
      }
    }
    return { frontmatter: {}, body: content };
  }

  private loadSettings(path: string): ClaudeSettings {
    if (!existsSync(path)) {
      return {};
    }
    try {
      const content = readFileSync(path, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private saveSettings(path: string, settings: ClaudeSettings): void {
    this.ensureDirectoryExists(dirname(path));
    writeFileSync(path, JSON.stringify(settings, null, 2), 'utf-8');
  }
}

// Export singleton instance
export const resourceInstallerService = new ResourceInstallerService();
