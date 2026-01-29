/**
 * DiffLine Component
 * Displays a single line in a diff with appropriate coloring
 */

import type { DiffLine as DiffLineType } from "../../types";

interface DiffLineProps {
  line: DiffLineType;
}

export function DiffLine({ line }: DiffLineProps) {
  const bgColor = {
    context: "",
    addition: "bg-emerald-500/10",
    deletion: "bg-rose-500/10",
  }[line.type];

  const textColor = {
    context: "text-text-secondary",
    addition: "text-emerald-400",
    deletion: "text-rose-400",
  }[line.type];

  const prefix = {
    context: " ",
    addition: "+",
    deletion: "-",
  }[line.type];

  return (
    <div className={`flex font-mono text-xs leading-5 ${bgColor}`}>
      {/* Old line number */}
      <span className="w-10 text-right pr-2 text-text-muted select-none border-r border-white/5 flex-shrink-0">
        {line.type !== "addition" ? line.oldLineNumber : ""}
      </span>
      {/* New line number */}
      <span className="w-10 text-right pr-2 text-text-muted select-none border-r border-white/10 flex-shrink-0">
        {line.type !== "deletion" ? line.newLineNumber : ""}
      </span>
      {/* Content */}
      <span className={`px-2 whitespace-pre flex-1 ${textColor}`}>
        {prefix}
        {line.content}
      </span>
    </div>
  );
}
