/**
 * FileTree Component
 * Recursive tree rendering for the file explorer
 */

import type { FileNode as FileNodeType } from "../../../types/editor";
import { FileNode } from "./FileNode";

// =============================================================================
// FILE TREE COMPONENT
// =============================================================================

interface FileTreeProps {
  nodes: FileNodeType[];
  depth?: number;
  expandedPaths: Set<string>;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onOpen: (node: FileNodeType) => void;
  onContextMenu?: (e: React.MouseEvent, node: FileNodeType) => void;
}

export function FileTree({
  nodes,
  depth = 0,
  expandedPaths,
  selectedPath,
  onSelect,
  onToggle,
  onOpen,
  onContextMenu,
}: FileTreeProps) {
  return (
    <div className="select-none">
      {nodes.map((node) => (
        <div key={node.path}>
          <FileNode
            node={node}
            depth={depth}
            isExpanded={expandedPaths.has(node.path)}
            isSelected={selectedPath === node.path}
            onSelect={onSelect}
            onToggle={onToggle}
            onOpen={onOpen}
            onContextMenu={onContextMenu}
          />
          {node.type === "directory" && node.children && expandedPaths.has(node.path) && (
            <FileTree
              nodes={node.children}
              depth={depth + 1}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onToggle={onToggle}
              onOpen={onOpen}
              onContextMenu={onContextMenu}
            />
          )}
        </div>
      ))}
    </div>
  );
}
