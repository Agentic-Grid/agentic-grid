import { useEffect, useState, useCallback } from "react";
import { clsx } from "clsx";
import {
  useProjectWizard,
  type NameValidation,
} from "../../hooks/useProjectWizard";
import { SetupModeSelector } from "./SetupModeSelector";
import { OnboardingQuestionsForm } from "./OnboardingQuestionsForm";
import { PlanGenerationProgress } from "./PlanGenerationProgress";
import { PlanApprovalView } from "./PlanApprovalView";
import type { WizardStep } from "../../types/wizard";

interface NewProjectWizardProps {
  onClose: () => void;
  onCreated: () => void;
}

interface StepConfig {
  id: WizardStep;
  number: number;
  label: string;
}

const STEPS: StepConfig[] = [
  { id: "basics", number: 1, label: "Name" },
  { id: "discovery", number: 2, label: "Discovery" },
  { id: "generating", number: 3, label: "Generate" },
  { id: "approval", number: 4, label: "Approve" },
];

function WizardProgress({ currentStep }: { currentStep: WizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center justify-center gap-0 py-4 px-6">
      {STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isActive = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center">
              <div
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                  isComplete && "bg-[var(--accent-emerald)] text-white",
                  isActive && "bg-[var(--accent-primary)] text-white",
                  isPending &&
                    "bg-[var(--bg-hover)] text-[var(--text-tertiary)]",
                )}
              >
                {isComplete ? (
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={clsx(
                  "ml-2 text-xs font-medium transition-colors",
                  isComplete && "text-[var(--text-primary)]",
                  isActive && "text-[var(--text-primary)]",
                  isPending && "text-[var(--text-muted)]",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={clsx(
                  "w-12 h-0.5 mx-2 rounded transition-colors",
                  index < currentIndex
                    ? "bg-[var(--accent-emerald)]"
                    : "bg-[var(--border-subtle)]",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BasicsStep({
  projectName,
  setupMode,
  onProjectNameChange,
  onSetupModeChange,
  onNext,
  nameValidation,
  onValidateName,
}: {
  projectName: string;
  setupMode: "quick" | "guided" | "template";
  onProjectNameChange: (name: string) => void;
  onSetupModeChange: (mode: "quick" | "guided" | "template") => void;
  onNext: () => void;
  nameValidation: NameValidation;
  onValidateName: (name: string) => Promise<boolean>;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === "Enter" &&
      projectName.trim() &&
      !nameValidation.isValidating
    ) {
      onNext();
    }
  };

  const handleBlur = () => {
    if (projectName.trim()) {
      onValidateName(projectName);
    }
  };

  const hasError = nameValidation.isValid === false && nameValidation.error;

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Create New Project
        </h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-[400px]">
          Give your project a name and choose how you&apos;d like to set it up
        </p>
      </div>

      <div className="w-full max-w-[400px]">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Project Name
        </label>
        <div className="relative">
          <input
            type="text"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="my-awesome-project"
            className={clsx(
              "input w-full",
              hasError &&
                "border-[var(--accent-rose)] focus:border-[var(--accent-rose)] focus:ring-[var(--accent-rose)]/20",
            )}
            autoFocus
          />
          {nameValidation.isValidating && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {nameValidation.isValid === true && !nameValidation.isValidating && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className="w-5 h-5 text-[var(--accent-emerald)]"
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
            </div>
          )}
          {hasError && !nameValidation.isValidating && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg
                className="w-5 h-5 text-[var(--accent-rose)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
        </div>
        {hasError && (
          <p className="mt-2 text-sm text-[var(--accent-rose)]">
            {nameValidation.error}
          </p>
        )}
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Lowercase letters, numbers, and hyphens only
        </p>
      </div>

      <div className="mt-4">
        <SetupModeSelector value={setupMode} onChange={onSetupModeChange} />
      </div>
    </div>
  );
}

export function NewProjectWizard({
  onClose,
  onCreated,
}: NewProjectWizardProps) {
  const {
    state,
    creationProgress,
    nameValidation,
    setProjectName,
    setSetupMode,
    validateName,
    startDiscovery,
    saveAnswers,
    generatePlan,
    approveAndCreate,
    reset,
    goBack,
    canGeneratePlan,
  } = useProjectWizard();

  const [isApproving, setIsApproving] = useState(false);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleNext = useCallback(() => {
    if (state.step === "basics") {
      if (state.setupMode === "quick") {
        // Skip discovery and go straight to generating
        generatePlan();
      } else if (state.setupMode === "guided") {
        startDiscovery();
      } else {
        // Template - for now, just go to discovery
        startDiscovery();
      }
    }
  }, [state.step, state.setupMode, startDiscovery, generatePlan]);

  const handleApprove = useCallback(async () => {
    setIsApproving(true);
    const success = await approveAndCreate();
    setIsApproving(false);
    if (success) {
      onCreated();
      onClose();
    }
  }, [approveAndCreate, onCreated, onClose]);

  const handleReject = useCallback(() => {
    reset();
  }, [reset]);

  const handleModify = useCallback(() => {
    goBack();
  }, [goBack]);

  const renderStepContent = () => {
    switch (state.step) {
      case "basics":
        return (
          <BasicsStep
            projectName={state.projectName}
            setupMode={state.setupMode}
            onProjectNameChange={setProjectName}
            onSetupModeChange={setSetupMode}
            onNext={handleNext}
            nameValidation={nameValidation}
            onValidateName={validateName}
          />
        );
      case "discovery":
        // Show loading state while questions are being fetched
        if (!state.onboardingQuestions) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-[var(--text-secondary)]">
                  Loading questions...
                </p>
              </div>
            </div>
          );
        }
        return (
          <OnboardingQuestionsForm
            questions={state.onboardingQuestions}
            onSaveAnswers={saveAnswers}
            onGeneratePlan={generatePlan}
            canGeneratePlan={canGeneratePlan()}
            isSaving={state.isSavingAnswers}
          />
        );
      case "generating":
        return (
          <PlanGenerationProgress
            progress={state.generatingProgress}
            currentStep={state.generatingStep}
            sessionId={state.generationSessionId}
            projectName={state.projectName}
          />
        );
      case "approval":
        return state.generatedPlan ? (
          <PlanApprovalView
            plan={state.generatedPlan}
            onApprove={handleApprove}
            onModify={handleModify}
            onReject={handleReject}
            isApproving={isApproving}
            creationProgress={creationProgress}
          />
        ) : null;
      default:
        return null;
    }
  };

  const showBackButton = state.step === "discovery";
  const showNextButton = state.step === "basics";
  const canGoNext =
    state.step === "basics" &&
    state.projectName.trim().length > 0 &&
    !nameValidation.isValidating &&
    nameValidation.isValid !== false;

  return (
    <div
      className="modal-backdrop animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content animate-slide-up glass-elevated border border-[var(--border-subtle)] rounded-2xl overflow-hidden window-glow-strong"
        style={{ maxWidth: "900px", height: "85vh" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
      >
        {/* Header with glass reflection */}
        <div className="modal-header flex items-center justify-between bg-gradient-to-r from-[var(--accent-primary)]/10 via-transparent to-[var(--color-wine-medium)]/5 border-b border-[var(--border-subtle)] window-header-glass">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl glass border border-[var(--accent-primary)]/30 shadow-[0_0_15px_var(--accent-primary-glow)] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-[var(--accent-primary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <div>
              <h2
                id="wizard-title"
                className="text-lg font-semibold text-[var(--text-primary)]"
              >
                {state.projectName || "New Project"}
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                Project Creation Wizard
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] glass hover:bg-[var(--bg-hover)] transition-all hover:scale-105"
            aria-label="Close wizard"
          >
            <svg
              className="w-5 h-5"
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

        {/* Progress */}
        <WizardProgress currentStep={state.step} />

        {/* Body */}
        <div className="modal-body flex-1 overflow-hidden">
          {renderStepContent()}
        </div>

        {/* Footer - only shown for certain steps */}
        {(showBackButton || showNextButton) && (
          <div className="modal-footer flex items-center justify-between">
            <div>
              {showBackButton && (
                <button onClick={goBack} className="btn btn-ghost">
                  Back
                </button>
              )}
            </div>
            <div>
              {showNextButton && (
                <button
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="btn btn-primary disabled:opacity-50"
                >
                  {nameValidation.isValidating ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Validating...
                    </span>
                  ) : (
                    "Continue"
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error display */}
        {state.error && (
          <div className="px-6 py-3 glass border-t border-[var(--accent-rose)]/30 bg-[var(--accent-rose)]/10">
            <p className="text-sm text-[var(--accent-rose)]">{state.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
