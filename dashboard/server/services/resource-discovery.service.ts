/**
 * Resource Discovery Service
 * Scans .claude directories for existing resources (skills, agents, commands)
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';
import { homedir } from 'os';
import * as yaml from 'js-yaml';

import type {
  Resource,
  SkillResource,
  AgentResource,
  CommandResource,
  HookResource,
  PermissionResource,
  ResourceType,
  ResourceCategory,
  ClaudeSettings,
  MCPResource,
  TrustLevel,
} from '../types/resource.types.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const PROJECT_ROOT = join(import.meta.dirname, '..', '..', '..');
const SANDBOX_DIR = join(PROJECT_ROOT, 'sandbox');
const PLATFORM_CLAUDE_DIR = join(PROJECT_ROOT, '.claude');
const GLOBAL_CLAUDE_DIR = join(homedir(), '.claude');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse YAML frontmatter from markdown file
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (match) {
    try {
      const frontmatter = yaml.load(match[1]) as Record<string, unknown>;
      return { frontmatter, body: match[2] };
    } catch {
      // Invalid YAML, return empty frontmatter
    }
  }
  return { frontmatter: {}, body: content };
}

/**
 * Extract description from markdown content
 */
function extractDescription(content: string): string {
  const { body } = parseFrontmatter(content);

  // Try to find first paragraph or header description
  const lines = body.split('\n').filter(l => l.trim());

  for (const line of lines) {
    // Skip headers
    if (line.startsWith('#')) continue;
    // Skip code blocks
    if (line.startsWith('```')) continue;
    // Return first content line
    if (line.trim().length > 10) {
      return line.trim().substring(0, 200);
    }
  }

  return 'No description available';
}

/**
 * Determine category from tags or content
 */
function inferCategory(name: string, content: string, tags: string[]): ResourceCategory {
  const lowerName = name.toLowerCase();
  const lowerContent = content.toLowerCase();
  const allTags = tags.map(t => t.toLowerCase());

  if (allTags.includes('testing') || lowerName.includes('test') || lowerName.includes('qa')) {
    return 'testing';
  }
  if (allTags.includes('devops') || lowerName.includes('devops') || lowerName.includes('deploy')) {
    return 'devops';
  }
  if (allTags.includes('design') || lowerName.includes('design') || lowerName.includes('ui')) {
    return 'design';
  }
  if (allTags.includes('api') || lowerName.includes('api') || lowerName.includes('backend')) {
    return 'development';
  }
  if (allTags.includes('database') || lowerName.includes('data') || lowerName.includes('db')) {
    return 'data';
  }
  if (allTags.includes('productivity')) {
    return 'productivity';
  }
  if (lowerContent.includes('integration') || lowerContent.includes('webhook')) {
    return 'integration';
  }

  return 'development';
}

/**
 * Generate unique ID for a resource
 */
