/**
 * Resources API Routes
 * REST endpoints for the Resources Hub - skills, agents, commands, MCPs, plugins
 */

import { Router, Request, Response } from 'express';
import {
  resourceDiscoveryService,
} from '../services/resource-discovery.service.js';
import {
  resourceInstallerService,
  ResourceError,
} from '../services/resource-installer.service.js';
import { marketplaceService } from '../services/marketplace.service.js';
import type {
  ResourceType,
  ResourceCategory,
  TrustLevel,
  CreateResourceRequest,
  UpdateResourceRequest,
} from '../types/resource.types.js';

const router = Router();

// =============================================================================
// ERROR HANDLING
// =============================================================================

interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const error: ApiError = { error: message, code };
  if (details !== undefined) {
    error.details = details;
  }
  res.status(status).json(error);
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

const VALID_RESOURCE_TYPES: ResourceType[] = [
  'skill',
  'agent',
  'command',
  'mcp',
  'plugin',
  'hook',
  'permission',
];

const VALID_CATEGORIES: ResourceCategory[] = [
  'development',
  'productivity',
  'ai',
  'data',
  'testing',
  'devops',
  'design',
  'integration',
  'other',
];

const VALID_TRUST_LEVELS: TrustLevel[] = ['high', 'medium', 'low', 'unknown'];

function isValidResourceType(type: unknown): type is ResourceType {
  return typeof type === 'string' && VALID_RESOURCE_TYPES.includes(type as ResourceType);
}

function isValidCategory(category: unknown): category is ResourceCategory {
  return typeof category === 'string' && VALID_CATEGORIES.includes(category as ResourceCategory);
}

// =============================================================================
// INSTALLED RESOURCES ROUTES
// =============================================================================

/**
 * GET /api/resources/installed
 * Get all installed resources (platform + global)
 */
router.get('/installed', async (_req: Request, res: Response) => {
  try {
    const resources = await resourceDiscoveryService.getAllInstalledResources();

    // Group by type for frontend convenience
    const byType: Partial<Record<ResourceType, number>> = {};
    for (const resource of resources) {
      byType[resource.type] = (byType[resource.type] || 0) + 1;
    }

    res.json({
      data: {
        resources,
        total: resources.length,
        byType,
      },
    });
  } catch (error) {
    console.error('Error fetching installed resources:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch installed resources');
  }
});

/**
 * GET /api/resources/installed/:id
 * Get a single installed resource by ID
 */
router.get('/installed/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resource = await resourceDiscoveryService.getResourceById(id);

    if (!resource) {
      sendError(res, 404, 'NOT_FOUND', `Resource '${id}' not found`);
      return;
    }

    res.json({ data: resource });
  } catch (error) {
    console.error('Error fetching resource:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch resource');
  }
});

/**
 * GET /api/resources/installed/:id/content
 * Get the content of a markdown resource
 */
router.get('/installed/:id/content', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const content = await resourceDiscoveryService.getResourceContent(id);

    if (content === null) {
      sendError(res, 404, 'NOT_FOUND', `Resource '${id}' not found or has no content`);
      return;
    }

    res.json({ data: { id, content } });
  } catch (error) {
    console.error('Error fetching resource content:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch resource content');
  }
});

// =============================================================================
// MARKETPLACE ROUTES
// =============================================================================

/**
 * GET /api/resources/marketplace
 * Get all marketplace resources (curated catalog)
 */
router.get('/marketplace', async (req: Request, res: Response) => {
  try {
    const { type, category, trustLevel, search } = req.query;

    let resources = marketplaceService.getAllResources();

    // Apply filters
    if (type && isValidResourceType(type)) {
      resources = resources.filter(r => r.type === type);
    }

    if (category && isValidCategory(category)) {
      resources = resources.filter(r => r.category === category);
    }

    if (trustLevel && VALID_TRUST_LEVELS.includes(trustLevel as TrustLevel)) {
      resources = resources.filter(r => r.trustLevel === trustLevel);
    }

    if (search && typeof search === 'string') {
      resources = marketplaceService.searchResources(search);
    }

    // Mark installed resources
    const installed = await resourceDiscoveryService.getAllInstalledResources();
    const installedNames = new Set(installed.map(r => r.name.toLowerCase()));

    const resourcesWithStatus = resources.map(r => ({
      ...r,
      installed: installedNames.has(r.name.toLowerCase()),
    }));

    res.json({
      data: {
        resources: resourcesWithStatus,
        total: resourcesWithStatus.length,
        catalogInfo: marketplaceService.getCatalogInfo(),
      },
    });
  } catch (error) {
    console.error('Error fetching marketplace:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch marketplace');
  }
});

