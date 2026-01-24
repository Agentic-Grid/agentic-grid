import { useEffect, useState, useRef, useCallback } from "react";
import { clsx } from "clsx";
import {
  getOnboardingProgress,
  type OnboardingProgress,
} from "../../services/api";

interface PlanGenerationProgressProps {
  progress: number;
  currentStep: string;
  sessionId: string | null;
  projectName: string;
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

function OnboardingProgressPanel({
  sessionId,
  projectName,
  onProgressUpdate,
}: {
  sessionId: string;
  projectName: string;
  onProgressUpdate: (progress: OnboardingProgress) => void;
}) {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Poll for progress every 3 seconds
  useEffect(() => {
    let isMounted = true;

    const fetchProgress = async () => {
      try {
        const result = await getOnboardingProgress(projectName, sessionId);
        if (isMounted && result.data) {
          setProgress(result.data);
          setError(null);
          onProgressUpdate(result.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch progress",
          );
        }
      }
    };

    // Initial fetch
    fetchProgress();

    // Poll every 3 seconds
    const interval = setInterval(fetchProgress, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, projectName, onProgressUpdate]);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [progress?.logs]);

  // Parse log line to extract meaningful content
  const parseLogLine = (line: string) => {
    // Remove [OUT] or [ERR] prefix and timestamp
    const cleanLine = line.replace(/^\[(?:OUT|ERR)\]\s*/, "").trim();
    // Skip empty lines or just timestamps
    if (!cleanLine || cleanLine.match(/^\[\d{4}-\d{2}-\d{2}/)) return null;
    return cleanLine;
  };

  return (
    <div className="w-full max-w-[600px] mt-6 space-y-4">
      {/* Features/Tasks Counter */}
      {progress && (progress.featuresCount > 0 || progress.tasksCount > 0) && (
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--accent-primary)]">
              {progress.featuresCount}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Features</div>
          </div>
          <div className="w-px h-8 bg-[var(--border-subtle)]" />
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--accent-emerald)]">
              {progress.tasksCount}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Tasks</div>
          </div>
        </div>
      )}

      {/* Features List */}
      {progress && progress.features.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-3">
          <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">
            Features Created
          </div>
          <div className="space-y-1 max-h-[100px] overflow-y-auto">
            {progress.features.map((feature) => (
              <div
                key={feature.id}
                className="flex items-center gap-2 text-xs"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-emerald)]" />
                <span className="text-[var(--text-primary)]">
                  {feature.title}
                </span>
                <span className="text-[var(--text-muted)]">({feature.id})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Status */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={clsx(
            "w-2 h-2 rounded-full",
            progress?.sessionRunning
              ? "bg-[var(--accent-emerald)] animate-pulse"
              : "bg-[var(--text-muted)]",
          )}
        />
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          {progress?.sessionRunning
            ? "Claude Session Active"
            : "Waiting for session..."}
        </span>
      </div>

      {/* Session Logs */}
      <div
        ref={scrollRef}
        className="bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-3 max-h-[150px] overflow-y-auto font-mono text-xs"
      >
        {error ? (
          <div className="text-[var(--text-muted)] text-center py-4">
            {error}
          </div>
        ) : !progress?.logs?.length ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            <span className="text-[var(--text-muted)]">
              Waiting for session output...
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            {progress.logs
              .map((line, i) => ({ line: parseLogLine(line), index: i }))
              .filter((item) => item.line)
              .slice(-20)
              .map((item) => (
                <div
                  key={item.index}
                  className="text-[var(--text-secondary)] leading-relaxed break-words"
                >
                  {item.line}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function PlanGenerationProgress({
  progress: initialProgress,
  currentStep: initialStep,
  sessionId,
  projectName,
}: PlanGenerationProgressProps) {
  const [realProgress, setRealProgress] = useState(initialProgress);
  const [currentStep, setCurrentStep] = useState(initialStep);

  // Handle progress updates from the onboarding panel
  const handleProgressUpdate = useCallback(
    (progressData: OnboardingProgress) => {
      // Calculate real progress based on features/tasks created
      const featuresWeight = 40; // Features creation is 40% of progress
      const tasksWeight = 50; // Tasks creation is 50% of progress
      const baseProgress = 10; // Starting progress

      let calculatedProgress = baseProgress;

      // If we have features, add feature progress
      if (progressData.featuresCount > 0) {
        // Assume ~5 features is a complete project
        const featureProgress = Math.min(
          progressData.featuresCount / 5,
          1,
        ) * featuresWeight;
        calculatedProgress += featureProgress;

        // Update step based on progress
        if (progressData.featuresCount >= 1) {
          setCurrentStep("Breaking down into features");
        }
      }

      // If we have tasks, add task progress
      if (progressData.tasksCount > 0) {
        // Assume ~15 tasks is a complete project
        const taskProgress = Math.min(
          progressData.tasksCount / 15,
          1,
        ) * tasksWeight;
        calculatedProgress += taskProgress;

        // Update step based on progress
        if (progressData.tasksCount >= 1) {
          setCurrentStep("Creating task definitions");
        }
        if (progressData.tasksCount >= 5) {
          setCurrentStep("Calculating dependencies");
        }
      }

      // Session running but no features yet
      if (progressData.sessionRunning && progressData.featuresCount === 0) {
        setCurrentStep("Analyzing requirements");
        calculatedProgress = Math.max(calculatedProgress, 15);
      }

      // If logs show specific activity, update step
      if (progressData.logs?.length > 0) {
        const lastLogs = progressData.logs.slice(-5).join(" ").toLowerCase();
        if (lastLogs.includes("prd") || lastLogs.includes("requirement")) {
          setCurrentStep("Generating PRD from requirements");
        } else if (
          lastLogs.includes("feature") ||
          lastLogs.includes("spec")
        ) {
          setCurrentStep("Breaking down into features");
        } else if (lastLogs.includes("task")) {
          setCurrentStep("Creating task definitions");
        }
      }

      setRealProgress(Math.min(calculatedProgress, 95));
    },
    [],
  );

  // Sync with parent progress if it increases
  useEffect(() => {
    if (initialProgress > realProgress) {
      setRealProgress(initialProgress);
    }
  }, [initialProgress, realProgress]);

  useEffect(() => {
    if (initialStep !== currentStep && initialStep) {
      // Parent might have more accurate step info
    }
  }, [initialStep, currentStep]);

  const currentStepIndex = GENERATION_STEPS.findIndex(
    (s) => s.label === currentStep,
  );

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      {/* Spinner */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full border-4 border-[var(--bg-hover)]">
          <div
            className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-[var(--accent-primary)] animate-spin"
            style={{ animationDuration: "1s" }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-[var(--accent-primary)]">
            {Math.round(realProgress)}%
          </span>
        </div>
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        Generating Your Project Plan
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Claude is analyzing your requirements and creating features...
      </p>

      {/* Progress bar */}
      <div className="w-[300px] h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-[var(--accent-primary)] rounded-full transition-all duration-500"
          style={{ width: `${realProgress}%` }}
        />
      </div>

      {/* Step list */}
      <div className="space-y-3 text-left mb-4">
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
      <p className="text-xs font-mono text-[var(--text-muted)] mb-2">
        {currentStep}...
      </p>

      {/* Onboarding Progress Panel */}
      {sessionId && (
        <OnboardingProgressPanel
          sessionId={sessionId}
          projectName={projectName}
          onProgressUpdate={handleProgressUpdate}
        />
      )}
    </div>
  );
}
