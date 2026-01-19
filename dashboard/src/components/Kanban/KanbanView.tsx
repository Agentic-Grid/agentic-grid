/**
 * KanbanView Component
 * Full-page view with project sidebar and feature/task board
 */

import { useState, useEffect, useCallback } from "react";
import { KanbanProvider } from "../../contexts/KanbanContext";
import { KanbanBoard } from "./KanbanBoard";
import * as kanbanApi from "../../services/kanban";
import type { KanbanProject } from "../../services/kanban";
import type { Feature } from "../../types/kanban";
import clsx from "clsx";

// =============================================================================
// PROJECT SIDEBAR
// =============================================================================

interface ProjectSidebarProps {
  projects: KanbanProject[];
  selectedProject: KanbanProject | null;
  onSelectProject: (project: KanbanProject) => void;
  loading: boolean;
}

function ProjectSidebar({
  projects,
  selectedProject,
  onSelectProject,
  loading,
}: ProjectSidebarProps) {
  if (loading) {
    return (
      <div className="w-56 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex-shrink-0">
        <div className="p-4">
          <div className="h-5 w-20 bg-[var(--bg-hover)] rounded animate-pulse mb-4" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-[var(--bg-hover)] rounded-lg animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-56 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex-shrink-0 flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Projects ({projects.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {projects.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-[var(--text-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>
            <p className="text-sm text-[var(--text-muted)]">No projects yet</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Create a project to get started
            </p>
          </div>
        ) : (
          projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project)}
              className={clsx(
                "w-full p-3 rounded-lg text-left transition-all border",
                selectedProject?.id === project.id
                  ? "bg-[var(--accent-primary-glow)] border-[var(--accent-primary)]/30 shadow-sm"
                  : "bg-[var(--bg-tertiary)] border-transparent hover:bg-[var(--bg-hover)] hover:border-[var(--border-subtle)]",
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={clsx(
                    "w-2 h-2 rounded-full",
                    project.status === "active" && "bg-[var(--accent-emerald)]",
                    project.status === "paused" && "bg-[var(--accent-amber)]",
                    project.status === "archived" && "bg-[var(--text-muted)]",
                    project.status === "failed" && "bg-[var(--accent-rose)]",
                  )}
                />
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {project.name}
                </span>
              </div>
              {project.description && (
                <p className="text-xs text-[var(--text-tertiary)] mt-1 line-clamp-2">
                  {project.description}
                </p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// FEATURE LIST (for selected project)
// =============================================================================

interface FeatureListProps {
  features: Feature[];
  selectedFeatureId: string | null;
  onSelectFeature: (featureId: string) => void;
  loading: boolean;
}

function FeatureList({
  features,
  selectedFeatureId,
  onSelectFeature,
  loading,
}: FeatureListProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 bg-[var(--bg-hover)] rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--text-tertiary)]">
        <p className="text-sm">No features in this project</p>
        <p className="text-xs mt-1">Run onboarding to generate features</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {features.map((feature) => {
        const isSelected = selectedFeatureId === feature.id;
        return (
          <button
            key={feature.id}
            onClick={() => onSelectFeature(feature.id)}
            className={clsx(
              "w-full p-3 rounded-lg text-left transition-all border",
              isSelected
                ? "bg-[var(--accent-primary-glow)] border-[var(--accent-primary)]/30"
                : "bg-[var(--bg-tertiary)] border-transparent hover:bg-[var(--bg-hover)]",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase">
                {feature.id}
              </span>
              <span
                className={clsx(
                  "px-2 py-0.5 text-[10px] font-medium rounded-full",
                  feature.status === "completed" &&
                    "bg-[var(--accent-emerald-glow)] text-[var(--accent-emerald)]",
                  feature.status === "in_progress" &&
                    "bg-[var(--accent-amber-glow)] text-[var(--accent-amber)]",
                  feature.status === "qa" &&
                    "bg-[var(--accent-violet-glow)] text-[var(--accent-violet)]",
                  (feature.status === "planning" ||
                    feature.status === "approved") &&
                    "bg-[var(--bg-hover)] text-[var(--text-tertiary)]",
                )}
              >
                {feature.status}
              </span>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] mt-1 truncate">
              {feature.title}
            </p>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function KanbanView() {
  const [projects, setProjects] = useState<KanbanProject[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [selectedProject, setSelectedProject] = useState<KanbanProject | null>(
    null,
  );
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null,
  );
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(false);

  // Load projects on mount
  const loadProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const data = await kanbanApi.getProjects();
      setProjects(data);

      // Auto-select first project if none selected
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  }, [selectedProject]);

  // Load features when project changes
  const loadFeatures = useCallback(async () => {
    if (!selectedProject) {
      setFeatures([]);
      setSelectedFeatureId(null);
      return;
    }

    try {
      setLoadingFeatures(true);
      const data = await kanbanApi.getFeatures(selectedProject.id);
      setFeatures(data);

      // Auto-select first feature
      if (data.length > 0) {
        setSelectedFeatureId(data[0].id);
      } else {
        setSelectedFeatureId(null);
      }
    } catch (err) {
      console.error("Failed to load features:", err);
      setFeatures([]);
    } finally {
      setLoadingFeatures(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const handleSelectProject = (project: KanbanProject) => {
    setSelectedProject(project);
    setSelectedFeatureId(null);
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              Kanban Board
            </h1>
            <p className="text-sm text-[var(--text-tertiary)]">
              {selectedProject
                ? `${selectedProject.name} - ${features.length} features`
                : "Select a project to view tasks"}
            </p>
          </div>
          {selectedProject && (
            <div className="flex items-center gap-3">
              <button
                onClick={loadFeatures}
                className="btn btn-ghost text-sm"
                title="Refresh features"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Project sidebar */}
        <ProjectSidebar
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          loading={loadingProjects}
        />

        {/* Feature sidebar (only when project selected) */}
        {selectedProject && (
          <div className="w-60 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex-shrink-0 flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Features ({features.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <FeatureList
                features={features}
                selectedFeatureId={selectedFeatureId}
                onSelectFeature={setSelectedFeatureId}
                loading={loadingFeatures}
              />
            </div>
          </div>
        )}

        {/* Kanban board */}
        <div className="flex-1 overflow-hidden">
          {!selectedProject ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-[var(--text-muted)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <p className="text-[var(--text-secondary)] font-medium">
                  Select a project
                </p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">
                  Choose a project from the sidebar to view its tasks
                </p>
              </div>
            </div>
          ) : !selectedFeatureId ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-[var(--text-muted)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <p className="text-[var(--text-secondary)] font-medium">
                  {features.length === 0
                    ? "No features yet"
                    : "Select a feature"}
                </p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">
                  {features.length === 0
                    ? "Run project onboarding to generate features"
                    : "Choose a feature from the sidebar to view its tasks"}
                </p>
              </div>
            </div>
          ) : (
            <KanbanProvider
              key={selectedFeatureId}
              initialFeatureId={selectedFeatureId}
            >
              <KanbanBoard />
            </KanbanProvider>
          )}
        </div>
      </div>
    </div>
  );
}
