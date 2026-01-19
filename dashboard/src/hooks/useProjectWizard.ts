import { useState, useCallback, useEffect } from "react";
import {
  createProject,
  initOnboarding,
  getOnboardingState,
  saveOnboardingAnswers,
  startOnboardSession,
  getAllSessions,
} from "../services/api";
import type {
  WizardState,
  WizardStep,
  SetupMode,
  GeneratedPlan,
} from "../types/wizard";
import type { OnboardingQuestions } from "../types/kanban";

// Extended state for creation progress
export interface CreationProgress {
  phase: "idle" | "creating" | "initializing" | "saving" | "polling" | "done";
  message: string;
  detail?: string;
}

interface ExtendedWizardState extends WizardState {
  onboardingQuestions: OnboardingQuestions | null;
  isSavingAnswers: boolean;
}

const INITIAL_STATE: ExtendedWizardState = {
  step: "basics",
  projectName: "",
  setupMode: "guided",
  discoveryMessages: [],
  generatingProgress: 0,
  generatingStep: "",
  generatedPlan: null,
  error: null,
  onboardingQuestions: null,
  isSavingAnswers: false,
};

const GENERATION_STEPS = [
  "Analyzing requirements",
  "Creating project structure",
  "Generating PRD from answers",
  "Breaking down into features",
  "Creating task definitions",
  "Setting up contracts",
];