/**
 * GET /api/resources/marketplace/featured
 * Get featured/recommended resources
 */
router.get('/marketplace/featured', async (_req: Request, res: Response) => {
  try {
    const resources = marketplaceService.getFeaturedResources();

    // Mark installed resources
    const installed = await resourceDiscoveryService.getAllInstalledResources();
    const installedNames = new Set(installed.map(r => r.name.toLowerCase()));

    const resourcesWithStatus = resources.map(r => ({
      ...r,
      installed: installedNames.has(r.name.toLowerCase()),
    }));

    res.json({ data: resourcesWithStatus });
  } catch (error) {
    console.error('Error fetching featured resources:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch featured resources');
  }
});

/**
 * GET /api/resources/marketplace/stats
 * Get marketplace statistics
 */
router.get('/marketplace/stats', async (_req: Request, res: Response) => {
  try {
    const stats = marketplaceService.getStatistics();
    res.json({ data: stats });
  } catch (error) {
    console.error('Error fetching marketplace stats:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch marketplace stats');
  }
});

/**
 * GET /api/resources/marketplace/:id
 * Get a single marketplace resource by ID
 */
router.get('/marketplace/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const resource = marketplaceService.getResourceById(id);

    if (!resource) {
      sendError(res, 404, 'NOT_FOUND', `Marketplace resource '${id}' not found`);
      return;
    }

    res.json({ data: resource });
  } catch (error) {
    console.error('Error fetching marketplace resource:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch marketplace resource');
  }
});

// =============================================================================
// CREATE / EDIT / DELETE ROUTES
// =============================================================================

/**
 * POST /api/resources
 * Create a new resource (skill, agent, or command)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, type, description, content, category, tags } = req.body as CreateResourceRequest;

    // Validation
    if (!name || typeof name !== 'string') {
      sendError(res, 400, 'VALIDATION_ERROR', 'name is required');
      return;
    }

    if (!type || !['skill', 'agent', 'command'].includes(type)) {
      sendError(res, 400, 'VALIDATION_ERROR', 'type must be skill, agent, or command');
      return;
    }

    if (!description || typeof description !== 'string') {
      sendError(res, 400, 'VALIDATION_ERROR', 'description is required');
      return;
    }

    if (!content || typeof content !== 'string') {
      sendError(res, 400, 'VALIDATION_ERROR', 'content is required');
      return;
    }

    const resource = await resourceInstallerService.createResource({
      name,
      type,
      description,
      content,
      category,
      tags,
    });

    res.status(201).json({ data: resource });
  } catch (error) {
    if (error instanceof ResourceError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating resource:', message);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to create resource');
  }
});

/**
 * PUT /api/resources/:id
 * Update an existing resource
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, content, enabled } = req.body as UpdateResourceRequest;

    const resource = await resourceInstallerService.updateResource(id, {
      name,
      description,
      content,
      enabled,
    });

    res.json({ data: resource });
  } catch (error) {
    if (error instanceof ResourceError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating resource:', message);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to update resource');
  }
});

/**
 * DELETE /api/resources/:id
 * Delete a resource
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await resourceInstallerService.deleteResource(id);

    res.json({ data: { success: true, message: 'Resource deleted' } });
  } catch (error) {
    if (error instanceof ResourceError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting resource:', message);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to delete resource');
  }
});

// =============================================================================
// INSTALL FROM MARKETPLACE ROUTES
// =============================================================================

/**
 * POST /api/resources/install
 * Install a resource from the marketplace
 */
router.post('/install', async (req: Request, res: Response) => {
  try {
    const { resourceId, config } = req.body;

    if (!resourceId || typeof resourceId !== 'string') {
      sendError(res, 400, 'VALIDATION_ERROR', 'resourceId is required');
      return;
    }

    // Get marketplace entry
    const entry = marketplaceService.getResourceById(resourceId);
    if (!entry) {
      sendError(res, 404, 'NOT_FOUND', `Marketplace resource '${resourceId}' not found`);
      return;
    }

    const resource = await resourceInstallerService.installFromMarketplace(entry, config);

    res.status(201).json({
      data: {
        success: true,
        resource,
        message: `${entry.name} installed successfully`,
      },
    });
  } catch (error) {
    if (error instanceof ResourceError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error installing resource:', message);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to install resource');
  }
});

/**
 * POST /api/resources/uninstall-mcp
 * Uninstall an MCP server
 */
