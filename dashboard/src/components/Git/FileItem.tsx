/**
 * FileItem Component
 * Displays a single file in the changes list with checkbox and status badge
 */

import type { FileChange } from "../../types";
import { StatusBadge } from "./StatusBadge";

interface FileItemProps {
  file: FileChange;
  selected: boolean;
  staged: boolean;
  onSelect: () => void;
  onToggleStage: () => void;
}

export function FileItem({
  file,
  selected,
  staged,
  onSelect,
  onToggleStage,
}: FileItemProps) {
  // Get just the filename for display, full path on hover
  const fileName = file.path.split("/").pop() || file.path;
  const dirPath = file.path.includes("/")
    ? file.path.substring(0, file.path.lastIndexOf("/"))
    : "";

  return (
    <div
      className={`
        flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer
        hover:bg-white/5 transition-colors
        ${selected ? "bg-white/10" : ""}
      `}
      onClick={onSelect}
    >
      <input
        type="checkbox"
        checked={staged}
        onChange={(e) => {
          e.stopPropagation();
          onToggleStage();
        }}
        className="accent-primary-500 w-3.5 h-3.5 cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      />
      <StatusBadge status={file.status} />
      <div className="flex-1 min-w-0" title={file.path}>
        <span className="text-sm text-text-primary truncate block">
          {fileName}
        </span>
        {dirPath && (
          <span className="text-xs text-text-muted truncate block">
            {dirPath}
          </span>
        )}
      </div>
    </div>
  );
}
