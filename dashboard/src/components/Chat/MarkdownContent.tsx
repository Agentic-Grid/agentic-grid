import { useState, memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx } from "clsx";
import type { Components } from "react-markdown";

interface MarkdownContentProps {
  content: string;
}

// Collapsible thinking block component
function ThinkingBlock({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-3 rounded-lg border border-[var(--border-subtle)] overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={clsx(
          "w-full flex items-center gap-2 px-3 py-2 text-left",
          "bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors",
          "text-xs font-medium text-[var(--text-tertiary)]",
        )}
      >
        <svg
          className={clsx(
            "w-3 h-3 transition-transform",
            isExpanded && "rotate-90",
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        <span className="text-[var(--accent-purple)]">💭</span>
        <span>Thinking</span>
        {!isExpanded && (
          <span className="ml-auto text-[var(--text-quaternary)]">
            {content.length > 100 ? `${content.slice(0, 50).trim()}...` : ""}
          </span>
        )}
      </button>
      {isExpanded && (
        <div className="p-3 text-xs text-[var(--text-secondary)] whitespace-pre-wrap bg-[var(--bg-primary)] max-h-60 overflow-y-auto">
          {content.trim()}
        </div>
      )}
    </div>
  );
}

// Parse content to extract thinking blocks
function parseThinkingBlocks(
  content: string,
): Array<{ type: "text" | "thinking"; content: string }> {
  const parts: Array<{ type: "text" | "thinking"; content: string }> = [];
  const thinkingRegex = /<thinking>([\s\S]*?)<\/thinking>/gi;

  let lastIndex = 0;
  let match;

  while ((match = thinkingRegex.exec(content)) !== null) {
    // Add text before the thinking block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push({ type: "text", content: textBefore });
      }
    }

    // Add the thinking block
    parts.push({ type: "thinking", content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last thinking block
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining.trim()) {
      parts.push({ type: "text", content: remaining });
    }
  }

  // If no thinking blocks found, return original content
  if (parts.length === 0) {
    parts.push({ type: "text", content });
  }

  return parts;
}

// Custom components for rendering markdown elements
const components: Components = {
  // Headings
  h1: ({ children }) => (
    <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0 text-[var(--text-primary)]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0 text-[var(--text-primary)]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0 text-[var(--text-primary)]">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold mb-1 mt-2 first:mt-0 text-[var(--text-primary)]">
      {children}
    </h4>
  ),

  // Paragraphs
  p: ({ children }) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="list-disc list-inside mb-3 space-y-1 pl-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-3 space-y-1 pl-2">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[var(--text-secondary)]">{children}</li>
  ),

  // Code blocks
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || "");
    const isInline = !match && !className;

    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--accent-cyan)] font-mono text-sm"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <code
        className={`block overflow-x-auto p-4 rounded-lg bg-[var(--bg-tertiary)] font-mono text-sm text-[var(--text-secondary)] ${className || ""}`}
        {...props}
      >
        {children}
      </code>
    );
  },

  // Pre for code blocks
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
      {children}
    </pre>
  ),

  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-[var(--accent-primary)] pl-4 my-3 italic text-[var(--text-tertiary)]">
      {children}
    </blockquote>
  ),

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--accent-cyan)] hover:underline"
    >
      {children}
    </a>
  ),

  // Emphasis
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--text-primary)]">
      {children}
    </strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,

  // Horizontal rule
  hr: () => <hr className="my-4 border-[var(--border-subtle)]" />,

  // Tables
  table: ({ children }) => (
    <div className="overflow-x-auto mb-3">
      <table className="min-w-full border border-[var(--border-subtle)] rounded-lg overflow-hidden">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[var(--bg-tertiary)]">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-[var(--border-subtle)] last:border-b-0">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--text-primary)]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 text-sm text-[var(--text-secondary)]">
      {children}
    </td>
  ),

  // Images
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt || ""}
      className="max-w-full h-auto rounded-lg my-2"
    />
  ),

  // Task lists (GFM)
  input: ({ checked, ...props }) => (
    <input
      type="checkbox"
      checked={checked}
      readOnly
      className="mr-2 rounded"
      {...props}
    />
  ),
};

export const MarkdownContent = memo(function MarkdownContent({
  content,
}: MarkdownContentProps) {
  // Memoize parsing to avoid re-parsing on every render
  const parts = useMemo(() => parseThinkingBlocks(content), [content]);

  return (
    <div className="markdown-content text-sm text-[var(--text-secondary)]">
      {parts.map((part, index) =>
        part.type === "thinking" ? (
          <ThinkingBlock key={index} content={part.content} />
        ) : (
          <ReactMarkdown
            key={index}
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {part.content}
          </ReactMarkdown>
        ),
      )}
    </div>
  );
});
