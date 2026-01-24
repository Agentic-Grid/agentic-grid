/**
 * ProjectFeaturesView Component
 * Project-specific Kanban view for features and tasks
 */

import { useState, useMemo, useEffect, useRef } from "react";
import {
  KanbanProvider,
  type FeatureWithTasks,
} from "../../contexts/KanbanContext";
import { useKanbanData } from "../../contexts/KanbanDataContext";
import { KanbanBoard } from "../Kanban/KanbanBoard";
import { SessionWindowsGrid } from "../Dashboard/SessionWindowsGrid";
import { FloatingSessionsToggle } from "../Dashboard/FloatingSessionsToggle";
import type { Feature } from "../../types/kanban";
import type { Session } from "../../types";
import clsx from "clsx";

// =============================================================================
// Types
// =============================================================================

interface ProjectFeaturesViewProps {
  projectPath: string;
  projectName: string;
  onBack: () => void;
  /** Sessions to display as floating windows */
  sessions?: Session[];
  /** Session names map */
  sessionNames?: Record<string, string>;
  /** Callback to handle session name change */
  onSessionNameChange?: (sessionId: string, name: string) => void;
  /** Callback to refresh sessions */
  onRefreshSessions?: () => void;
}

// =============================================================================
// Icons
// =============================================================================

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function IconKanban({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
  );
}

function IconChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
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
                "w-full px-2 py-1.5 rounded-lg text-left transition-all border group relative",
                isSelected
                  ? "bg-[var(--accent-primary-glow)] border-[var(--accent-primary)]/30"
                  : "bg-[var(--bg-tertiary)] border-transparent hover:bg-[var(--bg-hover)]",
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

export function ProjectFeaturesView({
  projectPath,
  projectName,
  onBack,
  sessions = [],
  sessionNames = {},
  onSessionNameChange,
  onRefreshSessions,
}: ProjectFeaturesViewProps) {
  // Get data from centralized context
  const {
    projects: projectsWithData,
    loading,
    refresh: loadAllData,
  } = useKanbanData();

  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  // Feature sidebar collapsed state
  const [isFeatureSidebarCollapsed, setIsFeatureSidebarCollapsed] = useState(false);

  // Toggle for showing floating session windows
  const [showFloatingSessions, setShowFloatingSessions] = useState(false);

  // Hidden/minimized sessions for floating mode
  const [hiddenSessionIds, setHiddenSessionIds] = useState<Set<string>>(new Set());

  // Track if we've done initial auto-selection
  const hasAutoSelected = useRef(false);

  // Find the project by name
  const selectedProject = useMemo(
    () => projectsWithData.find((p) => p.name === projectName) || null,
    [projectsWithData, projectName],
  );

  // Auto-select first feature on initial load
  useEffect(() => {
    if (
      !hasAutoSelected.current &&
      selectedProject &&
      selectedProject.features.length > 0 &&
      !selectedFeatureId
    ) {
      hasAutoSelected.current = true;
      setSelectedFeatureId(selectedProject.features[0].id);
    }
  }, [selectedProject, selectedFeatureId]);

  // Reset auto-selection when project changes
  useEffect(() => {
    hasAutoSelected.current = false;
    setSelectedFeatureId(null);
  }, [projectName]);

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

  // Filter sessions for this project (excluding the current feature's session)
  const projectSessions = useMemo(() => {
    const featureSessionId = selectedFeatureData?.session_id;
    return sessions.filter((s) =>
      s.projectPath === projectPath && s.id !== featureSessionId
    );
  }, [sessions, projectPath, selectedFeatureData?.session_id]);

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header with glass reflection */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] window-header-glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
              title="Back"
            >
              <IconArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center">
                <IconKanban className="w-5 h-5 text-[var(--accent-primary)]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">
                  {projectName}
                </h1>
                <p className="text-sm text-[var(--text-tertiary)]">
                  Features & Tasks - {features.length} features
                </p>
              </div>
            </div>
          </div>
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
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Feature sidebar */}
        <div
          className={clsx(
            "border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex-shrink-0 flex flex-col transition-all duration-200",
            isFeatureSidebarCollapsed ? "w-24" : "w-64"
          )}
        >
          <div className="px-3 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between window-header-glass">
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
              {isFeatureSidebarCollapsed ? (
                <IconChevronRight className="w-4 h-4" />
              ) : (
                <IconChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <FeatureList
              features={features}
              selectedFeatureId={selectedFeatureId}
              onSelectFeature={setSelectedFeatureId}
              loading={loading}
              collapsed={isFeatureSidebarCollapsed}
            />
          </div>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--bg-hover)] flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-[var(--text-secondary)] font-medium">
                  Loading features...
                </p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">
                  Fetching project data
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
                  Project not found
                </p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">
                  This project has no features data yet
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
    </div>
  );
}
