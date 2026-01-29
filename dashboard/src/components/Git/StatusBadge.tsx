/**
 * StatusBadge Component
 * Displays a colored badge indicating git file status (M/A/D/R/C/U)
 */

import type { FileStatus } from "../../types";

interface StatusBadgeProps {
  status: FileStatus;
}

const statusConfig: Record<
  FileStatus,
  { label: string; color: string; title: string }
> = {
  M: { label: "M", color: "text-amber-400", title: "Modified" },
  A: { label: "A", color: "text-emerald-400", title: "Added" },
  D: { label: "D", color: "text-rose-400", title: "Deleted" },
  R: { label: "R", color: "text-sky-400", title: "Renamed" },
  C: { label: "C", color: "text-sky-400", title: "Copied" },
  U: { label: "U", color: "text-orange-400", title: "Unmerged" },
  "?": { label: "?", color: "text-gray-400", title: "Untracked" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig["M"];

  return (
    <span
      className={`font-mono text-xs font-bold ${config.color} min-w-[14px] text-center`}
      title={config.title}
    >
      {config.label}
    </span>
  );
}
