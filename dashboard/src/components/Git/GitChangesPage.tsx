/**
 * GitChangesPage Component
 * Main page for git source control - displays changes, diffs, and commit interface
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { GitStatus, FileDiff, Session } from "../../types";
import {
  getGitStatus,
  getGitDiff,
  stageFiles,
  unstageFiles,
  createCommit,
  isGitRepo,
  initGitRepo,
  pushGit,
  getCommitDiff,
} from "../../services/api";
import { FileList } from "./FileList";
import { DiffViewer } from "./DiffViewer";
import { CommitPanel } from "./CommitPanel";
import { CommitHistory } from "./CommitHistory";
import { SessionWindowsGrid } from "../Dashboard/SessionWindowsGrid";
import { FloatingSessionsToggle } from "../Dashboard/FloatingSessionsToggle";

type LeftTab = "changes" | "history";

interface GitChangesPageProps {
  projectPath: string;
  projectName: string;
  onBack: () => void;
  sessions?: Session[];
  sessionNames?: Record<string, string>;
  onSessionNameChange?: (sessionId: string, name: string) => void;
  onRefreshSessions?: () => void;
}

export function GitChangesPage({
  projectPath,
  projectName,
  onBack,
  sessions = [],
  sessionNames = {},
  onSessionNameChange,
  onRefreshSessions,
}: GitChangesPageProps) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileStaged, setSelectedFileStaged] = useState<boolean>(false);
  const [diff, setDiff] = useState<FileDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [diffLoading, setDiffLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isRepo, setIsRepo] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("changes");
  const [isPushing, setIsPushing] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [selectedCommitHash, setSelectedCommitHash] = useState<string | null>(null);
  const [commitDiffs, setCommitDiffs] = useState<FileDiff[] | null>(null);
  const [commitDiffLoading, setCommitDiffLoading] = useState(false);

  // Session state
  const [showFloatingSessions, setShowFloatingSessions] = useState(false);
  const [hiddenSessionIds, setHiddenSessionIds] = useState<Set<string>>(new Set());

  const projectSessions = useMemo(
    () => sessions.filter((s) => s.projectPath === projectPath),
    [sessions, projectPath],
  );

  // Fetch git status
  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await getGitStatus(projectName);
      setStatus(response.data);
    } catch (err) {
      console.error("Failed to fetch git status:", err);
      setError("Failed to load git status");
    }
  }, [projectName]);

  // Check if it's a git repo and fetch status
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const repoCheck = await isGitRepo(projectName);
        setIsRepo(repoCheck.data.isGitRepo);

        if (repoCheck.data.isGitRepo) {
          await fetchStatus();
        }
      } catch (err) {
        console.error("Failed to check git repo:", err);
        setError("Failed to check git repository status");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [projectName, fetchStatus]);

  // Fetch diff when file selected
  useEffect(() => {
    if (!selectedFile) {
      setDiff(null);
      return;
    }

    async function fetchDiff() {
      setDiffLoading(true);
      try {
        const response = await getGitDiff(projectName, {
          file: selectedFile!,
          staged: selectedFileStaged,
        });
        setDiff(response.data[0] || null);
      } catch (err) {
        console.error("Failed to fetch diff:", err);
        setDiff(null);
      } finally {
        setDiffLoading(false);
      }
    }

    fetchDiff();
  }, [projectName, selectedFile, selectedFileStaged]);

  // Handle file selection
  const handleSelectFile = (path: string, staged: boolean = false) => {
    // Check if the file is in staged list
    const isStaged =
      staged || (status?.staged.some((f) => f.path === path) ?? false);
    setSelectedFile(path);
    setSelectedFileStaged(isStaged);
    // Clear commit diff state when selecting a file
    setSelectedCommitHash(null);
    setCommitDiffs(null);
  };

  // Handle stage files
  const handleStage = async (files: string[]) => {
    try {
      await stageFiles(projectName, files);
      await fetchStatus();
      // Update staged state if selected file was staged
      if (selectedFile && files.includes(selectedFile)) {
        setSelectedFileStaged(true);
      }
    } catch (err) {
      console.error("Failed to stage files:", err);
    }
  };

  // Handle unstage files
  const handleUnstage = async (files: string[]) => {
    try {
      await unstageFiles(projectName, files);
      await fetchStatus();
      // Update staged state if selected file was unstaged
      if (selectedFile && files.includes(selectedFile)) {
        setSelectedFileStaged(false);
      }
    } catch (err) {
      console.error("Failed to unstage files:", err);
    }
  };

  // Handle commit
  const handleCommit = async (message: string) => {
    setIsCommitting(true);
    try {
      await createCommit(projectName, message);
      await fetchStatus();
      setSelectedFile(null);
      setDiff(null);
      setHistoryKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to create commit:", err);
      setError("Failed to create commit");
    } finally {
      setIsCommitting(false);
    }
  };

  // Handle push
  const handlePush = async () => {
    setIsPushing(true);
    setError(null);
    try {
      await pushGit(projectName);
      await fetchStatus();
      setHistoryKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to push:", err);
      setError(err instanceof Error ? err.message : "Failed to push");
    } finally {
      setIsPushing(false);
    }
  };

  // Handle revert from history (refresh status since changes moved to working tree)
  const handleHistoryRevert = async () => {
    await fetchStatus();
    setHistoryKey((k) => k + 1);
    setLeftTab("changes");
  };

  // Handle commit selection in history tab
  const handleSelectCommit = useCallback(async (commitHash: string) => {
    // Toggle off if clicking the same commit
    if (selectedCommitHash === commitHash) {
      setSelectedCommitHash(null);
      setCommitDiffs(null);
      return;
    }

    setSelectedCommitHash(commitHash);
    setCommitDiffLoading(true);
    setDiff(null);
    setSelectedFile(null);
    try {
      const response = await getCommitDiff(projectName, commitHash);
      setCommitDiffs(response.data);
    } catch (err) {
      console.error("Failed to fetch commit diff:", err);
      setCommitDiffs([]);
    } finally {
      setCommitDiffLoading(false);
    }
  }, [projectName, selectedCommitHash]);

  // Handle init repo
  const handleInitRepo = async () => {
    try {
      await initGitRepo(projectName);
      setIsRepo(true);
      await fetchStatus();
    } catch (err) {
      console.error("Failed to initialize repository:", err);
      setError("Failed to initialize git repository");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <Header projectName={projectName} branch="" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-text-muted">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // Not a git repo
  if (isRepo === false) {
    return (
      <div className="h-full flex flex-col">
        <Header projectName={projectName} branch="" onBack={onBack} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <svg
            className="w-16 h-16 text-text-muted opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-text-muted">
            This directory is not a git repository
          </p>
          <button
            onClick={handleInitRepo}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg
                       font-medium text-sm transition-colors"
          >
            Initialize Repository
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !status) {
    return (
      <div className="h-full flex flex-col">
        <Header projectName={projectName} branch="" onBack={onBack} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-rose-400">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchStatus();
            }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-text-primary rounded-lg
                       font-medium text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <Header
        projectName={projectName}
        branch={status?.branch || ""}
        ahead={status?.ahead || 0}
        onBack={onBack}
        onPush={handlePush}
        isPushing={isPushing}
        rightContent={
          projectSessions.length > 0 ? (
            <FloatingSessionsToggle
              sessions={projectSessions}
              sessionNames={sessionNames}
              showFloatingSessions={showFloatingSessions}
              onToggleAll={() => setShowFloatingSessions(!showFloatingSessions)}
              hiddenSessionIds={hiddenSessionIds}
              onHiddenSessionsChange={setHiddenSessionIds}
            />
          ) : undefined
        }
      />

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Left panel: Tabs (Changes / History) + Commit */}
        <div className="w-80 border-r border-white/10 flex flex-col flex-shrink-0">
          {/* Tab header */}
          <div className="flex border-b border-white/10 flex-shrink-0">
            <button
              onClick={() => {
                setLeftTab("changes");
                setSelectedCommitHash(null);
                setCommitDiffs(null);
              }}
              className={`flex-1 px-3 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors
                ${leftTab === "changes"
                  ? "text-text-primary border-b-2 border-primary-500"
                  : "text-text-muted hover:text-text-secondary"
                }`}
            >
              Changes
              {(status?.staged.length || 0) + (status?.unstaged.length || 0) + (status?.untracked.length || 0) > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">
                  {(status?.staged.length || 0) + (status?.unstaged.length || 0) + (status?.untracked.length || 0)}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setLeftTab("history");
                setSelectedFile(null);
                setDiff(null);
              }}
              className={`flex-1 px-3 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors
                ${leftTab === "history"
                  ? "text-text-primary border-b-2 border-primary-500"
                  : "text-text-muted hover:text-text-secondary"
                }`}
            >
              History
              {(status?.ahead || 0) > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
                  {status?.ahead}
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {leftTab === "changes" ? (
              <FileList
                staged={status?.staged || []}
                unstaged={status?.unstaged || []}
                untracked={status?.untracked || []}
                selectedFile={selectedFile}
                onSelectFile={(path) => {
                  const isStaged = status?.staged.some((f) => f.path === path);
                  handleSelectFile(path, isStaged || false);
                }}
                onStage={handleStage}
                onUnstage={handleUnstage}
              />
            ) : (
              <CommitHistory
                key={historyKey}
                projectName={projectName}
                onRevert={handleHistoryRevert}
                onSelectCommit={handleSelectCommit}
                selectedCommitHash={selectedCommitHash}
              />
            )}
          </div>

          {/* Commit panel - only on changes tab */}
          {leftTab === "changes" && (
            <CommitPanel
              stagedCount={status?.staged.length || 0}
              onCommit={handleCommit}
              isCommitting={isCommitting}
            />
          )}
        </div>

        {/* Right panel: Diff viewer */}
        <div className="flex-1 overflow-hidden">
          <DiffViewer
            diff={selectedCommitHash ? null : diff}
            diffs={selectedCommitHash ? (commitDiffs ?? undefined) : undefined}
            loading={selectedCommitHash ? commitDiffLoading : diffLoading}
          />
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

// Header component
function Header({
  projectName,
  branch,
  ahead = 0,
  onBack,
  onPush,
  isPushing = false,
  rightContent,
}: {
  projectName: string;
  branch: string;
  ahead?: number;
  onBack: () => void;
  onPush?: () => void;
  isPushing?: boolean;
  rightContent?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 flex-shrink-0">
      <button
        onClick={onBack}
        className="text-text-muted hover:text-text-primary transition-colors
                   flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        <span className="text-sm">Back</span>
      </button>
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <h1 className="text-lg font-semibold text-text-primary">
          Source Control
        </h1>
        <span className="text-sm text-text-muted">
          — {projectName}
        </span>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        {rightContent}

        {/* Push button */}
        {onPush && <button
          onClick={onPush}
          disabled={isPushing || ahead === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
            ${ahead > 0
              ? "bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 border border-primary-500/30"
              : "bg-white/5 text-text-muted cursor-not-allowed border border-white/10"
            }
            ${isPushing ? "opacity-70" : ""}
          `}
          title={ahead > 0 ? `Push ${ahead} commit${ahead !== 1 ? "s" : ""} to remote` : "Nothing to push"}
        >
          {isPushing ? (
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 11l5-5m0 0l5 5m-5-5v12"
              />
            </svg>
          )}
          <span>Push</span>
          {ahead > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">
              {ahead}
            </span>
          )}
        </button>}

        {branch && (
          <span className="text-sm text-text-muted flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            {branch}
          </span>
        )}
      </div>
    </div>
  );
}