export function useProjectWizard() {
  const [state, setState] = useState<ExtendedWizardState>(INITIAL_STATE);
  const [creationProgress, setCreationProgress] = useState<CreationProgress>({
    phase: "idle",
    message: "",
  });

  const setStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setProjectName = useCallback((projectName: string) => {
    setState((prev) => ({ ...prev, projectName }));
  }, []);

  const setSetupMode = useCallback((setupMode: SetupMode) => {
    setState((prev) => ({ ...prev, setupMode }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  // Create project and initialize onboarding
  const startDiscovery = useCallback(async () => {
    setState((prev) => ({ ...prev, error: null }));
    setCreationProgress({
      phase: "creating",
      message: "Creating project...",
      detail: `Setting up ${state.projectName} in sandbox`,
    });

    try {
      // Step 1: Create the project
      const createResult = await createProject(state.projectName);
      if (!createResult.data.success) {
        throw new Error("Failed to create project");
      }

      setCreationProgress({
        phase: "initializing",
        message: "Initializing onboarding...",
        detail: "Setting up business questions",
      });

      // Step 2: Initialize onboarding (creates QUESTIONS.yaml)
      const onboardResult = await initOnboarding(state.projectName);

      setState((prev) => ({
        ...prev,
        step: "discovery",
        onboardingQuestions: onboardResult.data.questions || null,
      }));

      setCreationProgress({ phase: "idle", message: "" });
    } catch (err) {
      setCreationProgress({ phase: "idle", message: "" });
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to create project",
      }));
    }
  }, [state.projectName]);

  // Save answers to QUESTIONS.yaml
  const saveAnswers = useCallback(
    async (answers: Record<string, string | string[] | null>) => {
      setState((prev) => ({ ...prev, isSavingAnswers: true, error: null }));

      try {
        const result = await saveOnboardingAnswers(state.projectName, answers);

        setState((prev) => ({
          ...prev,
          isSavingAnswers: false,
          onboardingQuestions:
            result.data.questions || prev.onboardingQuestions,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isSavingAnswers: false,
          error: err instanceof Error ? err.message : "Failed to save answers",
        }));
      }
    },
    [state.projectName],
  );

  // Check if we can generate the plan (all required questions answered)
  const canGeneratePlan = useCallback(() => {
    if (!state.onboardingQuestions) return false;

    const { phases, current_phase } = state.onboardingQuestions;
    const currentQuestions =
      current_phase === 1
        ? phases.business.questions
        : phases.features.questions;

    const requiredUnanswered = currentQuestions.filter(
      (q) =>
        q.required &&
        (q.answer === null ||
          q.answer === undefined ||
          (Array.isArray(q.answer) && q.answer.length === 0) ||
          (typeof q.answer === "string" && q.answer.trim().length === 0)),
    );

    return requiredUnanswered.length === 0;
  }, [state.onboardingQuestions]);

  // Generate plan by starting the /onboard Claude session
  const generatePlan = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      step: "generating",
      generatingProgress: 0,
      generatingStep: GENERATION_STEPS[0],
    }));

    try {
      // Start the Claude /onboard session which will generate the plan
      await startOnboardSession(state.projectName);

      // Simulate progress while waiting for Claude to generate
      for (let i = 0; i < GENERATION_STEPS.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setState((prev) => ({
          ...prev,
          generatingProgress: ((i + 1) / GENERATION_STEPS.length) * 100,
          generatingStep: GENERATION_STEPS[i],
        }));
      }

      // Generate a plan summary based on the questions answered
      const questions = state.onboardingQuestions;
      if (!questions) {
        throw new Error("No onboarding questions found");
      }

      const projectName = questions.context.project_name || state.projectName;
      const projectSummary =
        questions.context.project_summary || "A modern application";

      // Create a mock plan based on the actual answers
      const mockPlan: GeneratedPlan = {
        projectName,
        description: projectSummary,
        techStack: [
          "React 19",
          "TypeScript",
          "Tailwind CSS 4",
          "Node.js 22",
          "PostgreSQL 16",
          "Docker",
        ],
        features: [],
        tasks: [],
        phases: [],
        estimatedTotalHours: 0,
      };

      // Note: In the full implementation, the /onboard Claude session
      // would create the actual features and tasks based on answers
      // For now, we just transition to approval

      setState((prev) => ({
        ...prev,
        step: "approval",
        generatedPlan: mockPlan,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to generate plan",
        step: "discovery",
      }));
    }
  }, [state.projectName, state.onboardingQuestions]);

  // Approve and finalize the project
  const approveAndCreate = useCallback(async () => {
    setState((prev) => ({ ...prev, error: null }));

    // Helper to poll for session with the created project
    const pollForSession = async (
      projectName: string,
      maxAttempts = 30,
      intervalMs = 2000,
    ): Promise<boolean> => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const sessionsResponse = await getAllSessions();
          const sessions = sessionsResponse.data || [];

          const projectSession = sessions.find(
            (s) =>
              s.projectPath?.includes(projectName) ||
              s.projectName?.includes(projectName),
          );

          if (projectSession) {
            return true;
          }
        } catch {
          // Ignore errors during polling
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));

        setCreationProgress({
          phase: "polling",
          message: "Waiting for session to start...",
          detail: `Attempt ${attempt + 1}/${maxAttempts}`,
        });
      }
      return false;
    };

    try {
      setCreationProgress({
        phase: "polling",
        message: "Waiting for Claude to finish...",
        detail: "Checking for active session",
      });

      const sessionFound = await pollForSession(state.projectName);

      if (!sessionFound) {
        console.warn("Session polling timed out, but project was created");
      }

      setCreationProgress({
        phase: "done",
        message: "Project created successfully!",
        detail: sessionFound
          ? "Session is ready"
          : "Project ready (session may start shortly)",
      });

      return true;
    } catch (err) {
      setCreationProgress({ phase: "idle", message: "" });
      setState((prev) => ({
        ...prev,
        error:
          err instanceof Error ? err.message : "Failed to finalize project",
      }));
      return false;
    }
  }, [state.projectName]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    setCreationProgress({ phase: "idle", message: "" });
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      switch (prev.step) {
        case "discovery":
          return { ...prev, step: "basics", onboardingQuestions: null };
        case "generating":
          return { ...prev, step: "discovery" };
        case "approval":
          return { ...prev, step: "discovery", generatedPlan: null };
        default:
          return prev;
      }
    });
  }, []);

  // Legacy compatibility - check if can proceed based on step
  const canProceed = useCallback(() => {
    switch (state.step) {
      case "basics":
        return state.projectName.trim().length > 0;
      case "discovery":
        return canGeneratePlan();
      case "generating":
        return false;
      case "approval":
        return state.generatedPlan !== null;
      default:
        return false;
    }
  }, [state.step, state.projectName, state.generatedPlan, canGeneratePlan]);

  // Reload onboarding state if we're in discovery mode
  useEffect(() => {
    if (
      state.step === "discovery" &&
      state.projectName &&
      !state.onboardingQuestions
    ) {
      getOnboardingState(state.projectName)
        .then((result) => {
          setState((prev) => ({
            ...prev,
            onboardingQuestions: result.data.questions || null,
          }));
        })
        .catch((err) => {
          console.error("Failed to load onboarding state:", err);
        });
    }
  }, [state.step, state.projectName, state.onboardingQuestions]);

  return {
    state,
    creationProgress,
    setStep,
    setProjectName,
    setSetupMode,
    setError,
    startDiscovery,
    sendDiscoveryMessage: () => {}, // Legacy - not used with new form
    saveAnswers,
    generatePlan,
    approveAndCreate,
    reset,
    goBack,
    canProceed,
    canGeneratePlan,
  };
}
