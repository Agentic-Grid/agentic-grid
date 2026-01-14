import { clsx } from "clsx";

interface PlanGenerationProgressProps {
  progress: number;
  currentStep: string;
}

const GENERATION_STEPS = [
  { id: "fork", label: "Forking base-project repository" },
  { id: "structure", label: "Creating project structure" },
  { id: "prd", label: "Generating PRD from requirements" },
  { id: "features", label: "Breaking down into features" },
  { id: "tasks", label: "Creating task definitions" },
  { id: "deps", label: "Calculating dependencies" },
];

function StepIndicator({
  step,
  status,
}: {
  step: { id: string; label: string };
  status: "pending" | "in-progress" | "complete";
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={clsx(
          "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
          status === "complete" && "bg-[var(--accent-emerald)]",
          status === "in-progress" &&
            "bg-[var(--accent-primary)] animate-pulse",
          status === "pending" &&
            "bg-[var(--bg-hover)] border border-[var(--border-subtle)]",
        )}
      >
        {status === "complete" ? (
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : status === "in-progress" ? (
          <svg
            className="w-3.5 h-3.5 text-white animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
        )}
      </div>
      <span
        className={clsx(
          "text-sm transition-colors",
          status === "complete" && "text-[var(--accent-emerald)]",
          status === "in-progress" && "text-[var(--text-primary)] font-medium",
          status === "pending" && "text-[var(--text-muted)]",
        )}
      >
        {step.label}
      </span>
    </div>
  );
}

export function PlanGenerationProgress({
  progress,
  currentStep,
}: PlanGenerationProgressProps) {
  const currentStepIndex = GENERATION_STEPS.findIndex(
    (s) => s.label === currentStep,
  );

  return (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center">
      {/* Spinner */}
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-full border-4 border-[var(--bg-hover)]">
          <div
            className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-[var(--accent-primary)] animate-spin"
            style={{ animationDuration: "1s" }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-[var(--accent-primary)]">
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        Generating Your Project Plan
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-8">
        This may take a moment...
      </p>

      {/* Progress bar */}
      <div className="w-[300px] h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden mb-8">
        <div
          className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step list */}
      <div className="space-y-3 text-left">
        {GENERATION_STEPS.map((step, index) => {
          let status: "pending" | "in-progress" | "complete" = "pending";
          if (index < currentStepIndex) {
            status = "complete";
          } else if (index === currentStepIndex) {
            status = "in-progress";
          }
          return <StepIndicator key={step.id} step={step} status={status} />;
        })}
      </div>

      {/* Current status */}
      <p className="mt-8 text-xs font-mono text-[var(--text-muted)]">
        {currentStep}...
      </p>
    </div>
  );
}
