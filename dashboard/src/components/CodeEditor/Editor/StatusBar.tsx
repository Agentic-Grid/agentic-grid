/**
 * StatusBar Component
 * Bottom status bar showing file info, cursor position, and git status
 */

import type { EditorTab } from "../../../types/editor";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get display name for language
 */
function getLanguageDisplayName(language: string): string {
  const languageMap: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    typescriptreact: "TypeScript React",
    javascriptreact: "JavaScript React",
    json: "JSON",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    less: "Less",
    markdown: "Markdown",
    yaml: "YAML",
    xml: "XML",
    python: "Python",
    java: "Java",
    go: "Go",
    rust: "Rust",
    c: "C",
    cpp: "C++",
    csharp: "C#",
    php: "PHP",
    ruby: "Ruby",
    swift: "Swift",
    kotlin: "Kotlin",
    shell: "Shell",
    bash: "Bash",
    sql: "SQL",
    graphql: "GraphQL",
    dockerfile: "Dockerfile",
    plaintext: "Plain Text",
  };

  return languageMap[language] || language.charAt(0).toUpperCase() + language.slice(1);
}

// =============================================================================
// STATUS BAR ITEM
// =============================================================================

interface StatusItemProps {
  children: React.ReactNode;
  title?: string;
}

function StatusItem({ children, title }: StatusItemProps) {
  return (
    <span
      title={title}
      className="px-2 py-0.5 hover:bg-[var(--bg-hover)] rounded cursor-default transition-colors"
    >
      {children}
    </span>
  );
}

// =============================================================================
// GIT STATUS INDICATOR
// =============================================================================

interface GitStatusIndicatorProps {
  status?: string;
}

function GitStatusIndicator({ status }: GitStatusIndicatorProps) {
  if (!status) return null;

  const statusColors: Record<string, string> = {
    M: "text-[var(--accent-amber)]",
    A: "text-[var(--accent-primary)]",
    D: "text-[var(--accent-rose)]",
    U: "text-[var(--accent-primary)]",
    "?": "text-[var(--text-tertiary)]",
  };

  const statusLabels: Record<string, string> = {
    M: "Modified",
    A: "Added",
    D: "Deleted",
    U: "Unmerged",
    "?": "Untracked",
  };

  const color = statusColors[status] || "text-[var(--text-tertiary)]";
  const label = statusLabels[status] || status;

  return (
    <StatusItem title={`Git: ${label}`}>
      <span className={color}>{label}</span>
    </StatusItem>
  );
}

// =============================================================================
// STATUS BAR COMPONENT
// =============================================================================

interface StatusBarProps {
  file: EditorTab | null;
  cursorPosition?: { line: number; column: number };
  gitStatus?: string;
}

export function StatusBar({ file, cursorPosition, gitStatus }: StatusBarProps) {
  if (!file) {
    return (
      <div className="h-6 px-4 border-t border-[var(--border-subtle)] glass-subtle flex items-center text-xs text-[var(--text-tertiary)]">
        <span className="opacity-50">No file open</span>
      </div>
    );
  }

  return (
    <div className="h-6 px-2 border-t border-[var(--border-subtle)] glass-subtle flex items-center text-xs text-[var(--text-tertiary)] gap-1">
      {/* Left side items */}
      <div className="flex items-center gap-1">
        {/* Language */}
        <StatusItem title="Language Mode">
          {getLanguageDisplayName(file.language)}
        </StatusItem>

        {/* Separator */}
        <span className="text-[var(--border-subtle)]">|</span>

        {/* Encoding */}
        <StatusItem title="File Encoding">UTF-8</StatusItem>

        {/* Separator */}
        <span className="text-[var(--border-subtle)]">|</span>

        {/* Line ending */}
        <StatusItem title="End of Line Sequence">LF</StatusItem>

        {/* Separator */}
        <span className="text-[var(--border-subtle)]">|</span>

        {/* Indentation */}
        <StatusItem title="Indentation">Spaces: 2</StatusItem>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side items */}
      <div className="flex items-center gap-1">
        {/* Git status */}
        {gitStatus && (
          <>
            <GitStatusIndicator status={gitStatus} />
            <span className="text-[var(--border-subtle)]">|</span>
          </>
        )}

        {/* Modified indicator */}
        {file.isDirty && (
          <>
            <StatusItem title="Unsaved Changes">
              <span className="text-[var(--accent-amber)]">Modified</span>
            </StatusItem>
            <span className="text-[var(--border-subtle)]">|</span>
          </>
        )}

        {/* Cursor position */}
        {cursorPosition && (
          <StatusItem title="Cursor Position">
            Ln {cursorPosition.line}, Col {cursorPosition.column}
          </StatusItem>
        )}
      </div>
    </div>
  );
}
