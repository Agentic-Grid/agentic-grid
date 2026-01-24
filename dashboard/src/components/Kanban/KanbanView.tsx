/**
 * KanbanView Component
 * Full-page view with project sidebar and feature/task board
 */

import { useState, useMemo, useEffect, useRef } from "react";
import {
  KanbanProvider,
  type FeatureWithTasks,
} from "../../contexts/KanbanContext";
import { useKanbanData } from "../../contexts/KanbanDataContext";
import { KanbanBoard } from "./KanbanBoard";
import { SessionWindowsGrid } from "../Dashboard/SessionWindowsGrid";
import { FloatingSessionsToggle } from "../Dashboard/FloatingSessionsToggle";
import * as kanbanApi from "../../services/kanban";
import type { KanbanProject } from "../../services/kanban";
import type { Feature } from "../../types/kanban";
import type { Session } from "../../types";
import clsx from "clsx";

// =============================================================================
// DELETE CONFIRMATION MODAL
// =============================================================================

interface DeleteConfirmModalProps {
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmModal({
  projectName,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteConfirmModalProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] glass-elevated animate-slide-up window-glow-strong"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-[var(--accent-rose)]/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[var(--accent-rose)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  Delete Project
                </h3>
                <p className="text-sm text-[var(--text-tertiary)]">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-sm text-[var(--text-secondary)] mb-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-[var(--text-primary)]">
                {projectName}
              </span>
              ?
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              This will permanently delete:
            </p>
            <ul className="text-xs text-[var(--text-tertiary)] list-disc list-inside mt-1 mb-4">
              <li>The project folder and all files</li>
              <li>All Claude session files for this project</li>
            </ul>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] glass hover:bg-[var(--bg-hover)] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-[var(--accent-rose)] to-[var(--color-wine-medium)] text-white hover:shadow-[0_0_20px_var(--accent-rose-glow)] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Delete Project
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// PROJECT SIDEBAR
// =============================================================================

interface ProjectSidebarProps {
  projects: KanbanProject[];
  selectedProject: KanbanProject | null;
  onSelectProject: (project: KanbanProject) => void;
  onDeleteProject: (project: KanbanProject) => void;
  loading: boolean;
}

function ProjectSidebar({
  projects,
  selectedProject,
  onSelectProject,
  onDeleteProject,
  loading,
}: ProjectSidebarProps) {
  if (loading) {
    return (
      <div className="w-56 border-r border-[var(--border-subtle)] glass-subtle flex-shrink-0">
        <div className="p-4">
          <div className="h-5 w-20 bg-[var(--bg-hover)] rounded animate-pulse mb-4" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-[var(--bg-hover)] rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-56 border-r border-[var(--border-subtle)] glass-subtle flex-shrink-0 flex flex-col relative">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-primary)]/5 via-transparent to-[var(--color-wine-medium)]/3 pointer-events-none" />
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] relative z-10 window-header-glass">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          Projects ({projects.length})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 relative z-10">
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
            <div
              key={project.id}
              className={clsx(
                "group relative rounded-xl transition-all border",
                selectedProject?.id === project.id
                  ? "glass border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-primary-glow)]"
                  : "glass-subtle border-transparent hover:border-[var(--border-subtle)] hover:shadow-md hover:-translate-y-0.5",
              )}
            >
              <button
                onClick={() => onSelectProject(project)}
                className="w-full p-3 text-left"
              >
                <div className="flex items-center gap-2 pr-6">
                  <div
                    className={clsx(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      project.status === "active" &&
                        "bg-[var(--accent-emerald)]",
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
                  <p className="text-xs text-[var(--text-tertiary)] mt-1 line-clamp-2 pr-6">
                    {project.description}
                  </p>
                )}
              </button>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteProject(project);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-rose)]/10 text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] transition-all"
                title="Delete project"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
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
  collapsed?: boolean;
}

