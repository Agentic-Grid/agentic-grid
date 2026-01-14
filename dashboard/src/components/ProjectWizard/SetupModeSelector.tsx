import { clsx } from "clsx";
import type { SetupMode } from "../../types/wizard";

interface SetupModeSelectorProps {
  value: SetupMode;
  onChange: (mode: SetupMode) => void;
}

interface ModeOption {
  id: SetupMode;
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  recommended?: boolean;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    id: "quick",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    iconColor: "var(--accent-amber)",
    title: "Quick Start",
    description: "Minimal setup, start coding immediately",
  },
  {
    id: "guided",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
    iconColor: "var(--accent-cyan)",
    title: "Guided Setup",
    description: "AI interviews you to understand requirements",
    recommended: true,
  },
  {
    id: "template",
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    ),
    iconColor: "var(--accent-violet)",
    title: "From Template",
    description: "Start from a pre-built project template",
  },
];

export function SetupModeSelector({ value, onChange }: SetupModeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-4 w-full max-w-[600px]">
      {MODE_OPTIONS.map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={clsx(
            "relative flex flex-col items-center text-center p-5 min-h-[140px] rounded-[var(--radius-lg)] border transition-all",
            value === option.id
              ? "bg-[rgba(99,102,241,0.1)] border-[var(--accent-primary)] shadow-[0_0_0_2px_var(--accent-primary-glow)]"
              : "bg-[var(--bg-tertiary)] border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-default)] hover:-translate-y-0.5",
          )}
        >
          {option.recommended && (
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-[var(--accent-cyan)] text-black">
              Recommended
            </span>
          )}
          <div className="mb-3" style={{ color: option.iconColor }}>
            {option.icon}
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
            {option.title}
          </h3>
          <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
            {option.description}
          </p>
        </button>
      ))}
    </div>
  );
}
