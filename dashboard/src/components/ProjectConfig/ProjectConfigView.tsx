import { useState, useEffect } from "react";
import { clsx } from "clsx";
import {
  getProjectSettings,
  getProjectResources,
  addAllowPattern,
  removeProjectPermission,
  updateProjectPermission,
  createResource,
  updateResource,
  deleteResource,
  getResourceContent,
  type Resource,
  type ResourceCategory,
} from "../../services/api";
import type { ProjectSettings } from "../../types";

type ConfigSection = "resources" | "permissions";
type ResourceType = "skill" | "agent" | "command";

const categories: ResourceCategory[] = [
  "development",
  "productivity",
  "ai",
  "data",
  "testing",
  "devops",
  "design",
  "integration",
  "other",
];

interface ProjectConfigViewProps {
  projectPath: string;
  projectName: string;
  onBack: () => void;
}

function IconGear({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function IconTrash({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function IconEdit({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

function getResourceTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    skill: "S",
    agent: "A",
    command: "/",
    mcp: "M",
    plugin: "P",
    hook: "H",
    permission: "!",
  };
  return icons[type] || "?";
}

function getResourceTypeColor(type: string): string {
  const colors: Record<string, string> = {
    skill: "bg-purple-500/20 text-purple-400",
    agent: "bg-blue-500/20 text-blue-400",
    command: "bg-green-500/20 text-green-400",
    mcp: "bg-amber-500/20 text-amber-400",
    plugin: "bg-pink-500/20 text-pink-400",
    hook: "bg-cyan-500/20 text-cyan-400",
    permission: "bg-red-500/20 text-red-400",
  };
  return colors[type] || "bg-gray-500/20 text-gray-400";
}

function getPlaceholder(type: ResourceType): string {
  switch (type) {
    case "skill":
      return `# My Skill

## Overview
Describe what this skill does...

## Usage
How to use this skill...

## Examples
\`\`\`
Example usage here
\`\`\``;

    case "agent":
      return `# My Agent

## Identity
You are a specialized agent that...

## Core Expertise
- Expertise 1
- Expertise 2

## Workflow
1. First step
2. Second step

## Quality Standards
- Standard 1
- Standard 2`;

    case "command":
      return `# /my-command

This command does...

## Usage
Invoke with \`/my-command [args]\`

## Arguments
- \`arg1\`: Description

## Examples
\`\`\`
/my-command example
\`\`\``;

    default:
      return "";
  }
}

// Resource Editor Modal
function ResourceEditorModal({
  resource,
  type,
  onClose,
  onSave,
}: {
  resource?: Resource;
  type: ResourceType;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(resource?.name || "");
  const [description, setDescription] = useState(resource?.description || "");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<ResourceCategory>(
    (resource?.category as ResourceCategory) || "development"
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!resource);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resource) {
      loadContent();
    }
  }, [resource]);

  async function loadContent() {
    if (!resource) return;

    try {
      setLoading(true);
      const response = await getResourceContent(resource.id);
      setContent(response.data.content);
    } catch (err) {
      console.error("Failed to load content:", err);
      setError("Failed to load resource content");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    if (!content.trim()) {
      setError("Content is required");
      return;
    }

    try {
      setSaving(true);

      if (resource) {
        await updateResource(resource.id, {
          name: name.trim(),
          description: description.trim(),
          content,
        });
      } else {
        await createResource({
          name: name.trim(),
          type,
          description: description.trim(),
          content,
          category,
        });
      }

      onSave();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  const isEditing = !!resource;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-elevated border border-[var(--border-subtle)] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up window-glow-strong">
        {/* Header with glass reflection */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-gradient-to-r from-[var(--accent-primary)]/5 via-transparent to-[var(--color-wine-medium)]/3 window-header-glass">
          <h2 className="text-lg font-semibold">
            {isEditing ? `Edit ${typeLabel}` : `Create New ${typeLabel}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] glass hover:bg-[var(--bg-hover)] transition-all"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-[var(--text-tertiary)]">Loading...</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`my-${type}`}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`What does this ${type} do?`}
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]"
              />
            </div>

            {/* Category (only for new resources) */}
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ResourceCategory)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Content */}
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Content (Markdown)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={getPlaceholder(type)}
                className="w-full h-64 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)] font-mono text-sm resize-none"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Write markdown content. Frontmatter (name, description) will be added automatically.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3 glass-subtle">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl glass hover:bg-[var(--bg-hover)] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className={clsx(
              "px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-dim)] text-white shadow-[0_0_15px_var(--accent-primary-glow)] hover:shadow-[0_0_25px_var(--accent-primary-glow)] transition-all",
              (saving || loading) && "opacity-50 cursor-not-allowed"
            )}
          >
            {saving ? "Saving..." : isEditing ? "Save Changes" : `Create ${typeLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectConfigView({ projectPath, projectName, onBack }: ProjectConfigViewProps) {
  const [section, setSection] = useState<ConfigSection>("resources");
  const [resources, setResources] = useState<Resource[]>([]);
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Permission form state
  const [permPattern, setPermPattern] = useState("");
  const [permAction, setPermAction] = useState<"allow" | "deny">("allow");
  const [addingPerm, setAddingPerm] = useState(false);

  // Resource modal state
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceModalType, setResourceModalType] = useState<ResourceType>("skill");
  const [editingResource, setEditingResource] = useState<Resource | undefined>(undefined);
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(null);

  // Permission editing state
  const [editingPermission, setEditingPermission] = useState<{
    pattern: string;
    action: "allow" | "deny";
  } | null>(null);
  const [editPermissionValue, setEditPermissionValue] = useState("");
  const [savingPermission, setSavingPermission] = useState(false);
  const [deletingPermission, setDeletingPermission] = useState<string | null>(null);

  // Encode project path to folder format
  const projectFolder = projectPath.replace(/^\//, "").replace(/\//g, "-").replace(/^/, "-");

  useEffect(() => {
    loadData();
  }, [projectPath]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [resourcesRes, settingsRes] = await Promise.all([
        getProjectResources(projectName).catch(() => ({ data: { resources: [] } })),
        getProjectSettings(projectFolder).catch(() => ({ data: { permissions: { allow: [], deny: [] } } })),
      ]);

      setResources(resourcesRes.data.resources || []);
      setSettings(settingsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPermission() {
    if (!permPattern.trim()) {
      alert("Pattern is required");
      return;
    }

    try {
      setAddingPerm(true);
      await addAllowPattern(projectFolder, permPattern.trim());
      setPermPattern("");
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add permission";
      alert(message);
    } finally {
      setAddingPerm(false);
    }
  }

  async function handleDeletePermission(pattern: string, action: "allow" | "deny") {
    if (!confirm(`Remove this ${action} permission?\n\nPattern: ${pattern}`)) {
      return;
    }

    try {
      setDeletingPermission(pattern);
      await removeProjectPermission(projectFolder, pattern, action);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove permission";
      alert(message);
    } finally {
      setDeletingPermission(null);
    }
  }

  function startEditPermission(pattern: string, action: "allow" | "deny") {
    setEditingPermission({ pattern, action });
    setEditPermissionValue(pattern);
  }

  function cancelEditPermission() {
    setEditingPermission(null);
    setEditPermissionValue("");
  }

  async function saveEditPermission() {
    if (!editingPermission) return;

    const newPattern = editPermissionValue.trim();
    if (!newPattern) {
      alert("Pattern is required");
      return;
    }

    if (newPattern === editingPermission.pattern) {
      cancelEditPermission();
      return;
    }

    try {
      setSavingPermission(true);
      await updateProjectPermission(
        projectFolder,
        editingPermission.pattern,
        newPattern,
        editingPermission.action
      );
      setEditingPermission(null);
      setEditPermissionValue("");
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update permission";
      alert(message);
    } finally {
      setSavingPermission(false);
    }
  }

  function openCreateResourceModal(type: ResourceType) {
    setResourceModalType(type);
    setEditingResource(undefined);
    setShowResourceModal(true);
  }

  function openEditResourceModal(resource: Resource) {
    setResourceModalType(resource.type as ResourceType);
    setEditingResource(resource);
    setShowResourceModal(true);
  }

  async function handleDeleteResource(resourceId: string) {
    if (!confirm("Are you sure you want to delete this resource? This action cannot be undone.")) {
      return;
    }

    try {
      setDeletingResourceId(resourceId);
      await deleteResource(resourceId);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete resource";
      alert(message);
    } finally {
      setDeletingResourceId(null);
    }
  }

  function handleResourceSaved() {
    setShowResourceModal(false);
    setEditingResource(undefined);
    loadData();
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
          />
          <div className="text-[var(--text-tertiary)]">Loading configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header with glass reflection */}
      <div className="px-8 py-6 border-b border-[var(--border-subtle)] glass-subtle bg-gradient-to-r from-[var(--accent-primary)]/5 via-transparent to-[var(--color-wine-medium)]/3 flex items-center gap-4 window-header-glass">
        <button
          onClick={onBack}
          className="p-2 rounded-xl glass hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-all hover:shadow-md"
          title="Back"
        >
          <IconArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl glass border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-primary-glow)] flex items-center justify-center">
            <IconGear className="w-5 h-5 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Project Configuration</h1>
            <p className="text-sm text-[var(--text-tertiary)]">{projectName}</p>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="px-8 py-4 border-b border-[var(--border-subtle)] glass-subtle">
        <div className="flex gap-2">
          <button
            onClick={() => setSection("resources")}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              section === "resources"
                ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-dim)] text-white shadow-[0_0_15px_var(--accent-primary-glow)]"
                : "glass hover:bg-[var(--bg-hover)] hover:shadow-md"
            )}
          >
            Resources ({resources.length})
          </button>
          <button
            onClick={() => setSection("permissions")}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              section === "permissions"
                ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-dim)] text-white shadow-[0_0_15px_var(--accent-primary-glow)]"
                : "glass hover:bg-[var(--bg-hover)] hover:shadow-md"
            )}
          >
            Permissions ({(settings?.permissions.allow.length || 0) + (settings?.permissions.deny?.length || 0)})
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-8 mt-4 p-4 rounded-lg bg-[var(--accent-rose)]/10 border border-[var(--accent-rose)]/30 text-[var(--accent-rose)]">
          {error}
        </div>
      )}

      <div className="p-8">
        {/* Resources Section */}
        {section === "resources" && (
          <div className="space-y-6">
            {/* Create Resource Actions */}
            <div className="card p-4">
              <h3 className="font-medium mb-3">Create New Resource</h3>
              <p className="text-sm text-[var(--text-tertiary)] mb-4">
                Add skills, agents, or commands to your project's{" "}
                <code className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)]">.claude/</code> directory.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openCreateResourceModal("skill")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors text-sm font-medium"
                >
                  <IconPlus className="w-4 h-4" />
                  New Skill
                </button>
                <button
                  onClick={() => openCreateResourceModal("agent")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-sm font-medium"
                >
                  <IconPlus className="w-4 h-4" />
                  New Agent
                </button>
                <button
                  onClick={() => openCreateResourceModal("command")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm font-medium"
                >
                  <IconPlus className="w-4 h-4" />
                  New Command
                </button>
              </div>
            </div>

            {/* Resources List */}
            {resources.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-tertiary)]">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                  <IconGear className="w-8 h-8 text-[var(--text-tertiary)]" />
                </div>
                <p className="mb-2">No project-specific resources</p>
                <p className="text-sm">Click the buttons above to create your first resource.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {resources.map((resource) => (
                  <div key={resource.id} className="card p-4 flex items-start gap-4 group">
                    <div
                      className={clsx(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0",
                        getResourceTypeColor(resource.type)
                      )}
                    >
                      {getResourceTypeIcon(resource.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-[var(--text-primary)] truncate">{resource.name}</h4>
                        <span className="px-2 py-0.5 text-xs rounded bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]">
                          {resource.type}
                        </span>
                        {resource.enabled && (
                          <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">enabled</span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{resource.description}</p>
                      {resource.filePath && (
                        <p className="text-xs text-[var(--text-tertiary)] mt-2 font-mono truncate">{resource.filePath}</p>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditResourceModal(resource)}
                        className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors"
                        title="Edit resource"
                      >
                        <IconEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteResource(resource.id)}
                        disabled={deletingResourceId === resource.id}
                        className={clsx(
                          "p-2 rounded-lg hover:bg-[var(--accent-rose)]/20 text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] transition-colors",
                          deletingResourceId === resource.id && "opacity-50 cursor-not-allowed"
                        )}
                        title="Delete resource"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Permissions Section */}
        {section === "permissions" && (
          <div className="space-y-6">
            {/* Add Permission Form */}
            <div className="card p-4">
              <h3 className="font-medium mb-4">Add Project Permission</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Pattern</label>
                  <input
                    type="text"
                    value={permPattern}
                    onChange={(e) => setPermPattern(e.target.value)}
                    placeholder="Bash(npm:*)"
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Action</label>
                  <select
                    value={permAction}
                    onChange={(e) => setPermAction(e.target.value as "allow" | "deny")}
                    className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]"
                  >
                    <option value="allow">Allow</option>
                    <option value="deny">Deny</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddPermission}
                    disabled={addingPerm || !permPattern.trim()}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {addingPerm ? "Adding..." : "Add Permission"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-2">
                Examples: <code className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)]">Bash(npm:*)</code>,{" "}
                <code className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)]">Read(/path/to/file)</code>,{" "}
                <code className="px-1 py-0.5 rounded bg-[var(--bg-tertiary)]">Write</code>
              </p>
            </div>

            {/* Allowed Patterns */}
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <IconCheck className="w-4 h-4 text-green-400" />
                Allowed Patterns ({settings?.permissions.allow.length || 0})
              </h3>
              {settings?.permissions.allow.length === 0 ? (
                <div className="text-sm text-[var(--text-tertiary)] py-4">No allow patterns configured</div>
              ) : (
                <div className="space-y-2">
                  {settings?.permissions.allow.map((pattern: string, index: number) => (
                    <div key={index} className="card p-3 flex items-center justify-between group">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400 flex-shrink-0">ALLOW</span>
                        {editingPermission?.pattern === pattern && editingPermission?.action === "allow" ? (
                          <input
                            type="text"
                            value={editPermissionValue}
                            onChange={(e) => setEditPermissionValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditPermission();
                              if (e.key === "Escape") cancelEditPermission();
                            }}
                            autoFocus
                            className="flex-1 px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--accent-primary)] rounded text-sm font-mono focus:outline-none"
                          />
                        ) : (
                          <code className="text-sm text-[var(--text-primary)] truncate">{pattern}</code>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                        {editingPermission?.pattern === pattern && editingPermission?.action === "allow" ? (
                          <>
                            <button
                              onClick={saveEditPermission}
                              disabled={savingPermission}
                              className="p-1.5 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                              title="Save"
                            >
                              <IconCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditPermission}
                              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] transition-colors"
                              title="Cancel"
                            >
                              <IconX className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditPermission(pattern, "allow")}
                              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors"
                              title="Edit permission"
                            >
                              <IconEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePermission(pattern, "allow")}
                              disabled={deletingPermission === pattern}
                              className={clsx(
                                "p-1.5 rounded-lg hover:bg-[var(--accent-rose)]/20 text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] transition-colors",
                                deletingPermission === pattern && "opacity-50 cursor-not-allowed"
                              )}
                              title="Delete permission"
                            >
                              <IconTrash className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Denied Patterns */}
            {settings?.permissions.deny && settings.permissions.deny.length > 0 && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <IconX className="w-4 h-4 text-red-400" />
                  Denied Patterns ({settings.permissions.deny.length})
                </h3>
                <div className="space-y-2">
                  {settings.permissions.deny.map((pattern: string, index: number) => (
                    <div key={index} className="card p-3 flex items-center justify-between group">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 flex-shrink-0">DENY</span>
                        {editingPermission?.pattern === pattern && editingPermission?.action === "deny" ? (
                          <input
                            type="text"
                            value={editPermissionValue}
                            onChange={(e) => setEditPermissionValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditPermission();
                              if (e.key === "Escape") cancelEditPermission();
                            }}
                            autoFocus
                            className="flex-1 px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--accent-primary)] rounded text-sm font-mono focus:outline-none"
                          />
                        ) : (
                          <code className="text-sm text-[var(--text-primary)] truncate">{pattern}</code>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                        {editingPermission?.pattern === pattern && editingPermission?.action === "deny" ? (
                          <>
                            <button
                              onClick={saveEditPermission}
                              disabled={savingPermission}
                              className="p-1.5 rounded-lg hover:bg-green-500/20 text-green-400 transition-colors"
                              title="Save"
                            >
                              <IconCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEditPermission}
                              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] transition-colors"
                              title="Cancel"
                            >
                              <IconX className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditPermission(pattern, "deny")}
                              className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors"
                              title="Edit permission"
                            >
                              <IconEdit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePermission(pattern, "deny")}
                              disabled={deletingPermission === pattern}
                              className={clsx(
                                "p-1.5 rounded-lg hover:bg-[var(--accent-rose)]/20 text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] transition-colors",
                                deletingPermission === pattern && "opacity-50 cursor-not-allowed"
                              )}
                              title="Delete permission"
                            >
                              <IconTrash className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resource Editor Modal */}
      {showResourceModal && (
        <ResourceEditorModal
          resource={editingResource}
          type={resourceModalType}
          onClose={() => {
            setShowResourceModal(false);
            setEditingResource(undefined);
          }}
          onSave={handleResourceSaved}
        />
      )}
    </div>
  );
}
