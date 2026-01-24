import { useState, useCallback, useEffect } from "react";
import {
  createProject,
  initOnboarding,
  getOnboardingState,
  saveOnboardingAnswers,
  startOnboardSession,
  getAllSessions,
  validateProjectName,
} from "../services/api";
import { getFeatures, getTasks } from "../services/kanban";
import type {
  WizardState,
  WizardStep,
  SetupMode,
  GeneratedPlan,
  GeneratedFeature,
  GeneratedTask,
} from "../types/wizard";
import type { OnboardingQuestions, Feature, Task } from "../types/kanban";

// Extended state for creation progress
export interface CreationProgress {
  phase: "idle" | "creating" | "initializing" | "saving" | "polling" | "done";
  message: string;
  detail?: string;
}

// Name validation state
export interface NameValidation {
  isValidating: boolean;
  isValid: boolean | null;
  error: string | null;
  code: string | null;
}

interface ExtendedWizardState extends WizardState {
  onboardingQuestions: OnboardingQuestions | null;
  isSavingAnswers: boolean;
  generationSessionId: string | null;
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
  generationSessionId: null,
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
  const [nameValidation, setNameValidation] = useState<NameValidation>({
    isValidating: false,
    isValid: null,
    error: null,
    code: null,
  });

  const setStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setProjectName = useCallback((projectName: string) => {
    setState((prev) => ({ ...prev, projectName }));
    // Reset validation when name changes
    setNameValidation({
      isValidating: false,
      isValid: null,
      error: null,
      code: null,
    });
  }, []);

  // Validate the project name (check format, sandbox, and GitHub)
  const validateName = useCallback(async (name: string): Promise<boolean> => {
    if (!name || name.trim().length === 0) {
      setNameValidation({
        isValidating: false,
        isValid: false,
        error: "Project name is required",
        code: "REQUIRED",
      });
      return false;
    }

    setNameValidation({
      isValidating: true,
      isValid: null,
      error: null,
      code: null,
    });

    try {
      const result = await validateProjectName(name);
      const { valid, error, code } = result.data;

      setNameValidation({
        isValidating: false,
        isValid: valid,
        error: error || null,
        code: code || null,
      });

      return valid;
    } catch (err) {
      setNameValidation({
        isValidating: false,
        isValid: false,
        error: err instanceof Error ? err.message : "Validation failed",
        code: "VALIDATION_ERROR",
      });
      return false;
    }
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

    // Step 0: Validate project name first
    setCreationProgress({
      phase: "creating",
      message: "Validating project name...",
      detail: "Checking availability",
    });

    const isValid = await validateName(state.projectName);
    if (!isValid) {
      setCreationProgress({ phase: "idle", message: "" });
      return;
    }

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
  }, [state.projectName, validateName]);

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

  // Helper to poll for features to be generated
  const pollForFeatures = async (
    projectName: string,
    maxAttempts = 60,
    intervalMs = 2000,
  ): Promise<{ features: Feature[]; tasks: Task[] }> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const features = await getFeatures(projectName);
        if (features && features.length > 0) {
          // Features found, now get tasks for each feature
          const allTasks: Task[] = [];
          for (const feature of features) {
            try {
              const tasks = await getTasks(feature.id);
              allTasks.push(...tasks);
            } catch {
              // Some features may not have tasks yet
            }
          }
          return { features, tasks: allTasks };
        }
      } catch {
        // Features not ready yet, keep polling
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));

      // Update progress based on polling
      const progressPercent = Math.min(((attempt + 1) / maxAttempts) * 100, 95);
      setState((prev) => ({
        ...prev,
        generatingProgress: progressPercent,
        generatingStep:
          GENERATION_STEPS[
            Math.floor((attempt / maxAttempts) * GENERATION_STEPS.length)
          ] || GENERATION_STEPS[GENERATION_STEPS.length - 1],
      }));
    }
    return { features: [], tasks: [] };
  };

  // Generate plan by starting the /onboard Claude session
  const generatePlan = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      step: "generating",
      generatingProgress: 0,
      generatingStep: GENERATION_STEPS[0],
      generationSessionId: null,
    }));

    try {
      // Start the Claude /onboard session which will generate the plan
      const onboardResult = await startOnboardSession(state.projectName);
      const sessionId = onboardResult.data?.sessionId || null;

      setState((prev) => ({
        ...prev,
        generationSessionId: sessionId,
      }));

      // Poll for features to be generated by Claude
      setState((prev) => ({
        ...prev,
        generatingProgress: 10,
        generatingStep: "Waiting for Claude to generate features...",
      }));

      const { features, tasks } = await pollForFeatures(state.projectName);

      // Get project context from questions
      const questions = state.onboardingQuestions;
      const projectName = questions?.context.project_name || state.projectName;
      const projectSummary =
        questions?.context.project_summary || "A modern application";

      // Convert tasks to GeneratedTask format first
      const generatedTasks: GeneratedTask[] = tasks.map((t, index) => ({
        id: t.id || `task-${index}`,
        title: t.title,
        description: t.instructions || t.title,
        agent: t.agent || "FRONTEND",
        estimatedHours: t.estimated_minutes ? t.estimated_minutes / 60 : 1,
        dependencies: t.depends_on || [],
      }));

      // Convert features to GeneratedFeature format
      const generatedFeatures: GeneratedFeature[] = features.map((f, index) => {
        const featureTasks = generatedTasks.filter(
          (t) => tasks.find((task) => task.id === t.id)?.feature_id === f.id,
        );
        return {
          id: f.id || `feature-${index}`,
          name: f.title,
          description: f.description,
          tasks: featureTasks,
          phase: f.phases?.[0]?.phase || 1,
        };
      });

      // Calculate total hours
      const totalHours = generatedTasks.reduce(
        (sum, t) => sum + (t.estimatedHours || 0),
        0,
      );

      // Determine tech stack from questions or default
      const techStack =
        questions?.context.tech_stack === "custom"
          ? ["Custom stack (specified in questions)"]
          : [
              "React 19",
              "TypeScript",
              "Tailwind CSS 4",
              "Node.js 22",
              "PostgreSQL 16",
              "Docker",
            ];

      const plan: GeneratedPlan = {
        projectName,
        description: projectSummary,
        techStack,
        features: generatedFeatures,
        tasks: generatedTasks,
        phases: [],
        estimatedTotalHours: totalHours,
      };

      setState((prev) => ({
        ...prev,
        step: "approval",
        generatingProgress: 100,
        generatedPlan: plan,
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
    setNameValidation({
      isValidating: false,
      isValid: null,
      error: null,
      code: null,
    });
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
        // Name must be present and either not validated yet or valid
        return (
          state.projectName.trim().length > 0 &&
          (nameValidation.isValid === null ||
            nameValidation.isValid === true) &&
          !nameValidation.isValidating
        );
      case "discovery":
        return canGeneratePlan();
      case "generating":
        return false;
      case "approval":
        return state.generatedPlan !== null;
      default:
        return false;
    }
  }, [
    state.step,
    state.projectName,
    state.generatedPlan,
    canGeneratePlan,
    nameValidation,
  ]);

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
    nameValidation,
    setStep,
    setProjectName,
    setSetupMode,
    setError,
    validateName,
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
