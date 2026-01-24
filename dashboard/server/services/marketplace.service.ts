/**
 * Marketplace Service
 * Curated catalog of external resources from verified sources
 * Resources are NOT installed by default - user must explicitly install
 */

import type {
  MarketplaceEntry,
  MarketplaceCatalog,
  ResourceType,
  ResourceCategory,
  TrustLevel,
  ConfigSchema,
} from '../types/resource.types.js';

// =============================================================================
// CURATED MARKETPLACE CATALOG
// =============================================================================

/**
 * Curated catalog of external resources
 * Organized by source repository with quality ratings
 */
const MARKETPLACE_CATALOG: MarketplaceCatalog = {
  version: '1.0.0',
  updatedAt: new Date().toISOString(),
  resources: [
    // =========================================================================
    // OFFICIAL MCP SERVERS (Anthropic)
    // Trust Level: HIGH
    // =========================================================================
    {
      id: 'mcp-filesystem',
      name: 'Filesystem',
      description: 'Read, write, and manage files on the local filesystem',
      type: 'mcp',
      category: 'development',
      tags: ['files', 'io', 'core'],
      sourceRepo: 'modelcontextprotocol/servers',
      sourcePath: 'src/filesystem',
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      stars: 15000,
      trustLevel: 'high',
      verified: true,
      quality: 'high',
      package: '@modelcontextprotocol/server-filesystem',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/dir'],
      requiresConfig: true,
      configSchema: {
        fields: [
          {
            name: 'allowedDir',
            type: 'string',
            label: 'Allowed Directory',
            description: 'The directory path that the MCP server can access',
            required: true,
            placeholder: '/Users/username/projects',
          },
        ],
      },
    },
    {
      id: 'mcp-memory',
      name: 'Memory',
      description: 'Persistent knowledge graph for long-term memory across sessions',
      type: 'mcp',
      category: 'ai',
      tags: ['memory', 'knowledge-graph', 'persistence'],
      sourceRepo: 'modelcontextprotocol/servers',
      sourcePath: 'src/memory',
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      stars: 15000,
      trustLevel: 'high',
      verified: true,
      quality: 'high',
      package: '@modelcontextprotocol/server-memory',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      requiresConfig: false,
    },
    {
      id: 'mcp-git',
      name: 'Git',
      description: 'Git repository operations including status, diff, log, and commits',
      type: 'mcp',
      category: 'development',
      tags: ['git', 'version-control', 'scm'],
      sourceRepo: 'modelcontextprotocol/servers',
      sourcePath: 'src/git',
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      stars: 15000,
      trustLevel: 'high',
      verified: true,
      quality: 'high',
      package: '@modelcontextprotocol/server-git',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-git'],
      requiresConfig: false,
    },
    {
      id: 'mcp-fetch',
      name: 'Fetch',
      description: 'HTTP fetch capabilities with caching',
      type: 'mcp',
      category: 'productivity',
      tags: ['http', 'web', 'api'],
      sourceRepo: 'modelcontextprotocol/servers',
      sourcePath: 'src/fetch',
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      stars: 15000,
      trustLevel: 'high',
      verified: true,
      quality: 'high',
      package: '@modelcontextprotocol/server-fetch',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-fetch'],
      requiresConfig: false,
    },
    {
      id: 'mcp-postgres',
      name: 'PostgreSQL',
      description: 'Query PostgreSQL databases with read-only access',
      type: 'mcp',
      category: 'data',
      tags: ['database', 'sql', 'postgres'],
      sourceRepo: 'modelcontextprotocol/servers',
      sourcePath: 'src/postgres',
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      stars: 15000,
      trustLevel: 'high',
      verified: true,
      quality: 'high',
      package: '@modelcontextprotocol/server-postgres',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      requiresConfig: true,
      configSchema: {
        fields: [
          {
            name: 'connectionString',
            type: 'password',
            label: 'Connection String',
            description: 'PostgreSQL connection string',
            required: true,
            placeholder: 'postgresql://user:password@localhost:5432/dbname',
            envVar: 'POSTGRES_CONNECTION_STRING',
          },
        ],
      },
    },
    {
      id: 'mcp-sequential-thinking',
      name: 'Sequential Thinking',
      description: 'Step-by-step reasoning and problem decomposition',
      type: 'mcp',
      category: 'ai',
      tags: ['reasoning', 'thinking', 'chain-of-thought'],
      sourceRepo: 'modelcontextprotocol/servers',
      sourcePath: 'src/sequentialthinking',
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      stars: 15000,
      trustLevel: 'high',
      verified: true,
      quality: 'high',
      package: '@modelcontextprotocol/server-sequentialthinking',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequentialthinking'],
      requiresConfig: false,
    },

    // =========================================================================
    // VERCEL LABS - agent-browser
    // Trust Level: HIGH
    // =========================================================================
    {
      id: 'skill-agent-browser',
      name: 'Agent Browser',
      description: 'Browser automation with Playwright - navigate, screenshot, fill forms, test UI',
      type: 'skill',
      category: 'testing',
      tags: ['browser', 'automation', 'playwright', 'testing'],
      sourceRepo: 'vercel-labs/agent-browser',
      sourcePath: 'README.md',
      sourceUrl: 'https://github.com/vercel-labs/agent-browser',
      stars: 3000,
      trustLevel: 'high',
      verified: true,
      quality: 'high',
      contentUrl: 'https://raw.githubusercontent.com/vercel-labs/agent-browser/main/README.md',
    },

    // =========================================================================
    // CALL-ME PLUGIN
    // Trust Level: MEDIUM (Community)
    // =========================================================================
    {
      id: 'plugin-call-me',
      name: 'Call Me',
      description: 'Voice call capabilities - Claude can call you via Twilio/Telnyx when tasks complete',
      type: 'plugin',
      category: 'integration',
      tags: ['voice', 'phone', 'call', 'notification'],
      sourceRepo: 'ZeframLou/call-me',
      sourcePath: '',
      sourceUrl: 'https://github.com/ZeframLou/call-me',
      stars: 500,
      trustLevel: 'medium',
      verified: false,
      quality: 'high',
      warning: '⚠️ Community plugin - requires Twilio/Telnyx account. Costs ~$0.03-0.04/min',
      requiresConfig: true,
      configSchema: {
        fields: [
          {
            name: 'provider',
            type: 'select',
            label: 'Provider',
            description: 'Voice call provider',
            required: true,
            options: ['twilio', 'telnyx'],
          },
          {
            name: 'accountSid',
            type: 'password',
            label: 'Account SID',
            description: 'Twilio Account SID or Telnyx API Key',
            required: true,
            envVar: 'CALL_ME_ACCOUNT_SID',
          },
          {
            name: 'authToken',
            type: 'password',
            label: 'Auth Token',
            description: 'Twilio Auth Token or Telnyx API Secret',
            required: true,
            envVar: 'CALL_ME_AUTH_TOKEN',
          },
          {
            name: 'phoneNumber',
            type: 'string',
            label: 'Your Phone Number',
            description: 'Your phone number to receive calls',
            required: true,
            placeholder: '+1234567890',
            envVar: 'CALL_ME_PHONE_NUMBER',
          },
        ],
      },
    },

    // =========================================================================
    // CLAUDE-CODE-TEMPLATES (davila7)
    // Trust Level: MEDIUM (Community, 18k stars)
    // =========================================================================
    {
      id: 'agent-security-auditor',
      name: 'Security Auditor',
      description: 'Security-focused code review - OWASP vulnerabilities, secrets detection, dependency scanning',
      type: 'agent',
      category: 'development',
      tags: ['security', 'audit', 'owasp', 'vulnerabilities'],
      sourceRepo: 'davila7/claude-code-templates',
      sourcePath: 'cli-tool/components/agents/security-auditor.md',
      sourceUrl: 'https://github.com/davila7/claude-code-templates',
      stars: 18000,
      trustLevel: 'medium',
      verified: false,
      quality: 'high',
      warning: '⚠️ Community-maintained resource',
      contentUrl: 'https://raw.githubusercontent.com/davila7/claude-code-templates/main/cli-tool/components/agents/security-auditor.md',
    },
    {
      id: 'agent-code-reviewer',
      name: 'Code Reviewer',
      description: 'Comprehensive code review - style, patterns, performance, best practices',
      type: 'agent',
      category: 'development',
      tags: ['review', 'code-quality', 'best-practices'],
      sourceRepo: 'davila7/claude-code-templates',
      sourcePath: 'cli-tool/components/agents/code-reviewer.md',
      sourceUrl: 'https://github.com/davila7/claude-code-templates',
      stars: 18000,
      trustLevel: 'medium',
      verified: false,
      quality: 'medium',
      warning: '⚠️ Community-maintained resource',
      contentUrl: 'https://raw.githubusercontent.com/davila7/claude-code-templates/main/cli-tool/components/agents/code-reviewer.md',
    },
    {
      id: 'agent-debugger',
      name: 'Debugger',
      description: 'Specialized debugging agent - stack traces, reproduction, root cause analysis',
      type: 'agent',
      category: 'development',
      tags: ['debug', 'troubleshooting', 'errors'],
      sourceRepo: 'davila7/claude-code-templates',
      sourcePath: 'cli-tool/components/agents/debugger.md',
      sourceUrl: 'https://github.com/davila7/claude-code-templates',
      stars: 18000,
      trustLevel: 'medium',
      verified: false,
      quality: 'medium',
      warning: '⚠️ Community-maintained resource',
      contentUrl: 'https://raw.githubusercontent.com/davila7/claude-code-templates/main/cli-tool/components/agents/debugger.md',
    },
    {
      id: 'command-pr',
      name: 'PR Command',
      description: 'Create pull requests with proper formatting and description',
      type: 'command',
      category: 'development',
      tags: ['git', 'github', 'pr', 'pull-request'],
      sourceRepo: 'davila7/claude-code-templates',
      sourcePath: 'cli-tool/components/commands/pr.md',
      sourceUrl: 'https://github.com/davila7/claude-code-templates',
      stars: 18000,
      trustLevel: 'medium',
      verified: false,
      quality: 'medium',
      warning: '⚠️ Community-maintained resource',
      contentUrl: 'https://raw.githubusercontent.com/davila7/claude-code-templates/main/cli-tool/components/commands/pr.md',
    },

    // =========================================================================
    // CLAWDBOT INTEGRATIONS
    // Trust Level: MEDIUM (Community, 6k stars)
    // =========================================================================
    {
      id: 'skill-github',
      name: 'GitHub Integration',
      description: 'GitHub API integration - issues, PRs, repos, actions',
      type: 'skill',
      category: 'integration',
      tags: ['github', 'git', 'api', 'integration'],
      sourceRepo: 'clawdbot/clawdbot',
      sourcePath: 'skills/github/README.md',
      sourceUrl: 'https://github.com/clawdbot/clawdbot',
      stars: 6000,
      trustLevel: 'medium',
      verified: false,
      quality: 'high',
      warning: '⚠️ Community-maintained resource',
      contentUrl: 'https://raw.githubusercontent.com/clawdbot/clawdbot/main/skills/github/README.md',
    },
    {
      id: 'skill-notion',
      name: 'Notion Integration',
      description: 'Notion API integration - pages, databases, blocks',
      type: 'skill',
      category: 'productivity',
      tags: ['notion', 'docs', 'api', 'integration'],
      sourceRepo: 'clawdbot/clawdbot',
      sourcePath: 'skills/notion/README.md',
      sourceUrl: 'https://github.com/clawdbot/clawdbot',
      stars: 6000,
      trustLevel: 'medium',
      verified: false,
      quality: 'high',
      warning: '⚠️ Community-maintained resource',
      contentUrl: 'https://raw.githubusercontent.com/clawdbot/clawdbot/main/skills/notion/README.md',
    },
    {
      id: 'skill-slack',
      name: 'Slack Integration',
      description: 'Slack API integration - messages, channels, users',
      type: 'skill',
      category: 'integration',
      tags: ['slack', 'chat', 'api', 'integration'],
      sourceRepo: 'clawdbot/clawdbot',
      sourcePath: 'skills/slack/README.md',
      sourceUrl: 'https://github.com/clawdbot/clawdbot',
      stars: 6000,
      trustLevel: 'medium',
      verified: false,
      quality: 'high',
      warning: '⚠️ Community-maintained resource',
      contentUrl: 'https://raw.githubusercontent.com/clawdbot/clawdbot/main/skills/slack/README.md',
    },
    {
      id: 'skill-discord',
      name: 'Discord Integration',
      description: 'Discord bot integration - messages, channels, servers',
      type: 'skill',
      category: 'integration',
      tags: ['discord', 'chat', 'bot', 'integration'],
      sourceRepo: 'clawdbot/clawdbot',
      sourcePath: 'skills/discord/README.md',
      sourceUrl: 'https://github.com/clawdbot/clawdbot',
      stars: 6000,
      trustLevel: 'medium',
      verified: false,
      quality: 'high',
      warning: '⚠️ Community-maintained resource',
      contentUrl: 'https://raw.githubusercontent.com/clawdbot/clawdbot/main/skills/discord/README.md',
    },
    {
      id: 'skill-trello',
      name: 'Trello Integration',
      description: 'Trello API integration - boards, lists, cards',
      type: 'skill',
      category: 'productivity',
      tags: ['trello', 'project-management', 'api', 'integration'],
      sourceRepo: 'clawdbot/clawdbot',
      sourcePath: 'skills/trello/README.md',
      sourceUrl: 'https://github.com/clawdbot/clawdbot',
      stars: 6000,
      trustLevel: 'medium',
      verified: false,
      quality: 'high',
      warning: '⚠️ Community-maintained resource',
      contentUrl: 'https://raw.githubusercontent.com/clawdbot/clawdbot/main/skills/trello/README.md',
    },
    {
      id: 'skill-wacli',
      name: 'WhatsApp CLI',
      description: 'WhatsApp messaging via CLI - send and receive messages',
      type: 'skill',
      category: 'integration',
      tags: ['whatsapp', 'messaging', 'chat', 'integration'],
      sourceRepo: 'clawdbot/clawdbot',
      sourcePath: 'skills/wacli/README.md',
      sourceUrl: 'https://github.com/clawdbot/clawdbot',
      stars: 6000,
      trustLevel: 'medium',
      verified: false,
      quality: 'high',
      warning: '⚠️ Community-maintained resource - requires wacli setup',
      contentUrl: 'https://raw.githubusercontent.com/clawdbot/clawdbot/main/skills/wacli/README.md',
    },

    // =========================================================================
    // ADDITIONAL USEFUL MCP SERVERS
    // =========================================================================
    {
      id: 'mcp-brave-search',
      name: 'Brave Search',
      description: 'Web search via Brave Search API',
      type: 'mcp',
      category: 'productivity',
      tags: ['search', 'web', 'brave'],
      sourceRepo: 'modelcontextprotocol/servers',
      sourcePath: 'src/brave-search',
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      stars: 15000,
      trustLevel: 'high',
      verified: true,
      quality: 'high',
      package: '@modelcontextprotocol/server-brave-search',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      requiresConfig: true,
      configSchema: {
        fields: [
          {
            name: 'apiKey',
            type: 'password',
            label: 'Brave API Key',
            description: 'Your Brave Search API key',
            required: true,
            envVar: 'BRAVE_API_KEY',
          },
        ],
      },
    },
    {
      id: 'mcp-puppeteer',
      name: 'Puppeteer',
      description: 'Browser automation with Puppeteer',
      type: 'mcp',
      category: 'testing',
      tags: ['browser', 'automation', 'puppeteer', 'testing'],
      sourceRepo: 'modelcontextprotocol/servers',
      sourcePath: 'src/puppeteer',
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      stars: 15000,
      trustLevel: 'high',
      verified: true,
      quality: 'high',
      package: '@modelcontextprotocol/server-puppeteer',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
      requiresConfig: false,
    },
    {
      id: 'mcp-sqlite',
      name: 'SQLite',
      description: 'Query SQLite databases',
      type: 'mcp',
      category: 'data',
      tags: ['database', 'sql', 'sqlite'],
      sourceRepo: 'modelcontextprotocol/servers',
      sourcePath: 'src/sqlite',
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      stars: 15000,
      trustLevel: 'high',
      verified: true,
      quality: 'high',
      package: '@modelcontextprotocol/server-sqlite',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sqlite'],
      requiresConfig: true,
      configSchema: {
        fields: [
          {
            name: 'dbPath',
            type: 'string',
            label: 'Database Path',
            description: 'Path to SQLite database file',
            required: true,
            placeholder: '/path/to/database.db',
          },
        ],
      },
    },
    {
      id: 'mcp-slack',
      name: 'Slack MCP',
      description: 'Slack integration via MCP - channels, messages, users',
      type: 'mcp',
      category: 'integration',
      tags: ['slack', 'chat', 'messaging'],
      sourceRepo: 'modelcontextprotocol/servers',
      sourcePath: 'src/slack',
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      stars: 15000,
      trustLevel: 'high',
      verified: true,
      quality: 'high',
      package: '@modelcontextprotocol/server-slack',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      requiresConfig: true,
      configSchema: {
        fields: [
          {
            name: 'botToken',
            type: 'password',
            label: 'Slack Bot Token',
            description: 'Your Slack Bot OAuth token (xoxb-...)',
            required: true,
            envVar: 'SLACK_BOT_TOKEN',
          },
        ],
      },
    },
    {
      id: 'mcp-github',
      name: 'GitHub MCP',
      description: 'GitHub API via MCP - repos, issues, PRs, actions',
      type: 'mcp',
      category: 'development',
      tags: ['github', 'git', 'api'],
      sourceRepo: 'modelcontextprotocol/servers',
      sourcePath: 'src/github',
      sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      stars: 15000,
      trustLevel: 'high',
      verified: true,
      quality: 'high',
      package: '@modelcontextprotocol/server-github',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      requiresConfig: true,
      configSchema: {
        fields: [
          {
            name: 'token',
            type: 'password',
            label: 'GitHub Token',
            description: 'Your GitHub personal access token',
            required: true,
            envVar: 'GITHUB_PERSONAL_ACCESS_TOKEN',
          },
        ],
      },
    },
  ],
};