router.post('/uninstall-mcp', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      sendError(res, 400, 'VALIDATION_ERROR', 'name is required');
      return;
    }

    await resourceInstallerService.uninstallMCPServer(name);

    res.json({
      data: {
        success: true,
        message: `MCP server '${name}' uninstalled`,
      },
    });
  } catch (error) {
    if (error instanceof ResourceError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error uninstalling MCP:', message);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to uninstall MCP server');
  }
});

// =============================================================================
// HOOKS ROUTES
// =============================================================================

/**
 * POST /api/resources/hooks
 * Add a hook
 */
router.post('/hooks', async (req: Request, res: Response) => {
  try {
    const { event, command, runInBackground } = req.body;

    if (!event || typeof event !== 'string') {
      sendError(res, 400, 'VALIDATION_ERROR', 'event is required');
      return;
    }

    if (!command || typeof command !== 'string') {
      sendError(res, 400, 'VALIDATION_ERROR', 'command is required');
      return;
    }

    await resourceInstallerService.addHook(event, command, runInBackground);

    res.status(201).json({
      data: {
        success: true,
        message: 'Hook added',
      },
    });
  } catch (error) {
    if (error instanceof ResourceError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    console.error('Error adding hook:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to add hook');
  }
});

/**
 * DELETE /api/resources/hooks
 * Remove a hook
 */
router.delete('/hooks', async (req: Request, res: Response) => {
  try {
    const { event, index } = req.body;

    if (!event || typeof event !== 'string') {
      sendError(res, 400, 'VALIDATION_ERROR', 'event is required');
      return;
    }

    if (typeof index !== 'number') {
      sendError(res, 400, 'VALIDATION_ERROR', 'index is required');
      return;
    }

    await resourceInstallerService.removeHook(event, index);

    res.json({
      data: {
        success: true,
        message: 'Hook removed',
      },
    });
  } catch (error) {
    if (error instanceof ResourceError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    console.error('Error removing hook:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to remove hook');
  }
});

// =============================================================================
// PERMISSIONS ROUTES
// =============================================================================

/**
 * POST /api/resources/permissions
 * Add a permission
 */
router.post('/permissions', async (req: Request, res: Response) => {
  try {
    const { pattern, action } = req.body;

    if (!pattern || typeof pattern !== 'string') {
      sendError(res, 400, 'VALIDATION_ERROR', 'pattern is required');
      return;
    }

    if (!action || !['allow', 'deny'].includes(action)) {
      sendError(res, 400, 'VALIDATION_ERROR', 'action must be allow or deny');
      return;
    }

    await resourceInstallerService.addPermission(pattern, action);

    res.status(201).json({
      data: {
        success: true,
        message: 'Permission added',
      },
    });
  } catch (error) {
    if (error instanceof ResourceError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    console.error('Error adding permission:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to add permission');
  }
});

/**
 * DELETE /api/resources/permissions
 * Remove a permission
 */
router.delete('/permissions', async (req: Request, res: Response) => {
  try {
    const { pattern, action } = req.body;

    if (!pattern || typeof pattern !== 'string') {
      sendError(res, 400, 'VALIDATION_ERROR', 'pattern is required');
      return;
    }

    if (!action || !['allow', 'deny'].includes(action)) {
      sendError(res, 400, 'VALIDATION_ERROR', 'action must be allow or deny');
      return;
    }

    await resourceInstallerService.removePermission(pattern, action);

    res.json({
      data: {
        success: true,
        message: 'Permission removed',
      },
    });
  } catch (error) {
    if (error instanceof ResourceError) {
      sendError(res, error.statusCode, error.code, error.message);
      return;
    }

    console.error('Error removing permission:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to remove permission');
  }
});

// =============================================================================
// SANDBOX PROJECT RESOURCES
// =============================================================================

/**
 * GET /api/resources/projects
 * List all sandbox projects
 */
router.get('/projects', async (_req: Request, res: Response) => {
  try {
    const projects = await resourceDiscoveryService.listSandboxProjects();
    res.json({ data: projects });
  } catch (error) {
    console.error('Error listing projects:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to list projects');
  }
});

/**
 * GET /api/resources/projects/:name
 * Get resources for a specific sandbox project
 */
router.get('/projects/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const resources = await resourceDiscoveryService.discoverProjectResources(name);

    res.json({
      data: {
        project: name,
        resources,
        total: resources.length,
      },
    });
  } catch (error) {
    console.error('Error fetching project resources:', error);
    sendError(res, 500, 'INTERNAL_ERROR', 'Failed to fetch project resources');
  }
});

export default router;
