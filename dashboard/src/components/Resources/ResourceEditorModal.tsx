import { useState, useEffect } from "react";
import { clsx } from "clsx";
import {
  createResource,
  updateResource,
  getResourceContent,
  type Resource,
  type ResourceCategory,
} from "../../services/api";

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

interface ResourceEditorModalProps {
  resource?: Resource;
  type: "skill" | "agent" | "command";
  onClose: () => void;
  onSave: () => void;
}

export function ResourceEditorModal({
  resource,
  type,
  onClose,
  onSave,
}: ResourceEditorModalProps) {
  const [name, setName] = useState(resource?.name || "");
  const [description, setDescription] = useState(resource?.description || "");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<ResourceCategory>(
    (resource?.category as ResourceCategory) || "development",
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
        // Update existing
        await updateResource(resource.id, {
          name: name.trim(),
          description: description.trim(),
          content,
        });
      } else {
        // Create new
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-secondary)] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col window-glow-strong">
        {/* Header with glass reflection */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between window-header-glass">
          <h2 className="text-lg font-semibold">
            {isEditing ? `Edit ${typeLabel}` : `Create New ${typeLabel}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="loading-pulse">Loading...</div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Error */}
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
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg glass hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className={clsx(
              "px-4 py-2 text-sm rounded-lg btn-primary transition-colors",
              (saving || loading) && "opacity-50 cursor-not-allowed",
            )}
          >
            {saving ? "Saving..." : isEditing ? "Save Changes" : `Create ${typeLabel}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function getPlaceholder(type: "skill" | "agent" | "command"): string {
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
