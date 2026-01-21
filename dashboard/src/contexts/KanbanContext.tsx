/**
 * Kanban Context
 * Provides state management for Kanban board features and tasks
 *
 * Data is passed from parent (KanbanView) which uses the unified endpoint.
 * This context manages local state and handles task updates.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { Feature, Task, TaskStatus } from "../types/kanban";
import * as kanbanApi from "../services/kanban";

// =============================================================================
// CONTEXT TYPE
// =============================================================================

interface KanbanContextValue {
  // State
  features: Feature[];
  tasks: Task[];
  selectedFeature: Feature | null;
  loading: boolean;
  error: string | null;
  projectName: string | null;
  projectPath: string | null;

  // Actions
  selectFeature: (featureId: string | null) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  moveTask: (
    taskId: string,
    column: TaskStatus,
    order?: number,
  ) => Promise<void>;
  refreshFeatures: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  clearError: () => void;
}

const KanbanContext = createContext<KanbanContextValue | null>(null);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

/** Feature with pre-loaded tasks from unified endpoint */
export type FeatureWithTasks = Feature & { tasks: Task[] };

interface KanbanProviderProps {
  children: ReactNode;
  /** Pre-loaded feature with tasks from unified endpoint */
  featureData?: FeatureWithTasks | null;
  /** All features for the project (for feature list, if needed) */
  allFeatures?: FeatureWithTasks[];
  projectName?: string;
  projectPath?: string;
  /** Callback to refresh all data from parent */
  onRefresh?: () => Promise<void>;
  /** Loading state from parent */
  parentLoading?: boolean;
}

export function KanbanProvider({
  children,
  featureData,
  allFeatures = [],
  projectName,
  projectPath,
  onRefresh,
  parentLoading = false,
}: KanbanProviderProps) {
  // Local state for tasks (allows optimistic updates)
  const [tasks, setTasks] = useState<Task[]>(featureData?.tasks ?? []);
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  // Sync tasks when featureData changes (new feature selected or data refreshed)
  useEffect(() => {
    if (featureData?.tasks) {
      setTasks(featureData.tasks);
    } else {
      setTasks([]);
    }
  }, [featureData]);

  // Derive features list (strip tasks for the Feature[] type)
  const features: Feature[] = useMemo(
    () => allFeatures.map(({ tasks: _, ...feature }) => feature),
    [allFeatures],
  );

  // Selected feature (without tasks array for the Feature type)
  const selectedFeature: Feature | null = useMemo(() => {
    if (!featureData) return null;
    const { tasks: _, ...feature } = featureData;
    return feature;
  }, [featureData]);

  // Combined loading state
  const loading = parentLoading || localLoading;

  // =============================================================================
  // API ACTIONS
  // =============================================================================

  /**
   * Refresh features - delegates to parent's onRefresh
   */
  const refreshFeatures = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh]);

  /**
   * Refresh tasks - delegates to parent's onRefresh
   */
  const refreshTasks = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh]);

  /**
   * Select a feature by ID - no-op since parent controls selection
   */
  const selectFeature = useCallback((_featureId: string | null) => {
    // Feature selection is controlled by parent (KanbanView)
    // This is kept for interface compatibility
  }, []);

  /**
   * Update a task's status
   */
  const updateTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      try {
        setError(null);
        setLocalLoading(true);
        const updatedTask = await kanbanApi.updateTaskStatus(taskId, status);

        // Update task in local state
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updatedTask : t)),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update task";
        setError(message);
        throw err; // Re-throw for component error handling
      } finally {
        setLocalLoading(false);
      }
    },
    [],
  );

  /**
   * Move a task to a new column (drag-and-drop)
   */
  const moveTask = useCallback(
    async (taskId: string, column: TaskStatus, order?: number) => {
      // Optimistic update
      const previousTasks = tasks;
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: column } : t)),
      );

      try {
        setError(null);
        const updatedTask = await kanbanApi.moveTask(taskId, column, order);

        // Update with server response
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updatedTask : t)),
        );
      } catch (err) {
        // Rollback on error
        setTasks(previousTasks);
        const message =
          err instanceof Error ? err.message : "Failed to move task";
        setError(message);
        throw err;
      }
    },
    [tasks],
  );

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const value: KanbanContextValue = useMemo(
    () => ({
      features,
      tasks,
      selectedFeature,
      loading,
      error,
      projectName: projectName ?? null,
      projectPath: projectPath ?? null,
      selectFeature,
      updateTaskStatus,
      moveTask,
      refreshFeatures,
      refreshTasks,
      clearError,
    }),
    [
      features,
      tasks,
      selectedFeature,
      loading,
      error,
      projectName,
      projectPath,
      selectFeature,
      updateTaskStatus,
      moveTask,
      refreshFeatures,
      refreshTasks,
      clearError,
    ],
  );

  return (
    <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to use Kanban context
 */
export function useKanban(): KanbanContextValue {
  const context = useContext(KanbanContext);
  if (!context) {
    throw new Error("useKanban must be used within a KanbanProvider");
  }
  return context;
}

/**
 * Hook to get tasks grouped by status (for columns)
 */
export function useTasksByStatus(): Record<TaskStatus, Task[]> {
  const { tasks } = useKanban();

  return useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      pending: [],
      in_progress: [],
      blocked: [],
      qa: [],
      completed: [],
    };

    for (const task of tasks) {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    }

    return grouped;
  }, [tasks]);
}