function generateResourceId(type: ResourceType, name: string, scope: 'project' | 'global'): string {
  const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${type}-${scope}-${sanitized}`;
}

// =============================================================================
// RESOURCE DISCOVERY SERVICE
// =============================================================================

export class ResourceDiscoveryService {
  private projectRoot: string;
  private sandboxDir: string;

  constructor(options?: { projectRoot?: string; sandboxDir?: string }) {
    this.projectRoot = options?.projectRoot || PROJECT_ROOT;
    this.sandboxDir = options?.sandboxDir || SANDBOX_DIR;
  }

  // ===========================================================================
  // PUBLIC: DISCOVERY METHODS
  // ===========================================================================

  /**
   * Discover all resources from platform .claude directory
   */
  async discoverPlatformResources(): Promise<Resource[]> {
    const resources: Resource[] = [];

    const claudeDir = PLATFORM_CLAUDE_DIR;
    if (!existsSync(claudeDir)) {
      return resources;
    }

    // Discover skills
    const skillsDir = join(claudeDir, 'skills');
    if (existsSync(skillsDir)) {
      resources.push(...this.discoverSkills(skillsDir, 'project'));
    }

    // Discover agents
    const agentsDir = join(claudeDir, 'agents');
    if (existsSync(agentsDir)) {
      resources.push(...this.discoverAgents(agentsDir, 'project'));
    }

    // Discover commands
    const commandsDir = join(claudeDir, 'commands');
    if (existsSync(commandsDir)) {
      resources.push(...this.discoverCommands(commandsDir, 'project'));
    }

    // Discover hooks and permissions from settings
    const settingsPath = join(claudeDir, 'settings.json');
    if (existsSync(settingsPath)) {
      resources.push(...this.discoverFromSettings(settingsPath));
    }

    return resources;
  }

  /**
   * Discover all resources from a sandbox project
   */
  async discoverProjectResources(projectName: string): Promise<Resource[]> {
    const resources: Resource[] = [];

    const projectDir = join(this.sandboxDir, projectName, '.claude');
    if (!existsSync(projectDir)) {
      return resources;
    }

    // Discover skills
    const skillsDir = join(projectDir, 'skills');
    if (existsSync(skillsDir)) {
      resources.push(...this.discoverSkills(skillsDir, 'project'));
    }

    // Discover agents
    const agentsDir = join(projectDir, 'agents');
    if (existsSync(agentsDir)) {
      resources.push(...this.discoverAgents(agentsDir, 'project'));
    }

    // Discover commands
    const commandsDir = join(projectDir, 'commands');
    if (existsSync(commandsDir)) {
      resources.push(...this.discoverCommands(commandsDir, 'project'));
    }

    return resources;
  }

  /**
   * Discover global resources from ~/.claude
   */
  async discoverGlobalResources(): Promise<Resource[]> {
    const resources: Resource[] = [];

    if (!existsSync(GLOBAL_CLAUDE_DIR)) {
      return resources;
    }

    // Global settings
    const settingsPath = join(GLOBAL_CLAUDE_DIR, 'settings.json');
    if (existsSync(settingsPath)) {
      resources.push(...this.discoverFromSettings(settingsPath, 'global'));
    }

    return resources;
  }

  /**
   * Get all installed resources (platform + global)
   */
  async getAllInstalledResources(): Promise<Resource[]> {
    const platform = await this.discoverPlatformResources();
    const global = await this.discoverGlobalResources();

    // Merge, preferring platform resources over global
    const resourceMap = new Map<string, Resource>();

    for (const resource of global) {
      resourceMap.set(resource.id, resource);
    }

    for (const resource of platform) {
      resourceMap.set(resource.id, resource);
    }

    return Array.from(resourceMap.values());
  }

  /**
   * Get a single resource by ID
   */
  async getResourceById(id: string): Promise<Resource | null> {
    const resources = await this.getAllInstalledResources();
    return resources.find(r => r.id === id) || null;
  }

  /**
   * Get resource content (for markdown resources)
   */
  async getResourceContent(id: string): Promise<string | null> {
    const resource = await this.getResourceById(id);
    if (!resource || !resource.filePath) {
      return null;
    }

    try {
      return readFileSync(resource.filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  // ===========================================================================
  // PRIVATE: DISCOVERY HELPERS
  // ===========================================================================

  /**
   * Discover skills from a skills directory
   */
  private discoverSkills(skillsDir: string, scope: 'project' | 'global'): SkillResource[] {
    const skills: SkillResource[] = [];

    if (!existsSync(skillsDir)) {
      return skills;
    }

    const entries = readdirSync(skillsDir);

    for (const entry of entries) {
      const skillPath = join(skillsDir, entry);
      const stat = statSync(skillPath);

      if (stat.isDirectory()) {
        // Look for SKILL.md in directory
        const skillFile = join(skillPath, 'SKILL.md');
        if (existsSync(skillFile)) {
          const skill = this.parseSkillFile(skillFile, entry, scope);
          if (skill) {
            skills.push(skill);
          }
        }
      } else if (entry.endsWith('.md')) {
        // Single file skill
        const skill = this.parseSkillFile(skillPath, entry.replace('.md', ''), scope);
        if (skill) {
          skills.push(skill);
        }
      }
    }

    return skills;
  }

  /**
   * Parse a skill file
   */
  private parseSkillFile(filePath: string, name: string, scope: 'project' | 'global'): SkillResource | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);

      const displayName = (frontmatter.name as string) || name;
      const description = (frontmatter.description as string) || extractDescription(body);
      const allowedTools = (frontmatter['allowed-tools'] as string)?.split(',').map(t => t.trim()) || [];

      return {
        id: generateResourceId('skill', displayName, scope),
        name: displayName,
        description,
        type: 'skill',
        source: 'local',
        category: inferCategory(displayName, content, []),
        tags: [],
        installed: true,
        enabled: true,
        filePath,
        content,
        trustLevel: 'high', // Local resources are trusted
        frontmatter,
        allowedTools,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to parse skill file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Discover agents from an agents directory
   */
  private discoverAgents(agentsDir: string, scope: 'project' | 'global'): AgentResource[] {
    const agents: AgentResource[] = [];

    if (!existsSync(agentsDir)) {
      return agents;
    }

    const entries = readdirSync(agentsDir);

    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue;

      const agentPath = join(agentsDir, entry);
      const agent = this.parseAgentFile(agentPath, entry.replace('.md', ''), scope);
      if (agent) {
        agents.push(agent);
      }
    }

    return agents;
  }

  /**
   * Parse an agent file
   */
  private parseAgentFile(filePath: string, name: string, scope: 'project' | 'global'): AgentResource | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);

      const displayName = (frontmatter.name as string) || name;
      const description = (frontmatter.description as string) || extractDescription(body);
      const model = frontmatter.model as string | undefined;
      const tools = (frontmatter.tools as string)?.split(',').map(t => t.trim()) || [];

      return {
        id: generateResourceId('agent', displayName, scope),
        name: displayName,
        description,
        type: 'agent',
        source: 'local',
        category: inferCategory(displayName, content, []),
        tags: [],
        installed: true,
        enabled: true,
        filePath,
        content,
        trustLevel: 'high',
        frontmatter,
        model,
        tools,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to parse agent file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Discover commands from a commands directory
   */
  private discoverCommands(commandsDir: string, scope: 'project' | 'global'): CommandResource[] {
    const commands: CommandResource[] = [];

    if (!existsSync(commandsDir)) {
      return commands;
    }

    const entries = readdirSync(commandsDir);

    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue;

      const commandPath = join(commandsDir, entry);
      const command = this.parseCommandFile(commandPath, entry.replace('.md', ''), scope);
      if (command) {
        commands.push(command);
      }
    }

    return commands;
  }

  /**
   * Parse a command file
   */
  private parseCommandFile(filePath: string, name: string, scope: 'project' | 'global'): CommandResource | null {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);

      const displayName = (frontmatter.name as string) || name;
      const description = (frontmatter.description as string) || extractDescription(body);
      const hasArguments = content.includes('$ARGUMENTS') || content.includes('{{arguments}}');

      return {
        id: generateResourceId('command', displayName, scope),
        name: displayName,
        description,
        type: 'command',
        source: 'local',
        category: inferCategory(displayName, content, []),
        tags: [],
        installed: true,
        enabled: true,
        filePath,
        content,
        trustLevel: 'high',
        frontmatter,
        hasArguments,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to parse command file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Discover hooks and MCPs from settings.json
   */
  private discoverFromSettings(settingsPath: string, scope: 'project' | 'global' = 'project'): Resource[] {
    const resources: Resource[] = [];

    try {
      const content = readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content) as ClaudeSettings;

      // Discover MCP servers
      if (settings.mcpServers) {
        for (const [name, config] of Object.entries(settings.mcpServers)) {
          const mcp: MCPResource = {
            id: generateResourceId('mcp', name, scope),
            name,
            description: `MCP Server: ${config.command}`,
            type: 'mcp',
            source: 'local',
            category: 'development',
            tags: [],
            installed: true,
            enabled: true,
            trustLevel: 'medium',
            package: config.command.includes('npx') ? config.args?.[0] || config.command : config.command,
            command: config.command,
            args: config.args || [],
            env: config.env,
            requiresConfig: false,
          };
          resources.push(mcp);
        }
      }

      // Discover hooks
      if (settings.hooks) {
        for (const [event, hookConfigs] of Object.entries(settings.hooks)) {
          if (Array.isArray(hookConfigs)) {
            for (let i = 0; i < hookConfigs.length; i++) {
              const hookConfig = hookConfigs[i];
              const hook: HookResource = {
                id: generateResourceId('hook', `${event}-${i}`, scope),
                name: `${event} hook`,
                description: `Hook: ${hookConfig.command}`,
                type: 'hook',
                source: 'local',
                category: 'integration',
                tags: [],
                installed: true,
                enabled: true,
                trustLevel: 'high',
                event: event as any,
                command: hookConfig.command,
                runInBackground: hookConfig.runInBackground,
              };
              resources.push(hook);
            }
          }
        }
      }

      // Discover permissions
      if (settings.permissions) {
        if (settings.permissions.allow) {
          for (let i = 0; i < settings.permissions.allow.length; i++) {
            const pattern = settings.permissions.allow[i];
            const perm: PermissionResource = {
              id: generateResourceId('permission', `allow-${i}`, scope),
              name: `Allow: ${pattern}`,
              description: `Permission to allow: ${pattern}`,
              type: 'permission',
              source: 'local',
              category: 'other',
              tags: [],
              installed: true,
              enabled: true,
              trustLevel: 'high',
              pattern,
              action: 'allow',
            };
            resources.push(perm);
          }
        }

        if (settings.permissions.deny) {
          for (let i = 0; i < settings.permissions.deny.length; i++) {
            const pattern = settings.permissions.deny[i];
            const perm: PermissionResource = {
              id: generateResourceId('permission', `deny-${i}`, scope),
              name: `Deny: ${pattern}`,
              description: `Permission to deny: ${pattern}`,
              type: 'permission',
              source: 'local',
              category: 'other',
              tags: [],
              installed: true,
              enabled: true,
              trustLevel: 'high',
              pattern,
              action: 'deny',
            };
            resources.push(perm);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to parse settings file ${settingsPath}:`, error);
    }

    return resources;
  }

  // ===========================================================================
  // PUBLIC: SANDBOX PROJECT HELPERS
  // ===========================================================================

  /**
   * List all sandbox projects
   */
  async listSandboxProjects(): Promise<string[]> {
    if (!existsSync(this.sandboxDir)) {
      return [];
    }

    const entries = readdirSync(this.sandboxDir);
    const projects: string[] = [];

    for (const entry of entries) {
      if (entry.startsWith('.')) continue;
      const projectPath = join(this.sandboxDir, entry);
      const stat = statSync(projectPath);
      if (stat.isDirectory()) {
        projects.push(entry);
      }
    }

    return projects;
  }

  /**
   * Check if project has .claude directory
   */
  hasClaudeDir(projectName: string): boolean {
    const claudeDir = join(this.sandboxDir, projectName, '.claude');
    return existsSync(claudeDir);
  }
}

// Export singleton instance
export const resourceDiscoveryService = new ResourceDiscoveryService();
