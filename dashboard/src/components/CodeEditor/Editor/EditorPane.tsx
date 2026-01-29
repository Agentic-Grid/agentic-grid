/**
 * EditorPane Component
 * Monaco Editor wrapper with lazy loading + image preview
 */

import { lazy, Suspense, useRef, useEffect } from "react";
import type { editor } from "monaco-editor";

// Lazy load Monaco Editor
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

// Image file detection
const IMAGE_EXTENSIONS: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function getImageMimeType(filePath: string): string | null {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  return IMAGE_EXTENSIONS[ext] || null;
}

// Type for Monaco editor instance
type MonacoEditorInstance = editor.IStandaloneCodeEditor;

// =============================================================================
// LOADING STATE
// =============================================================================

function EditorLoading() {
  return (
    <div className="flex items-center justify-center h-full bg-[var(--bg-secondary)]">
      <div className="text-center">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
        />
        <p className="text-sm text-[var(--text-tertiary)]">Loading editor...</p>
      </div>
    </div>
  );
}

// =============================================================================
// EMPTY STATE
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-[var(--bg-secondary)]">
      <svg
        className="w-16 h-16 text-[var(--text-tertiary)] opacity-30 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
      <p className="text-sm text-[var(--text-tertiary)]">Select a file to view</p>
      <p className="text-xs text-[var(--text-tertiary)] mt-1 opacity-70">
        Double-click a file in the explorer to open it
      </p>
    </div>
  );
}

// =============================================================================
// EDITOR PANE COMPONENT
// =============================================================================

interface EditorPaneProps {
  content: string | null;
  language: string;
  filePath?: string;
  encoding?: 'utf-8' | 'base64';
  isReadOnly?: boolean;
  onChange?: (value: string | undefined) => void;
  onCursorChange?: (position: { line: number; column: number }) => void;
  initialPosition?: { line: number; column: number };
}

export function EditorPane({
  content,
  language,
  filePath,
  encoding,
  isReadOnly = false,
  onChange,
  onCursorChange,
  initialPosition,
}: EditorPaneProps) {
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const initialPositionRef = useRef(initialPosition);

  // Update initialPositionRef when it changes
  useEffect(() => {
    initialPositionRef.current = initialPosition;
  }, [initialPosition]);

  // Navigate to position when initialPosition changes and editor is mounted
  useEffect(() => {
    if (editorRef.current && initialPosition) {
      const { line, column } = initialPosition;
      editorRef.current.setPosition({ lineNumber: line, column });
      editorRef.current.revealLineInCenter(line);
      editorRef.current.focus();
    }
  }, [initialPosition]);

  const handleEditorMount = (editor: MonacoEditorInstance) => {
    editorRef.current = editor;

    // Set up cursor position tracking
    if (onCursorChange) {
      editor.onDidChangeCursorPosition((e) => {
        onCursorChange({
          line: e.position.lineNumber,
          column: e.position.column,
        });
      });

      // Report initial position
      const position = editor.getPosition();
      if (position) {
        onCursorChange({
          line: position.lineNumber,
          column: position.column,
        });
      }
    }

    // Navigate to initial position if provided
    if (initialPositionRef.current) {
      const { line, column } = initialPositionRef.current;
      editor.setPosition({ lineNumber: line, column });
      editor.revealLineInCenter(line);
    }
  };

  if (content === null) {
    return <EmptyState />;
  }

  // Image preview for binary image files
  const mimeType = filePath ? getImageMimeType(filePath) : null;
  if (mimeType && encoding === 'base64') {
    const src = mimeType === 'image/svg+xml'
      ? `data:${mimeType};base64,${content}`
      : `data:${mimeType};base64,${content}`;

    return (
      <div className="flex flex-col items-center justify-center h-full bg-[var(--bg-secondary)] overflow-auto p-8">
        <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden shadow-lg bg-[var(--bg-tertiary)] p-2">
          <img
            src={src}
            alt={filePath}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
        <p className="mt-4 text-xs text-[var(--text-tertiary)]">
          {filePath?.split('/').pop()} — Image preview
        </p>
      </div>
    );
  }

  return (
    <Suspense fallback={<EditorLoading />}>
      <MonacoEditor
        height="100%"
        language={language}
        value={content}
        onChange={onChange}
        onMount={handleEditorMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
          lineNumbers: "on",
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 2,
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          readOnly: isReadOnly,
          padding: { top: 16, bottom: 16 },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
        }}
      />
    </Suspense>
  );
}