function FeatureList({
  features,
  selectedFeatureId,
  onSelectFeature,
  loading,
  collapsed = false,
}: FeatureListProps) {
  // Get status dot color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-[var(--accent-emerald)]";
      case "in_progress":
        return "bg-[var(--accent-amber)]";
      case "qa":
        return "bg-[var(--accent-violet)]";
      default:
        return "bg-[var(--text-tertiary)]";
    }
  };

  if (loading) {
    return (
      <div className={clsx("space-y-2", collapsed ? "p-2" : "p-4")}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={clsx(
              "bg-[var(--bg-hover)] rounded-lg animate-pulse",
              collapsed ? "h-8" : "h-14"
            )}
          />
        ))}
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div className={clsx("text-center text-[var(--text-tertiary)]", collapsed ? "p-2" : "p-4")}>
        {collapsed ? (
          <p className="text-xs">No features</p>
        ) : (
          <>
            <p className="text-sm">No features in this project</p>
            <p className="text-xs mt-1">Run onboarding to generate features</p>
          </>
        )}
      </div>
    );
  }

  // Collapsed view - compact with tooltip
  if (collapsed) {
    return (
      <div className="p-2 space-y-1">
        {features.map((feature) => {
          const isSelected = selectedFeatureId === feature.id;
          return (
            <button
              key={feature.id}
              onClick={() => onSelectFeature(feature.id)}
              className={clsx(
                "w-full px-2 py-1.5 rounded-xl text-left transition-all border group relative",
                isSelected
                  ? "glass border-[var(--accent-primary)]/30 shadow-[0_0_10px_var(--accent-primary-glow)]"
                  : "glass-subtle border-transparent hover:border-[var(--border-subtle)] hover:shadow-sm",
              )}
              title={feature.title}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase truncate">
                  {feature.id}
                </span>
                <span
                  className={clsx(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    getStatusColor(feature.status)
                  )}
                />
              </div>
              {/* Tooltip on hover */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded shadow-lg text-xs text-[var(--text-primary)] whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                {feature.title}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Expanded view - full details
  return (
    <div className="p-3 space-y-2">
      {features.map((feature) => {
        const isSelected = selectedFeatureId === feature.id;
        return (
          <button
            key={feature.id}
            onClick={() => onSelectFeature(feature.id)}
            className={clsx(
              "w-full p-3 rounded-xl text-left transition-all border",
              isSelected
                ? "glass border-[var(--accent-primary)]/30 shadow-[0_0_12px_var(--accent-primary-glow)]"
                : "glass-subtle border-transparent hover:border-[var(--border-subtle)] hover:shadow-md hover:-translate-y-0.5",
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

interface KanbanViewProps {
  /** Sessions to display as floating windows */
  sessions?: Session[];
  /** Session names map */
  sessionNames?: Record<string, string>;
  /** Callback to handle session name change */
  onSessionNameChange?: (sessionId: string, name: string) => void;
  /** Callback to refresh sessions */
  onRefreshSessions?: () => void;
}

export function KanbanView({
  sessions = [],
  sessionNames = {},
  onSessionNameChange,
  onRefreshSessions,
}: KanbanViewProps) {
  // Get data from centralized context (single source of truth)
  const {
    projects: projectsWithData,
    loading,
    refresh: loadAllData,
  } = useKanbanData();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    null,
  );

  // Feature sidebar collapsed state
  const [isFeatureSidebarCollapsed, setIsFeatureSidebarCollapsed] = useState(false);

  // Toggle for showing floating session windows
  const [showFloatingSessions, setShowFloatingSessions] = useState(false);

  // Hidden/minimized sessions for floating mode
  const [hiddenSessionIds, setHiddenSessionIds] = useState<Set<string>>(new Set());

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<KanbanProject | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Derive projects list for sidebar (without nested features for the type)
  const projects: KanbanProject[] = useMemo(
    () => projectsWithData.map(({ features: _, ...project }) => project),
    [projectsWithData],
  );

  // Derive selected project
  const selectedProject = useMemo(
    () => projectsWithData.find((p) => p.id === selectedProjectId) || null,
    [projectsWithData, selectedProjectId],
  );

  // Track if we've done initial auto-selection
  const hasAutoSelected = useRef(false);

  // Auto-select first project ONLY on initial load (not on poll updates)
  useEffect(() => {
    if (
      !hasAutoSelected.current &&
      projectsWithData.length > 0 &&
      !selectedProjectId
    ) {
      hasAutoSelected.current = true;
      setSelectedProjectId(projectsWithData[0].id);
      if (projectsWithData[0].features.length > 0) {
        setSelectedFeatureId(projectsWithData[0].features[0].id);
      }
    }
  }, [projectsWithData, selectedProjectId]);

  // Derive features for selected project (with tasks for KanbanProvider)
  const featuresWithTasks: FeatureWithTasks[] = useMemo(
    () => selectedProject?.features || [],
    [selectedProject],
  );

  // Derive features list without tasks (for FeatureList component)
  const features: Feature[] = useMemo(
    () => featuresWithTasks.map(({ tasks: _, ...feature }) => feature),
    [featuresWithTasks],
  );

  // Derive selected feature with its tasks
  const selectedFeatureData: FeatureWithTasks | null = useMemo(
    () => featuresWithTasks.find((f) => f.id === selectedFeatureId) || null,
    [featuresWithTasks, selectedFeatureId],
  );

  // Filter sessions for the selected project (excluding the current feature's session)
  const projectSessions = useMemo(() => {
    if (!selectedProject) return [];
    const featureSessionId = selectedFeatureData?.session_id;
    return sessions.filter((s) =>
      s.projectPath === selectedProject.path && s.id !== featureSessionId
    );
  }, [sessions, selectedProject, selectedFeatureData?.session_id]);

  const handleSelectProject = (project: KanbanProject) => {
    setSelectedProjectId(project.id);
    // Auto-select first feature of the new project
    const projectData = projectsWithData.find((p) => p.id === project.id);
    if (projectData && projectData.features.length > 0) {
      setSelectedFeatureId(projectData.features[0].id);
    } else {
      setSelectedFeatureId(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      await kanbanApi.deleteProject(deleteConfirm.name);

      // If we deleted the selected project, clear selection
      if (selectedProjectId === deleteConfirm.id) {
        setSelectedProjectId(null);
        setSelectedFeatureId(null);
      }

      // Refresh data from context
      await loadAllData();

      setDeleteConfirm(null);
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header with glass reflection */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] glass-subtle bg-gradient-to-r from-[var(--accent-primary)]/5 via-transparent to-[var(--color-wine-medium)]/3 window-header-glass overflow-visible relative z-20">
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
              {/* Toggle floating sessions */}
              {projectSessions.length > 0 && (
                <FloatingSessionsToggle
                  sessions={projectSessions}
                  sessionNames={sessionNames}
                  showFloatingSessions={showFloatingSessions}
                  onToggleAll={() => setShowFloatingSessions(!showFloatingSessions)}
                  hiddenSessionIds={hiddenSessionIds}
                  onHiddenSessionsChange={setHiddenSessionIds}
                />
              )}
              <button
                onClick={loadAllData}
                className="btn btn-ghost text-sm"
                title="Refresh all data"
              >
                <svg
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
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
          onDeleteProject={setDeleteConfirm}
          loading={loading}
        />

        {/* Feature sidebar (only when project selected) */}
        {selectedProject && (
          <div
            className={clsx(
              "border-r border-[var(--border-subtle)] glass-subtle flex-shrink-0 flex flex-col transition-all duration-200 relative",
              isFeatureSidebarCollapsed ? "w-24" : "w-60"
            )}
          >
            {/* Gradient overlay for feature sidebar */}
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--accent-cyan)]/5 via-transparent to-[var(--accent-primary)]/3 pointer-events-none" />
            <div className="px-3 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between relative z-10 window-header-glass">
              {!isFeatureSidebarCollapsed && (
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Features ({features.length})
                </span>
              )}
              {isFeatureSidebarCollapsed && (
                <span className="text-xs font-semibold text-[var(--text-tertiary)]">
                  {features.length}
                </span>
              )}
              <button
                onClick={() => setIsFeatureSidebarCollapsed(!isFeatureSidebarCollapsed)}
                className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
                title={isFeatureSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
                    d={isFeatureSidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto relative z-10">
              <FeatureList
                features={features}
                selectedFeatureId={selectedFeatureId}
                onSelectFeature={setSelectedFeatureId}
                loading={false}
                collapsed={isFeatureSidebarCollapsed}
              />
            </div>
          </div>
        )}

        {/* Kanban board */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            /* Show loading state while data is being fetched */
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-[var(--text-secondary)] font-medium">
                  Loading projects...
                </p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">
                  Fetching all project data
                </p>
              </div>
            </div>
          ) : !selectedProject ? (
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
              featureData={selectedFeatureData}
              allFeatures={featuresWithTasks}
              projectName={selectedProject.name}
              projectPath={selectedProject.path}
              onRefresh={loadAllData}
              parentLoading={loading}
            >
              <KanbanBoard />
            </KanbanProvider>
          )}
        </div>
      </div>

      {/* Floating session windows */}
      {showFloatingSessions && projectSessions.length > 0 && onSessionNameChange && onRefreshSessions && (
        <SessionWindowsGrid
          sessions={projectSessions}
          sessionNames={sessionNames}
          onSessionNameChange={onSessionNameChange}
          onRefresh={onRefreshSessions}
          floatable
          hiddenSessionIds={hiddenSessionIds}
          onHiddenSessionsChange={setHiddenSessionIds}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          projectName={deleteConfirm.name}
          onConfirm={handleDeleteProject}
          onCancel={() => setDeleteConfirm(null)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
