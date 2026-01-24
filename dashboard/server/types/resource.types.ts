/**
 * Resource Types
 * Types for the Resources Hub - skills, agents, commands, MCPs, plugins, hooks
 */

// =============================================================================
// RESOURCE TYPE DEFINITIONS
// =============================================================================

export type ResourceType =
  | 'skill'
  | 'agent'
  | 'command'
  | 'mcp'
  | 'plugin'
  | 'hook'
  | 'permission';

export type ResourceScope = 'project' | 'global';

export type ResourceSource =
  | 'local'           // Existing in .claude directory
  | 'marketplace'     // From curated external catalog
  | 'url'             // From a URL
  | 'custom';         // Created by user

export type TrustLevel = 'high' | 'medium' | 'low' | 'unknown';

export type ResourceCategory =
  | 'development'
  | 'productivity'
  | 'ai'
  | 'data'
  | 'testing'
  | 'devops'
  | 'design'
  | 'integration'
  | 'other';

// =============================================================================
// BASE RESOURCE INTERFACE
// =============================================================================

export interface BaseResource {
  id: string;
  name: string;
  description: string;
  type: ResourceType;
  source: ResourceSource;
  category: ResourceCategory;
  tags: string[];
  installed: boolean;
  enabled: boolean;

  // For markdown resources
  filePath?: string;
  content?: string;

  // Metadata
  version?: string;
  author?: string;
  repository?: string;
  stars?: number;

  // Security
  trustLevel: TrustLevel;
  warning?: string;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  installedAt?: string;
}

// =============================================================================
// SPECIFIC RESOURCE TYPES
// =============================================================================

export interface SkillResource extends BaseResource {
  type: 'skill';
  allowedTools?: string[];
  frontmatter?: Record<string, unknown>;
}

export interface AgentResource extends BaseResource {
  type: 'agent';
  model?: string;
  tools?: string[];
  frontmatter?: Record<string, unknown>;
}

export interface CommandResource extends BaseResource {
  type: 'command';
  hasArguments?: boolean;
  frontmatter?: Record<string, unknown>;
}

export interface MCPResource extends BaseResource {
  type: 'mcp';
  package: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  requiresConfig: boolean;
  configSchema?: ConfigSchema;
}

export interface PluginResource extends BaseResource {
  type: 'plugin';
  installCommand?: string;
  setupInstructions?: string;
  env?: Record<string, string>;
  requiresConfig: boolean;
  configSchema?: ConfigSchema;
}

export interface HookResource extends BaseResource {
  type: 'hook';
  event: HookEvent;
  command: string;
  runInBackground?: boolean;
}

export interface PermissionResource extends BaseResource {
  type: 'permission';
  pattern: string;
  action: 'allow' | 'deny';
}

// =============================================================================
// HOOK TYPES
// =============================================================================

export type HookEvent =
  | 'user-prompt-submit'
  | 'stop'
  | 'pre-tool-use'
  | 'post-tool-use'
  | 'notification'
  | 'shell-command'
  | 'subagent-spawn'
  | 'subagent-complete';

export interface HookConfig {
  event: HookEvent;
  command: string;
  matcher?: {
    tool_name?: string;
    input_contains?: string;
  };
  runInBackground?: boolean;
}

// =============================================================================
// CONFIG SCHEMA
// =============================================================================

export interface ConfigField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'password';
  label: string;
  description?: string;
  required: boolean;
  default?: string | number | boolean;
  options?: string[]; // For select type
  placeholder?: string;
  envVar?: string; // Environment variable name
}

export interface ConfigSchema {
  fields: ConfigField[];
}

// =============================================================================
// UNIFIED RESOURCE TYPE
// =============================================================================

export type Resource =
  | SkillResource
  | AgentResource
  | CommandResource
  | MCPResource
  | PluginResource
  | HookResource
  | PermissionResource;

// =============================================================================
// MARKETPLACE TYPES
// =============================================================================

export interface MarketplaceCatalog {
  version: string;
  updatedAt: string;
  resources: MarketplaceEntry[];
}

export interface MarketplaceEntry {
  id: string;
  name: string;
  description: string;
  type: ResourceType;
  category: ResourceCategory;
  tags: string[];

  // Source info
  sourceRepo: string;
  sourcePath: string;
  sourceUrl: string;

  // Quality indicators
  stars?: number;
  trustLevel: TrustLevel;
  verified: boolean;
  quality: 'high' | 'medium' | 'low' | 'unknown';
  warning?: string;

  // For MCPs/Plugins
  package?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  requiresConfig?: boolean;
  configSchema?: ConfigSchema;

  // For markdown resources
  contentUrl?: string;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface InstallResourceRequest {
  resourceId: string;
  type: ResourceType;
  source: ResourceSource;
  scope: ResourceScope;
  targetProject?: string; // Sandbox project name
  config?: Record<string, string>;
  content?: string; // For custom content
}

export interface CreateResourceRequest {
  name: string;
  type: 'skill' | 'agent' | 'command';
  description: string;
  content: string;
  category?: ResourceCategory;
  tags?: string[];
}

export interface UpdateResourceRequest {
  name?: string;
  description?: string;
  content?: string;
  enabled?: boolean;
}

export interface ResourceListResponse {
  resources: Resource[];
  total: number;
  byType: Record<ResourceType, number>;
}

export interface ProjectResourceConfig {
  projectId: string;
  projectName: string;
  enabledResources: string[]; // Resource IDs
  disabledResources: string[]; // Resource IDs that override default
  customConfig: Record<string, Record<string, unknown>>; // Per-resource config
}

// =============================================================================
// SETTINGS.JSON TYPES (Claude Code config)
// =============================================================================

export interface ClaudeSettings {
  mcpServers?: Record<string, MCPServerConfig>;
  hooks?: Record<string, HookConfig[]>;
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
  model?: string;
  theme?: string;
}

export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
