import {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import type { SlashCommand } from "../types";
import { getSlashCommands } from "../services/api";

interface SlashCommandsContextValue {
  // Get commands for a project (loads if not cached)
  getProjectCommands: (projectFolder: string) => SlashCommand[];
  // Load commands for a project (call once per project)
  loadProjectCommands: (projectFolder: string) => Promise<void>;
  // Check if commands are loading for a project
  isLoading: (projectFolder: string) => boolean;
  // Force refresh commands for a project
  refreshProjectCommands: (projectFolder: string) => Promise<void>;
}

const SlashCommandsContext = createContext<SlashCommandsContextValue | null>(
  null,
);

interface SlashCommandsProviderProps {
  children: ReactNode;
}

export function SlashCommandsProvider({
  children,
}: SlashCommandsProviderProps) {
  // Cache commands by project folder
  const [commandsCache, setCommandsCache] = useState<
    Record<string, SlashCommand[]>
  >({});
  // Track loading state per project
  const [loadingProjects, setLoadingProjects] = useState<Set<string>>(
    new Set(),
  );
  // Track which projects have been loaded (to avoid duplicate requests)
  const [loadedProjects, setLoadedProjects] = useState<Set<string>>(new Set());

  const loadProjectCommands = useCallback(
    async (projectFolder: string) => {
      // Skip if already loaded or currently loading
      if (
        loadedProjects.has(projectFolder) ||
        loadingProjects.has(projectFolder)
      ) {
        return;
      }

      // Mark as loading
      setLoadingProjects((prev) => new Set(prev).add(projectFolder));

      try {
        const response = await getSlashCommands(projectFolder);
        setCommandsCache((prev) => ({
          ...prev,
          [projectFolder]: response.data || [],
        }));
        setLoadedProjects((prev) => new Set(prev).add(projectFolder));
      } catch (err) {
        console.error(
          `Failed to load commands for project ${projectFolder}:`,
          err,
        );
        // Still mark as loaded to prevent retry loops
        setLoadedProjects((prev) => new Set(prev).add(projectFolder));
      } finally {
        setLoadingProjects((prev) => {
          const next = new Set(prev);
          next.delete(projectFolder);
          return next;
        });
      }
    },
    [loadedProjects, loadingProjects],
  );

  const refreshProjectCommands = useCallback(async (projectFolder: string) => {
    // Remove from loaded to allow re-fetch
    setLoadedProjects((prev) => {
      const next = new Set(prev);
      next.delete(projectFolder);
      return next;
    });

    // Mark as loading
    setLoadingProjects((prev) => new Set(prev).add(projectFolder));

    try {
      const response = await getSlashCommands(projectFolder);
      setCommandsCache((prev) => ({
        ...prev,
        [projectFolder]: response.data || [],
      }));
      setLoadedProjects((prev) => new Set(prev).add(projectFolder));
    } catch (err) {
      console.error(
        `Failed to refresh commands for project ${projectFolder}:`,
        err,
      );
    } finally {
      setLoadingProjects((prev) => {
        const next = new Set(prev);
        next.delete(projectFolder);
        return next;
      });
    }
  }, []);

  const getProjectCommands = useCallback(
    (projectFolder: string): SlashCommand[] => {
      return commandsCache[projectFolder] || [];
    },
    [commandsCache],
  );

  const isLoading = useCallback(
    (projectFolder: string): boolean => {
      return loadingProjects.has(projectFolder);
    },
    [loadingProjects],
  );

  const value = useMemo(
    (): SlashCommandsContextValue => ({
      getProjectCommands,
      loadProjectCommands,
      isLoading,
      refreshProjectCommands,
    }),
    [
      getProjectCommands,
      loadProjectCommands,
      isLoading,
      refreshProjectCommands,
    ],
  );

  return (
    <SlashCommandsContext.Provider value={value}>
      {children}
    </SlashCommandsContext.Provider>
  );
}

// Hook to use slash commands context
export function useSlashCommands(): SlashCommandsContextValue {
  const context = useContext(SlashCommandsContext);
  if (!context) {
    throw new Error(
      "useSlashCommands must be used within a SlashCommandsProvider",
    );
  }
  return context;
}

// Convenience hook for a specific project's commands
export function useProjectCommands(projectPath: string): {
  commands: SlashCommand[];
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const { getProjectCommands, isLoading, refreshProjectCommands } =
    useSlashCommands();

  // Convert path to folder format
  const projectFolder = projectPath.replace(/\//g, "-");

  const commands = getProjectCommands(projectFolder);
  const loading = isLoading(projectFolder);

  return useMemo(
    () => ({
      commands,
      isLoading: loading,
      refresh: () => refreshProjectCommands(projectFolder),
    }),
    [commands, loading, refreshProjectCommands, projectFolder],
  );
}
