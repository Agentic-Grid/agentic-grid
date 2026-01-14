import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import type { SlashCommand } from "../../types";

interface CommandPickerProps {
  commands: SlashCommand[];
  filter: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  visible: boolean;
}

export function CommandPicker({
  commands,
  filter,
  onSelect,
  onClose,
  visible,
}: CommandPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter commands based on input
  const filteredCommands = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(filter.toLowerCase()),
  );

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Scroll selected item into view
  useEffect(() => {
    if (containerRef.current && filteredCommands.length > 0) {
      const selectedElement = containerRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex, filteredCommands.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredCommands.length - 1),
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, selectedIndex, filteredCommands, onSelect, onClose]);

  if (!visible || filteredCommands.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-xl z-50"
    >
      <div className="py-1">
        {filteredCommands.map((command, index) => (
          <button
            key={`${command.source}-${command.name}`}
            onClick={() => onSelect(command)}
            className={clsx(
              "w-full px-3 py-2 text-left flex items-center gap-3 transition-colors",
              index === selectedIndex
                ? "bg-[var(--accent-primary)]/10 text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]",
            )}
          >
            <span className="font-mono text-sm font-medium text-[var(--accent-cyan)]">
              /{command.name}
            </span>
            <span className="text-xs text-[var(--text-tertiary)] truncate flex-1">
              {command.description}
            </span>
            {command.hasArguments && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]">
                + args
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
