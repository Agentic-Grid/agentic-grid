import { useState, useRef, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { CommandPicker } from "./CommandPicker";
import type { SlashCommand } from "../../types";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  commands?: SlashCommand[];
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  commands = [],
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [showCommandPicker, setShowCommandPicker] = useState(false);
  const [commandFilter, setCommandFilter] = useState("");
  const [selectedCommand, setSelectedCommand] = useState<SlashCommand | null>(
    null,
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  // Detect slash command input
  useEffect(() => {
    if (value.startsWith("/") && !selectedCommand) {
      const filter = value.slice(1).split(" ")[0];
      setCommandFilter(filter);
      setShowCommandPicker(true);
    } else if (!value.startsWith("/")) {
      setShowCommandPicker(false);
      setCommandFilter("");
    }
  }, [value, selectedCommand]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue("");
      setSelectedCommand(null);
      setShowCommandPicker(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Let CommandPicker handle navigation keys when visible
    if (showCommandPicker && ["ArrowUp", "ArrowDown", "Tab"].includes(e.key)) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }

    // Clear selected command on backspace if at the beginning of args
    if (e.key === "Backspace" && selectedCommand) {
      const commandPrefix = `/${selectedCommand.name} `;
      if (value === commandPrefix || value === `/${selectedCommand.name}`) {
        e.preventDefault();
        setValue("");
        setSelectedCommand(null);
      }
    }

    // Escape to cancel command
    if (e.key === "Escape" && (showCommandPicker || selectedCommand)) {
      e.preventDefault();
      setShowCommandPicker(false);
      if (selectedCommand) {
        setValue("");
        setSelectedCommand(null);
      }
    }
  };

  const handleCommandSelect = useCallback(
    (command: SlashCommand) => {
      setShowCommandPicker(false);
      setSelectedCommand(command);

      if (command.hasArguments) {
        // Set the command with a space for arguments
        setValue(`/${command.name} `);
        textareaRef.current?.focus();
      } else {
        // Send immediately for commands without arguments
        onSend(`/${command.name}`);
        setValue("");
        setSelectedCommand(null);
      }
    },
    [onSend],
  );

  const handleCloseCommandPicker = useCallback(() => {
    setShowCommandPicker(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    // If we have a selected command, prevent removing the command prefix
    if (selectedCommand) {
      if (!newValue.startsWith(`/${selectedCommand.name}`)) {
        // User is trying to delete the command, allow it
        setValue("");
        setSelectedCommand(null);
        return;
      }
    }

    setValue(newValue);
  };

  // Get arguments part for display
  const getArgumentsValue = () => {
    if (!selectedCommand) return "";
    const prefix = `/${selectedCommand.name} `;
    return value.startsWith(prefix) ? value.slice(prefix.length) : "";
  };

  return (
    <div className="relative">
      <CommandPicker
        commands={commands}
        filter={commandFilter}
        onSelect={handleCommandSelect}
        onClose={handleCloseCommandPicker}
        visible={showCommandPicker}
      />

      {/* Premium chat input wrapper with rotating glow effect on focus */}
      <div className="chat-input-wrapper">
        <div className="glass-elevated border border-[var(--border-subtle)] rounded-2xl p-3 flex gap-3 items-end focus-within:border-[rgba(100,180,255,0.7)] focus-within:shadow-[0_0_8px_rgba(100,180,255,0.5)] transition-all duration-200">
          {/* Command badge */}
          {selectedCommand && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/30">
              <span className="font-mono text-sm text-[var(--accent-cyan)] font-medium">
                /{selectedCommand.name}
              </span>
              <button
                onClick={() => {
                  setValue("");
                  setSelectedCommand(null);
                }}
                className="ml-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:scale-110 transition-all"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={selectedCommand ? getArgumentsValue() : value}
            onChange={(e) => {
              if (selectedCommand) {
                setValue(`/${selectedCommand.name} ${e.target.value}`);
              } else {
                handleChange(e);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedCommand
                ? selectedCommand.hasArguments
                  ? "Enter arguments..."
                  : placeholder
                : placeholder
            }
            disabled={disabled}
            rows={1}
            className={clsx(
              "flex-1 bg-transparent resize-none outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] min-h-[40px] max-h-[200px] py-2 px-2",
              selectedCommand && "pl-0",
            )}
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className="btn btn-primary px-5 py-2.5 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:shadow-[0_0_25px_var(--accent-primary-glow)] hover:scale-105"
          >
            <span>Send</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Hint for slash commands */}
      {!value && !showCommandPicker && commands.length > 0 && (
        <div className="absolute -top-6 left-3 text-[10px] text-[var(--text-muted)]">
          Type <span className="font-mono text-[var(--accent-cyan)]">/</span> to
          see available commands
        </div>
      )}
    </div>
  );
}
