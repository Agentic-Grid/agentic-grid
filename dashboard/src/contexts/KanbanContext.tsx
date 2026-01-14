/**
 * Kanban Context
 * Provides state management for Kanban board features and tasks
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

interface KanbanProviderProps {
  children: ReactNode;
  initialFeatureId?: string;
}

export function KanbanProvider({
  children,
  initialFeatureId,
}: KanbanProviderProps) {
  // State
  const [features, setFeatures] = useState<Feature[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(
    initialFeatureId ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const selectedFeature = useMemo(() => {
    return features.find((f) => f.id === selectedFeatureId) ?? null;
  }, [features, selectedFeatureId]);

  // =============================================================================
  // API ACTIONS
  // =============================================================================

  /**
   * Refresh the features list
   */
  const refreshFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await kanbanApi.getFeatures();
      setFeatures(data);

      // Auto-select first feature if none selected and features exist
      if (!selectedFeatureId && data.length > 0) {
        setSelectedFeatureId(data[0].id);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load features";
      setError(message);
      console.error("Failed to load features:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedFeatureId]);

  /**
   * Refresh tasks for the selected feature
   */
  const refreshTasks = useCallback(async () => {
    if (!selectedFeatureId) {
      setTasks([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await kanbanApi.getTasks(selectedFeatureId);
      setTasks(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load tasks";
      setError(message);
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedFeatureId]);

  /**
   * Select a feature by ID
   */
  const selectFeature = useCallback((featureId: string | null) => {
    setSelectedFeatureId(featureId);
    setTasks([]); // Clear tasks when switching features
  }, []);

  /**
   * Update a task's status
   */
  const updateTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      try {
        setError(null);
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
  // EFFECTS
  // =============================================================================

  // Load features on mount
  useEffect(() => {
    refreshFeatures();
  }, [refreshFeatures]);

  // Load tasks when selected feature changes
  useEffect(() => {
    if (selectedFeatureId) {
      refreshTasks();
    }
  }, [selectedFeatureId, refreshTasks]);

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
