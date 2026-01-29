/**
 * SearchPanel Component
 * Collapsible search panel with search input, options, and results
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { clsx } from "clsx";
import { searchFiles } from "../../../services/files";
import type { SearchResult } from "../../../types/editor";
import { SearchResults } from "./SearchResults";

// =============================================================================
// ICONS
// =============================================================================

function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconLoader({ className }: { className?: string }) {
  return (
    <svg className={clsx(className, "animate-spin")} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState({ hasSearched }: { hasSearched: boolean }) {
  if (!hasSearched) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
        <IconSearch className="w-12 h-12 text-[var(--text-tertiary)] opacity-30 mb-4" />
        <p className="text-sm text-[var(--text-tertiary)]">Search in files</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1 opacity-70">
          Type to search across all project files
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
      <IconSearch className="w-12 h-12 text-[var(--text-tertiary)] opacity-30 mb-4" />
      <p className="text-sm text-[var(--text-tertiary)]">No results found</p>
      <p className="text-xs text-[var(--text-tertiary)] mt-1 opacity-70">
        Try adjusting your search or filters
      </p>
    </div>
  );
}

// =============================================================================
// TOGGLE BUTTON
// =============================================================================

interface ToggleButtonProps {
  label: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
}

function ToggleButton({ label, title, isActive, onClick }: ToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={clsx(
        "px-2 py-0.5 text-xs rounded font-medium transition-colors",
        isActive
          ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30"
          : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
      )}
    >
      {label}
    </button>
  );
}

// =============================================================================
// SEARCH PANEL COMPONENT
// =============================================================================

interface SearchPanelProps {
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToResult: (path: string, line: number, column: number) => void;
}

export function SearchPanel({ projectName, isOpen, onClose, onNavigateToResult }: SearchPanelProps) {
  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Options state
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Build pattern based on options
        let pattern = searchQuery;
        if (wholeWord && !useRegex) {
          pattern = `\\b${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`;
        }

        const response = await searchFiles(projectName, pattern, {
          regex: useRegex || wholeWord,
          caseSensitive,
          maxResults: 100,
        });

        setResults(response.results);
        setHasSearched(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Search failed";
        setError(message);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [projectName, caseSensitive, wholeWord, useRegex]
  );

  // Handle query change with debounce
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);

      // Clear previous timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce search
      debounceRef.current = setTimeout(() => {
        performSearch(value);
      }, 300);
    },
    [performSearch]
  );

  // Handle Enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // Clear debounce and search immediately
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        performSearch(query);
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [query, performSearch, onClose]
  );

  // Re-search when options change
  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    }
  }, [caseSensitive, wholeWord, useRegex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-80 border-r border-[var(--border-subtle)] glass-subtle flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between bg-gradient-to-r from-[var(--accent-primary)]/5 via-transparent to-transparent">
        <div className="flex items-center gap-2">
          <IconSearch className="w-4 h-4 text-[var(--accent-primary)] flex-shrink-0" />
          <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Search
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          title="Close (Escape)"
        >
          <IconClose className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-[var(--border-subtle)]">
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search in files..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]/30 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
          />
          {isLoading && (
            <IconLoader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--accent-primary)]" />
          )}
        </div>

        {/* Options */}
        <div className="flex items-center gap-2 mt-2">
          <ToggleButton
            label="Aa"
            title="Match Case"
            isActive={caseSensitive}
            onClick={() => setCaseSensitive((prev) => !prev)}
          />
          <ToggleButton
            label="Ab"
            title="Match Whole Word"
            isActive={wholeWord}
            onClick={() => setWholeWord((prev) => !prev)}
          />
          <ToggleButton
            label=".*"
            title="Use Regular Expression"
            isActive={useRegex}
            onClick={() => setUseRegex((prev) => !prev)}
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="px-3 py-2 bg-[var(--accent-rose)]/10 border-b border-[var(--accent-rose)]/20">
          <p className="text-xs text-[var(--accent-rose)]">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 ? (
        <SearchResults results={results} searchPattern={query} onSelect={onNavigateToResult} />
      ) : (
        <EmptyState hasSearched={hasSearched && !isLoading} />
      )}
    </div>
  );
}