// =============================================================================
// MARKETPLACE SERVICE
// =============================================================================

export class MarketplaceService {
  private catalog: MarketplaceCatalog;

  constructor() {
    this.catalog = MARKETPLACE_CATALOG;
  }

  // ===========================================================================
  // PUBLIC: CATALOG ACCESS
  // ===========================================================================

  /**
   * Get all marketplace resources
   */
  getAllResources(): MarketplaceEntry[] {
    return this.catalog.resources;
  }

  /**
   * Get resources by type
   */
  getResourcesByType(type: ResourceType): MarketplaceEntry[] {
    return this.catalog.resources.filter(r => r.type === type);
  }

  /**
   * Get resources by category
   */
  getResourcesByCategory(category: ResourceCategory): MarketplaceEntry[] {
    return this.catalog.resources.filter(r => r.category === category);
  }

  /**
   * Get resources by trust level
   */
  getResourcesByTrustLevel(level: TrustLevel): MarketplaceEntry[] {
    return this.catalog.resources.filter(r => r.trustLevel === level);
  }

  /**
   * Get a single resource by ID
   */
  getResourceById(id: string): MarketplaceEntry | undefined {
    return this.catalog.resources.find(r => r.id === id);
  }

  /**
   * Search resources
   */
  searchResources(query: string): MarketplaceEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.catalog.resources.filter(r =>
      r.name.toLowerCase().includes(lowerQuery) ||
      r.description.toLowerCase().includes(lowerQuery) ||
      r.tags.some(t => t.toLowerCase().includes(lowerQuery)),
    );
  }

  /**
   * Get catalog metadata
   */
  getCatalogInfo(): { version: string; updatedAt: string; totalResources: number } {
    return {
      version: this.catalog.version,
      updatedAt: this.catalog.updatedAt,
      totalResources: this.catalog.resources.length,
    };
  }

  /**
   * Get resources grouped by type
   */
  getResourcesGroupedByType(): Record<ResourceType, MarketplaceEntry[]> {
    const grouped: Partial<Record<ResourceType, MarketplaceEntry[]>> = {};

    for (const resource of this.catalog.resources) {
      if (!grouped[resource.type]) {
        grouped[resource.type] = [];
      }
      grouped[resource.type]!.push(resource);
    }

    return grouped as Record<ResourceType, MarketplaceEntry[]>;
  }

  /**
   * Get resources grouped by category
   */
  getResourcesGroupedByCategory(): Record<ResourceCategory, MarketplaceEntry[]> {
    const grouped: Partial<Record<ResourceCategory, MarketplaceEntry[]>> = {};

    for (const resource of this.catalog.resources) {
      if (!grouped[resource.category]) {
        grouped[resource.category] = [];
      }
      grouped[resource.category]!.push(resource);
    }

    return grouped as Record<ResourceCategory, MarketplaceEntry[]>;
  }

  /**
   * Get featured/recommended resources
   */
  getFeaturedResources(): MarketplaceEntry[] {
    // Return high-quality, verified resources
    return this.catalog.resources.filter(
      r => r.quality === 'high' && r.trustLevel === 'high',
    );
  }

  /**
   * Get statistics about the catalog
   */
  getStatistics(): {
    total: number;
    byType: Record<ResourceType, number>;
    byCategory: Record<ResourceCategory, number>;
    byTrustLevel: Record<TrustLevel, number>;
    verified: number;
  } {
    const stats = {
      total: this.catalog.resources.length,
      byType: {} as Record<ResourceType, number>,
      byCategory: {} as Record<ResourceCategory, number>,
      byTrustLevel: {} as Record<TrustLevel, number>,
      verified: 0,
    };

    for (const resource of this.catalog.resources) {
      // Count by type
      stats.byType[resource.type] = (stats.byType[resource.type] || 0) + 1;

      // Count by category
      stats.byCategory[resource.category] = (stats.byCategory[resource.category] || 0) + 1;

      // Count by trust level
      stats.byTrustLevel[resource.trustLevel] = (stats.byTrustLevel[resource.trustLevel] || 0) + 1;

      // Count verified
      if (resource.verified) {
        stats.verified++;
      }
    }

    return stats;
  }
}

// Export singleton instance
export const marketplaceService = new MarketplaceService();
