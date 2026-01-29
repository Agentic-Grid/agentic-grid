/**
 * SearchResults Component
 * Displays search results grouped by file with collapsible sections
 */

import { useState, useCallback } from "react";
import { clsx } from "clsx";
import type { SearchResult, SearchMatch } from "../../../types/editor";

// =============================================================================
// ICONS
// =============================================================================

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function IconFile({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

// =============================================================================
// MATCH PREVIEW COMPONENT
// =============================================================================

interface MatchPreviewProps {
  match: SearchMatch;
  searchPattern: string;
  onClick: () => void;
}

function MatchPreview({ match, searchPattern, onClick }: MatchPreviewProps) {
  // Highlight the match in the content
  const highlightMatch = (content: string, pattern: string) => {
    if (!pattern) return content;

    try {
      const regex = new RegExp(`(${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      const parts = content.split(regex);

      return parts.map((part, index) => {
        if (regex.test(part)) {
          return (
            <span key={index} className="bg-[var(--accent-primary)]/30 text-[var(--accent-primary)] rounded px-0.5">
              {part}
            </span>
          );
        }
        return part;
      });
    } catch {
      return content;
    }
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-hover)] transition-colors group"
    >
      <div className="flex items-start gap-2">
        <span className="text-[var(--text-tertiary)] text-xs font-mono flex-shrink-0 w-8 text-right">
          {match.line}
        </span>
        <span className="text-xs text-[var(--text-secondary)] font-mono truncate flex-1">
          {highlightMatch(match.content.trim(), searchPattern)}
        </span>
      </div>
    </button>
  );
}

// =============================================================================
// FILE RESULT COMPONENT
// =============================================================================

interface FileResultProps {
  result: SearchResult;
  searchPattern: string;
  onSelectMatch: (path: string, line: number, column: number) => void;
}

function FileResult({ result, searchPattern, onSelectMatch }: FileResultProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const fileName = result.path.split("/").pop() || result.path;
  const dirPath = result.path.substring(0, result.path.lastIndexOf("/"));

  return (
    <div className="border-b border-[var(--border-subtle)] last:border-b-0">
      {/* File Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors"
      >
        <IconChevronRight
          className={clsx("w-3 h-3 text-[var(--text-tertiary)] transition-transform", isExpanded && "rotate-90")}
        />
        <IconFile className="w-4 h-4 text-[var(--accent-primary)] flex-shrink-0" />
        <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
          <span className="text-sm text-[var(--text-primary)] font-medium truncate">{fileName}</span>
          {dirPath && <span className="text-xs text-[var(--text-tertiary)] truncate">{dirPath}</span>}
        </div>
        <span className="text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded flex-shrink-0">
          {result.matches.length}
        </span>
      </button>

      {/* Matches */}
      {isExpanded && (
        <div className="pl-5 border-l-2 border-[var(--border-subtle)] ml-4 mb-2">
          {result.matches.map((match, index) => (
            <MatchPreview
              key={`${match.line}-${match.column}-${index}`}
              match={match}
              searchPattern={searchPattern}
              onClick={() => onSelectMatch(result.path, match.line, match.column)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SEARCH RESULTS COMPONENT
// =============================================================================

interface SearchResultsProps {
  results: SearchResult[];
  searchPattern: string;
  onSelect: (path: string, line: number, column: number) => void;
}

export function SearchResults({ results, searchPattern, onSelect }: SearchResultsProps) {
  if (results.length === 0) {
    return null;
  }

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Summary */}
      <div className="px-3 py-2 text-xs text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--bg-secondary)]">
        {totalMatches} {totalMatches === 1 ? "result" : "results"} in {results.length}{" "}
        {results.length === 1 ? "file" : "files"}
      </div>

      {/* Results */}
      <div>
        {results.map((result) => (
          <FileResult
            key={result.path}
            result={result}
            searchPattern={searchPattern}
            onSelectMatch={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
