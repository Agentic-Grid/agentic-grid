/**
 * CodeEditorPage Component
 * Main page layout: Left sidebar (FileExplorer) | Right area (Tabs + Editor)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { clsx } from "clsx";
import type { FileNode, EditorTab } from "../../types/editor";
import type { Session } from "../../types";
import { getFileTree, getFileContent, writeFile, createFile, deleteFile, moveFile } from "../../services/files";
import { FileExplorer, ContextMenu, NewFileDialog, RenameDialog, DeleteDialog } from "./FileExplorer";
import { EditorTabs, EditorPane, StatusBar } from "./Editor";
import { SearchPanel } from "./Search";
import { SessionWindowsGrid } from "../Dashboard/SessionWindowsGrid";
import { FloatingSessionsToggle } from "../Dashboard/FloatingSessionsToggle";

// =============================================================================
// ICONS
// =============================================================================

function IconArrowLeft({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function IconCode({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

function IconSave({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
      />
    </svg>
  );
}

// =============================================================================
// CODE EDITOR PAGE COMPONENT
// =============================================================================

interface CodeEditorPageProps {
  projectPath: string;
  projectName: string;
  onBack: () => void;
  sessions?: Session[];
  sessionNames?: Record<string, string>;
  onSessionNameChange?: (sessionId: string, name: string) => void;
  onRefreshSessions?: () => void;
}

export function CodeEditorPage({
  projectPath,
  projectName,
  onBack,
  sessions = [],
  sessionNames = {},
  onSessionNameChange,
  onRefreshSessions,
}: CodeEditorPageProps) {
  // File tree state
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);

  // Selection state
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Tab state
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);

  // File loading state
  const [fileLoading, setFileLoading] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);

  // Dialog states
  const [newFileDialog, setNewFileDialog] = useState<{ type: "file" | "directory"; parentPath: string } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{ path: string; name: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ path: string; name: string; isDirectory: boolean } | null>(null);

  // Operation loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search panel state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [navigateToPosition, setNavigateToPosition] = useState<{ line: number; column: number } | undefined>(undefined);

  // Session state
  const [showFloatingSessions, setShowFloatingSessions] = useState(false);
  const [hiddenSessionIds, setHiddenSessionIds] = useState<Set<string>>(new Set());

  const projectSessions = useMemo(
    () => sessions.filter((s) => s.projectPath === projectPath),
    [sessions, projectPath],
  );

  // Get active tab
  const activeTab = tabs.find((t) => t.path === activeTabPath) || null;

  // =============================================================================
  // LOAD FILE TREE
  // =============================================================================

  const loadFileTree = useCallback(async () => {
    setTreeLoading(true);
    setTreeError(null);

    try {
      const tree = await getFileTree(projectName);
      setFileTree(tree);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load files";
      setTreeError(message);
    } finally {
      setTreeLoading(false);
    }
  }, [projectName]);

  useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  // =============================================================================
  // FILE OPERATIONS
  // =============================================================================

  const handleOpenFile = useCallback(
    async (node: FileNode) => {
      if (node.type === "directory") return;

      // Check if already open
      const existingTab = tabs.find((t) => t.path === node.path);
      if (existingTab) {
        setActiveTabPath(node.path);
        return;
      }

      setFileLoading(true);

      try {
        const content = await getFileContent(projectName, node.path);

        const newTab: EditorTab = {
          path: content.path,
          name: node.name,
          language: content.language,
          isDirty: false,
          content: content.content,
          originalContent: content.content,
          encoding: content.encoding,
        };

        setTabs((prev) => [...prev, newTab]);
        setActiveTabPath(node.path);
      } catch (error) {
        console.error("Failed to open file:", error);
      } finally {
        setFileLoading(false);
      }
    },
    [projectName, tabs]
  );

  const handleCloseTab = useCallback(
    (path: string) => {
      const tabIndex = tabs.findIndex((t) => t.path === path);
      if (tabIndex === -1) return;

      const tab = tabs[tabIndex];

      // If dirty, confirm close
      if (tab.isDirty) {
        const confirmed = window.confirm(`${tab.name} has unsaved changes. Close anyway?`);
        if (!confirmed) return;
      }

      const newTabs = tabs.filter((t) => t.path !== path);
      setTabs(newTabs);

      // If closing active tab, select another
      if (activeTabPath === path) {
        if (newTabs.length === 0) {
          setActiveTabPath(null);
        } else if (tabIndex > 0) {
          setActiveTabPath(newTabs[tabIndex - 1].path);
        } else {
          setActiveTabPath(newTabs[0].path);
        }
      }
    },
    [tabs, activeTabPath]
  );

  const handleContentChange = useCallback(
    (value: string | undefined) => {
      if (!activeTabPath || value === undefined) return;

      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.path === activeTabPath) {
            return {
              ...tab,
              content: value,
              isDirty: value !== tab.originalContent,
            };
          }
          return tab;
        })
      );
    },
    [activeTabPath]
  );

  const handleSave = useCallback(async () => {
    if (!activeTab || !activeTab.isDirty) return;

    setIsSaving(true);

    try {
      await writeFile(projectName, activeTab.path, activeTab.content);

      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.path === activeTab.path) {
            return {
              ...tab,
              isDirty: false,
              originalContent: tab.content,
            };
          }
          return tab;
        })
      );
    } catch (error) {
      console.error("Failed to save file:", error);
      alert(`Failed to save: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  }, [activeTab, projectName]);

  // =============================================================================
  // TREE OPERATIONS
  // =============================================================================

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  // =============================================================================
  // CONTEXT MENU HANDLERS
  // =============================================================================

  const handleContextMenu = useCallback((e: React.MouseEvent, node: FileNode) => {
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleNewFile = useCallback(() => {
    if (!contextMenu) return;
    const parentPath = contextMenu.node.type === "directory" ? contextMenu.node.path : "";
    setNewFileDialog({ type: "file", parentPath });
  }, [contextMenu]);

  const handleNewFolder = useCallback(() => {
    if (!contextMenu) return;
    const parentPath = contextMenu.node.type === "directory" ? contextMenu.node.path : "";
    setNewFileDialog({ type: "directory", parentPath });
  }, [contextMenu]);

  const handleRenameStart = useCallback(() => {
    if (!contextMenu) return;
    setRenameDialog({ path: contextMenu.node.path, name: contextMenu.node.name });
  }, [contextMenu]);

  const handleDeleteStart = useCallback(() => {
    if (!contextMenu) return;
    setDeleteDialog({
      path: contextMenu.node.path,
      name: contextMenu.node.name,
      isDirectory: contextMenu.node.type === "directory",
    });
  }, [contextMenu]);

  const handleCopyPath = useCallback(async () => {
    if (!contextMenu) return;
    try {
      await navigator.clipboard.writeText(contextMenu.node.path);
    } catch (error) {
      console.error("Failed to copy path:", error);
    }
  }, [contextMenu]);

  const handleCopyRelativePath = useCallback(async () => {
    if (!contextMenu) return;
    try {
      await navigator.clipboard.writeText(contextMenu.node.path);
    } catch (error) {
      console.error("Failed to copy path:", error);
    }
  }, [contextMenu]);

  // =============================================================================
  // FILE OPERATION HANDLERS (CREATE, RENAME, DELETE)
  // =============================================================================

  const handleCreateFile = useCallback(
    async (name: string) => {
      if (!newFileDialog) return;

      setIsCreating(true);

      try {
        const fullPath = newFileDialog.parentPath ? `${newFileDialog.parentPath}/${name}` : name;
        await createFile(projectName, fullPath, newFileDialog.type);

        // Refresh tree
        await loadFileTree();

        // If creating a file, open it
        if (newFileDialog.type === "file") {
          const newNode: FileNode = {
            name,
            path: fullPath,
            type: "file",
          };
          await handleOpenFile(newNode);
        } else {
          // Expand parent folder if creating a folder
          if (newFileDialog.parentPath) {
            setExpandedPaths((prev) => new Set([...prev, newFileDialog.parentPath]));
          }
        }

        setNewFileDialog(null);
      } catch (error) {
        console.error("Failed to create file:", error);
        alert(`Failed to create: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setIsCreating(false);
      }
    },
    [newFileDialog, projectName, loadFileTree, handleOpenFile]
  );

  const handleRename = useCallback(
    async (newName: string) => {
      if (!renameDialog) return;

      setIsRenaming(true);

      try {
        const parentPath = renameDialog.path.substring(0, renameDialog.path.lastIndexOf("/"));
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;

        await moveFile(projectName, renameDialog.path, newPath);

        // Refresh tree
        await loadFileTree();

        // Update tabs if the renamed file was open
        setTabs((prev) =>
          prev.map((tab) => {
            if (tab.path === renameDialog.path) {
              return { ...tab, path: newPath, name: newName };
            }
            // Also update paths for files inside renamed directory
            if (tab.path.startsWith(renameDialog.path + "/")) {
              const relativePath = tab.path.substring(renameDialog.path.length);
              return { ...tab, path: newPath + relativePath };
            }
            return tab;
          })
        );

        // Update active tab path if needed
        if (activeTabPath === renameDialog.path) {
          setActiveTabPath(newPath);
        } else if (activeTabPath?.startsWith(renameDialog.path + "/")) {
          const relativePath = activeTabPath.substring(renameDialog.path.length);
          setActiveTabPath(newPath + relativePath);
        }

        setRenameDialog(null);
      } catch (error) {
        console.error("Failed to rename:", error);
        alert(`Failed to rename: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setIsRenaming(false);
      }
    },
    [renameDialog, projectName, loadFileTree, activeTabPath]
  );

  const handleDelete = useCallback(
    async (recursive: boolean) => {
      if (!deleteDialog) return;

      setIsDeleting(true);

      try {
        await deleteFile(projectName, deleteDialog.path, recursive);

        // Refresh tree
        await loadFileTree();

        // Close tab if the deleted file was open
        const tabToClose = tabs.find(
          (tab) => tab.path === deleteDialog.path || tab.path.startsWith(deleteDialog.path + "/")
        );
        if (tabToClose) {
          handleCloseTab(tabToClose.path);
        }

        setDeleteDialog(null);
      } catch (error) {
        console.error("Failed to delete:", error);
        alert(`Failed to delete: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setIsDeleting(false);
      }
    },
    [deleteDialog, projectName, loadFileTree, tabs, handleCloseTab]
  );

  // =============================================================================
  // SEARCH NAVIGATION
  // =============================================================================

  const handleNavigateToResult = useCallback(
    async (path: string, line: number, column: number) => {
      // Check if file is already open
      const existingTab = tabs.find((t) => t.path === path);

      if (existingTab) {
        // File is open, just navigate to position
        setActiveTabPath(path);
        setNavigateToPosition({ line, column });
      } else {
        // File needs to be opened first
        setFileLoading(true);

        try {
          const content = await getFileContent(projectName, path);
          const fileName = path.split("/").pop() || path;

          const newTab: EditorTab = {
            path: content.path,
            name: fileName,
            language: content.language,
            isDirty: false,
            content: content.content,
            originalContent: content.content,
            encoding: content.encoding,
          };

          setTabs((prev) => [...prev, newTab]);
          setActiveTabPath(path);
          // Set navigation position after a short delay to ensure editor is mounted
          setTimeout(() => {
            setNavigateToPosition({ line, column });
          }, 100);
        } catch (error) {
          console.error("Failed to open file:", error);
        } finally {
          setFileLoading(false);
        }
      }
    },
    [tabs, projectName]
  );

  // Clear navigation position after it's been applied
  const handleCursorChange = useCallback((position: { line: number; column: number }) => {
    setCursorPosition(position);
    // Clear navigateToPosition after cursor moves
    setNavigateToPosition(undefined);
  }, []);

  // =============================================================================
  // KEYBOARD SHORTCUTS
  // =============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+S / Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }

      // Cmd+W / Ctrl+W to close tab
      if ((e.metaKey || e.ctrlKey) && e.key === "w") {
        e.preventDefault();
        if (activeTabPath) {
          handleCloseTab(activeTabPath);
        }
      }

      // Cmd+Shift+F / Ctrl+Shift+F to toggle search
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleCloseTab, activeTabPath]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-3 border-b border-[var(--border-subtle)] flex items-center gap-4 bg-gradient-to-r from-[var(--accent-primary)]/5 via-transparent to-[var(--color-wine-medium)]/3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl glass hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-all hover:shadow-md"
          title="Back"
        >
          <IconArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl glass border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-primary-glow)] flex items-center justify-center">
            <IconCode className="w-5 h-5 text-[var(--accent-primary)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Code Editor</h1>
            <p className="text-xs text-[var(--text-tertiary)]">{projectName}</p>
          </div>
        </div>

        {/* Right side: Save + Sessions */}
        <div className="ml-auto flex items-center gap-3">
          {activeTab && activeTab.isDirty && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-dim)] text-white",
                "shadow-[0_0_15px_var(--accent-primary-glow)] hover:shadow-[0_0_25px_var(--accent-primary-glow)]",
                isSaving && "opacity-50 cursor-not-allowed"
              )}
            >
              <IconSave className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save"}
              <span className="text-xs opacity-70">Cmd+S</span>
            </button>
          )}
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
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Search Panel */}
        <SearchPanel
          projectName={projectName}
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onNavigateToResult={handleNavigateToResult}
        />

        {/* File Explorer */}
        <div className="w-64 flex-shrink-0">
          <FileExplorer
            projectName={projectName}
            files={fileTree}
            isLoading={treeLoading}
            error={treeError}
            expandedPaths={expandedPaths}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            onToggle={handleToggle}
            onOpen={handleOpenFile}
            onRefresh={loadFileTree}
            onCollapseAll={handleCollapseAll}
            onContextMenu={handleContextMenu}
          />
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <EditorTabs
            tabs={tabs}
            activeTabPath={activeTabPath}
            onSelectTab={setActiveTabPath}
            onCloseTab={handleCloseTab}
          />

          {/* Editor */}
          <div className="flex-1 relative">
            {fileLoading && (
              <div className="absolute inset-0 bg-[var(--bg-secondary)]/80 flex items-center justify-center z-10">
                <div
                  className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
                />
              </div>
            )}
            <EditorPane
              content={activeTab?.content ?? null}
              language={activeTab?.language ?? "plaintext"}
              filePath={activeTab?.path}
              encoding={activeTab?.encoding}
              onChange={handleContentChange}
              onCursorChange={handleCursorChange}
              initialPosition={navigateToPosition}
            />
          </div>

          {/* Status Bar */}
          <StatusBar
            file={activeTab}
            cursorPosition={cursorPosition}
          />
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextMenu.node}
          onClose={handleCloseContextMenu}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRenameStart}
          onDelete={handleDeleteStart}
          onCopyPath={handleCopyPath}
          onCopyRelativePath={handleCopyRelativePath}
        />
      )}

      {/* New File/Folder Dialog */}
      {newFileDialog && (
        <NewFileDialog
          isOpen={true}
          type={newFileDialog.type}
          parentPath={newFileDialog.parentPath}
          onClose={() => setNewFileDialog(null)}
          onCreate={handleCreateFile}
          isCreating={isCreating}
        />
      )}

      {/* Rename Dialog */}
      {renameDialog && (
        <RenameDialog
          isOpen={true}
          currentPath={renameDialog.path}
          currentName={renameDialog.name}
          onClose={() => setRenameDialog(null)}
          onRename={handleRename}
          isRenaming={isRenaming}
        />
      )}

      {/* Delete Dialog */}
      {deleteDialog && (
        <DeleteDialog
          isOpen={true}
          path={deleteDialog.path}
          name={deleteDialog.name}
          isDirectory={deleteDialog.isDirectory}
          onClose={() => setDeleteDialog(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}

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
