/**
 * KanbanDataContext
 * Centralized data fetching for all kanban-related components.
 * Fetches data once on mount and polls every 5 seconds.
 * All kanban components should consume data from this context.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import * as kanbanApi from "../services/kanban";
import type { ProjectWithData } from "../services/kanban";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create a fingerprint of the data to detect actual changes.
 * Only updates state when tasks/features have actually changed.
 */
function createDataFingerprint(projects: ProjectWithData[]): string {
  // Create a minimal representation that captures meaningful changes
  const fingerprint = projects.map((p) => ({
    id: p.id,
    features: p.features.map((f) => ({
      id: f.id,
      status: f.status,
      tasks: f.tasks.map((t) => ({
        id: t.id,
        status: t.status,
        updated_at: t.updated_at,
      })),
    })),
  }));
  return JSON.stringify(fingerprint);
}

// =============================================================================
// CONTEXT TYPE
// =============================================================================

interface KanbanDataContextValue {
  /** All projects with their features and tasks */
  projects: ProjectWithData[];
  /** Initial loading state */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Manually trigger a refresh */
  refresh: () => Promise<void>;
  /** Get a specific project by name */
  getProject: (projectName: string) => ProjectWithData | undefined;
  /** Get a specific project by ID */
  getProjectById: (projectId: string) => ProjectWithData | undefined;
}

const KanbanDataContext = createContext<KanbanDataContextValue | null>(null);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

interface KanbanDataProviderProps {
  children: ReactNode;
  /** Polling interval in ms (default: 5000) */
  pollInterval?: number;
}

export function KanbanDataProvider({
  children,
  pollInterval = 5000,
}: KanbanDataProviderProps) {
  const [projects, setProjects] = useState<ProjectWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track data fingerprint to avoid unnecessary re-renders
  const lastFingerprintRef = useRef<string>("");

  // Initial data fetch
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { projects: data } = await kanbanApi.getAllProjectsWithData();
      lastFingerprintRef.current = createDataFingerprint(data);
      setProjects(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load kanban data";
      setError(message);
      console.error("KanbanDataContext: Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Silent poll (no loading state change)
  // Only updates state if data has actually changed
  const pollData = useCallback(async () => {
    try {
      const { projects: data } = await kanbanApi.getAllProjectsWithData();

      // Check if data has actually changed before updating state
      const newFingerprint = createDataFingerprint(data);
      if (newFingerprint !== lastFingerprintRef.current) {
        lastFingerprintRef.current = newFingerprint;
        setProjects(data);
      }

      // Clear error on successful poll
      if (error) {
        setError(null);
      }
    } catch (err) {
      // Silent fail on poll - don't disrupt user
      console.error("KanbanDataContext: Poll refresh failed:", err);
    }
  }, [error]);

  // Manual refresh (with loading state)
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling
  useEffect(() => {
    if (pollInterval <= 0) return;

    const interval = setInterval(pollData, pollInterval);
    return () => clearInterval(interval);
  }, [pollData, pollInterval]);

  // Helper: get project by name
  const getProject = useCallback(
    (projectName: string) => {
      return projects.find((p) => p.name === projectName);
    },
    [projects],
  );

  // Helper: get project by ID
  const getProjectById = useCallback(
    (projectId: string) => {
      return projects.find((p) => p.id === projectId);
    },
    [projects],
  );

  // Context value
  const value: KanbanDataContextValue = useMemo(
    () => ({
      projects,
      loading,
      error,
      refresh,
      getProject,
      getProjectById,
    }),
    [projects, loading, error, refresh, getProject, getProjectById],
  );

  return (
    <KanbanDataContext.Provider value={value}>
      {children}
    </KanbanDataContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access kanban data from the centralized context.
 * Must be used within a KanbanDataProvider.
 */
export function useKanbanData(): KanbanDataContextValue {
  const context = useContext(KanbanDataContext);
  if (!context) {
    throw new Error("useKanbanData must be used within a KanbanDataProvider");
  }
  return context;
}
