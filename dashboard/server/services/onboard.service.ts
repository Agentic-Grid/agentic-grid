/**
 * Onboarding Service
 * Handles the business-first project onboarding flow
 * Manages QUESTIONS.yaml state and Claude session spawning
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import type {
  OnboardingQuestions,
  OnboardingQuestion,
  OnboardingState,
  OnboardingStatus,
  OnboardingPhase,
} from "../types/kanban.types";

// Project root is one level up from dashboard folder
// dashboard/server/services/onboard.service.ts -> project root
const PROJECT_ROOT = path.join(import.meta.dirname, "..", "..", "..");

const SANDBOX_DIR = path.join(PROJECT_ROOT, "sandbox");
const TEMPLATES_DIR = path.join(PROJECT_ROOT, "templates");
const QUESTIONS_FILENAME = "QUESTIONS.yaml";
const STATUS_FILENAME = ".onboard-status";

/**
 * Get the path to a project's QUESTIONS.yaml
 */
function getQuestionsPath(projectName: string): string {
  return path.join(SANDBOX_DIR, projectName, QUESTIONS_FILENAME);
}

/**
 * Get the path to a project's .onboard-status
 */
function getStatusPath(projectName: string): string {
  return path.join(SANDBOX_DIR, projectName, STATUS_FILENAME);
}

/**
 * Read the onboarding status file
 */
function readOnboardStatus(projectName: string): OnboardingStatus {
  const statusPath = getStatusPath(projectName);
  if (!fs.existsSync(statusPath)) {
    return "not_started";
  }
  const content = fs.readFileSync(statusPath, "utf-8").trim();
  const validStatuses: OnboardingStatus[] = [
    "not_started",
    "awaiting_answers",
    "processing",
    "complete",
    "error",
  ];
  return validStatuses.includes(content as OnboardingStatus)
    ? (content as OnboardingStatus)
    : "not_started";
}

/**
 * Write the onboarding status file
 */
function writeOnboardStatus(
  projectName: string,
  status: OnboardingStatus,
): void {
  const statusPath = getStatusPath(projectName);
  fs.writeFileSync(statusPath, status, "utf-8");
}

/**
 * Read QUESTIONS.yaml for a project
 */
function readQuestions(projectName: string): OnboardingQuestions | null {
  const questionsPath = getQuestionsPath(projectName);
  if (!fs.existsSync(questionsPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(questionsPath, "utf-8");
    return yaml.parse(content) as OnboardingQuestions;
  } catch {
    console.error(`Failed to parse QUESTIONS.yaml for ${projectName}`);
    return null;
  }
}

/**
 * Write QUESTIONS.yaml for a project
 */
function writeQuestions(
  projectName: string,
  questions: OnboardingQuestions,
): void {
  const questionsPath = getQuestionsPath(projectName);
  questions.updated_at = new Date().toISOString();
  const content = yaml.stringify(questions, { lineWidth: 0 });
  fs.writeFileSync(questionsPath, content, "utf-8");
}

/**
 * Initialize QUESTIONS.yaml from template
 */
function initializeQuestions(projectName: string): OnboardingQuestions {
  const templatePath = path.join(TEMPLATES_DIR, "QUESTIONS_TEMPLATE.yaml");

  let questions: OnboardingQuestions;

  if (fs.existsSync(templatePath)) {
    const content = fs.readFileSync(templatePath, "utf-8");
    questions = yaml.parse(content) as OnboardingQuestions;
  } else {
    // Fallback to minimal structure
    questions = createDefaultQuestions();
  }

  questions.created_at = new Date().toISOString();
  questions.updated_at = new Date().toISOString();

  writeQuestions(projectName, questions);
  writeOnboardStatus(projectName, "awaiting_answers");

  return questions;
}

/**
 * Create default questions structure
 */
function createDefaultQuestions(): OnboardingQuestions {
  return {
    version: "1.0",
    status: "pending",
    current_phase: 1,
    context: {
      project_name: null,
      project_summary: null,
      problem_summary: null,
      features_identified: [],
      user_roles_identified: [],
      tech_stack: null,
    },
    phases: {
      business: {
        status: "pending",
        questions: [
          {
            id: "b1",
            category: "Project Identity",
            question: "What is the project name?",
            type: "text",
            required: true,
            placeholder: "e.g., DevMatch, TaskFlow, InvoiceHub",
            answer: null,
          },
          {
            id: "b2",
            category: "Project Identity",
            question: "In 1-2 sentences, what does this project do?",
            type: "text",
            required: true,
            placeholder:
              "e.g., A platform that connects freelance developers with startups",
            answer: null,
          },
          {
            id: "b3",
            category: "Project Identity",
            question: "What is the primary goal of this project?",
            type: "single_select",
            required: true,
            options: [
              {
                label: "Generate revenue",
                value: "revenue",
                description:
                  "Product that makes money through sales or subscriptions",
              },
              {
                label: "Solve internal problem",
                value: "internal",
                description: "Tool for internal team use",
              },
              {
                label: "Build community/audience",
                value: "community",
                description: "Platform focused on user growth",
              },
              {
                label: "Provide free service",
                value: "free_service",
                description: "Open/free tool without monetization",
              },
            ],
            answer: null,
            details: null,
          },
          {
            id: "b4",
            category: "Problem Statement",
            question: "What problem does this solve?",
            type: "text",
            required: true,
            placeholder: "Describe the pain point this addresses",
            answer: null,
          },
          {
            id: "b5",
            category: "Problem Statement",
            question: "Who experiences this problem?",
            type: "text",
            required: true,
            placeholder: "e.g., Small business owners who need quick dev help",
            answer: null,
          },
          {
            id: "b6",
            category: "Features",
            question: "What are the MUST-HAVE features for MVP?",
            type: "text",
            required: true,
            placeholder: "List 3-5 core features, one per line",
            answer: null,
          },
          {
            id: "b7",
            category: "User Roles",
            question: "Who are the different types of users?",
            type: "text",
            required: true,
            placeholder: "e.g., Admin, Customer, Vendor, Guest",
            answer: null,
          },
          {
            id: "b8",
            category: "User Roles",
            question: "What can each user type do?",
            type: "text",
            required: true,
            placeholder: "Describe main actions per user type",
            answer: null,
          },
          {
            id: "b9",
            category: "Technical",
            question: "Do you have a preferred tech stack?",
            type: "single_select",
            required: true,
            options: [
              {
                label: "Use recommended stack",
                value: "default",
                description: "React 19, Node.js 22, PostgreSQL, Tailwind CSS 4",
              },
              {
                label: "Let me specify",
                value: "custom",
                description: "I have specific requirements",
              },
            ],
            answer: null,
            details: null,
          },
        ],
      },
      features: {
        status: "pending",
        questions: [],
      },
    },
    created_at: "",
    updated_at: "",
    answered_count: 0,
    total_required: 9,
  };
}

/**
 * Count answered questions in a phase
 */
function countAnswered(phase: OnboardingPhase): number {
  return phase.questions.filter((q) => {
    if (!q.required) return false;
    if (q.type === "multi_select") {
      return Array.isArray(q.answer) && q.answer.length > 0;
    }
    return q.answer !== null && q.answer !== "";
  }).length;
}

/**
 * Count required questions in a phase
 */
function countRequired(phase: OnboardingPhase): number {
  return phase.questions.filter((q) => q.required).length;
}

/**
 * Check if a phase is complete
 */
function isPhaseComplete(phase: OnboardingPhase): boolean {
  const required = phase.questions.filter((q) => q.required);
  return required.every((q) => {
    if (q.type === "multi_select") {
      return Array.isArray(q.answer) && q.answer.length > 0;
    }
    return q.answer !== null && q.answer !== "";
  });
}

/**
 * Generate feature-specific questions based on business phase answers
 */
function generateFeatureQuestions(
  businessPhase: OnboardingPhase,
): OnboardingQuestion[] {
  const questions: OnboardingQuestion[] = [];
  const featuresAnswer = businessPhase.questions.find(
    (q) => q.id === "b6",
  )?.answer;

  if (!featuresAnswer || typeof featuresAnswer !== "string") {
    return questions;
  }

  const features = featuresAnswer.toLowerCase();

  // Authentication questions
  if (
    features.includes("auth") ||
    features.includes("login") ||
    features.includes("signup") ||
    features.includes("user")
  ) {
    questions.push({
      id: "f_auth_1",
      category: "Authentication",
      question: "What authentication methods do you need?",
      type: "multi_select",
      required: true,
      options: [
        { label: "Email/Password", value: "email_password" },
        { label: "OAuth (Google, GitHub)", value: "oauth" },
        { label: "Magic Link (passwordless)", value: "magic_link" },
        { label: "Enterprise SSO", value: "sso" },
      ],
      answer: [],
    });
  }

  // Payment questions
  if (
    features.includes("payment") ||
    features.includes("billing") ||
    features.includes("subscription") ||
    features.includes("checkout")
  ) {
    questions.push(
      {
        id: "f_pay_1",
        category: "Payments",
        question: "What type of payments?",
        type: "single_select",
        required: true,
        options: [
          { label: "One-time purchases", value: "one_time" },
          { label: "Subscriptions", value: "subscription" },
          { label: "Both", value: "both" },
        ],
        answer: null,
      },
      {
        id: "f_pay_2",
        category: "Payments",
        question: "Which payment provider?",
        type: "single_select",
        required: true,
        options: [
          { label: "Stripe (recommended)", value: "stripe" },
          { label: "PayPal", value: "paypal" },
          { label: "Both", value: "both" },
        ],
        answer: null,
      },
    );
  }

  // Notification questions
  if (
    features.includes("notification") ||
    features.includes("email") ||
    features.includes("alert")
  ) {
    questions.push({
      id: "f_notif_1",
      category: "Notifications",
      question: "What notification channels?",
      type: "multi_select",
      required: true,
      options: [
        { label: "Email", value: "email" },
        { label: "Push notifications", value: "push" },
        { label: "In-app notifications", value: "in_app" },
        { label: "SMS", value: "sms" },
      ],
      answer: [],
    });
  }

  // Dashboard questions
  if (
    features.includes("dashboard") ||
    features.includes("analytics") ||
    features.includes("reporting")
  ) {
    questions.push({
      id: "f_dash_1",
      category: "Dashboard",
      question: "What metrics should the dashboard show?",
      type: "text",
      required: true,
      placeholder: "e.g., User growth, Revenue, Active sessions",
      answer: null,
    });
  }

  return questions;
}

/**
 * Update the context object based on answers
 */
function updateContextFromAnswers(
  questions: OnboardingQuestions,
): OnboardingQuestions {
  const business = questions.phases.business;

  // Extract project name
  const nameQ = business.questions.find((q) => q.id === "b1");
  if (nameQ?.answer && typeof nameQ.answer === "string") {
    questions.context.project_name = nameQ.answer;
  }

  // Extract project summary
  const summaryQ = business.questions.find((q) => q.id === "b2");
  if (summaryQ?.answer && typeof summaryQ.answer === "string") {
    questions.context.project_summary = summaryQ.answer;
  }

  // Extract problem summary
  const problemQ = business.questions.find((q) => q.id === "b4");
  const whoQ = business.questions.find((q) => q.id === "b5");
  if (
    problemQ?.answer &&
    whoQ?.answer &&
    typeof problemQ.answer === "string" &&
    typeof whoQ.answer === "string"
  ) {
    questions.context.problem_summary = `${whoQ.answer} face the problem of: ${problemQ.answer}`;
  }

  // Extract features
  const featuresQ = business.questions.find((q) => q.id === "b6");
  if (featuresQ?.answer && typeof featuresQ.answer === "string") {
    questions.context.features_identified = featuresQ.answer
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
  }

  // Extract user roles
  const rolesQ = business.questions.find((q) => q.id === "b7");
  if (rolesQ?.answer && typeof rolesQ.answer === "string") {
    questions.context.user_roles_identified = rolesQ.answer
      .split(/[,\n]/)
      .map((r) => r.trim())
      .filter((r) => r.length > 0);
  }

  // Extract tech stack
  const techQ = business.questions.find((q) => q.id === "b9");
  if (techQ?.answer) {
    questions.context.tech_stack =
      techQ.answer === "default"
        ? "React 19, Node.js 22, PostgreSQL, Tailwind CSS 4"
        : techQ.details || "custom";
  }

  return questions;
}

// =============================================================================
// EXPORTED SERVICE FUNCTIONS
// =============================================================================

export const OnboardService = {
  /**
   * Get the current onboarding state for a project
   */
  getState(projectName: string): OnboardingState {
    const projectPath = path.join(SANDBOX_DIR, projectName);
    if (!fs.existsSync(projectPath)) {
      return { status: "not_started" };
    }

    const status = readOnboardStatus(projectName);
    const questions = readQuestions(projectName);

    return {
      status,
      questions: questions || undefined,
    };
  },

  /**
   * Initialize onboarding for a project (create QUESTIONS.yaml)
   */
  initialize(projectName: string): OnboardingState {
    const projectPath = path.join(SANDBOX_DIR, projectName);
    console.log(`[OnboardService] initialize called for: ${projectName}`);
    console.log(`[OnboardService] PROJECT_ROOT: ${PROJECT_ROOT}`);
    console.log(`[OnboardService] SANDBOX_DIR: ${SANDBOX_DIR}`);
    console.log(`[OnboardService] projectPath: ${projectPath}`);
    console.log(`[OnboardService] exists: ${fs.existsSync(projectPath)}`);

    if (!fs.existsSync(projectPath)) {
      return {
        status: "error",
        error: `Project does not exist at ${projectPath}`,
      };
    }

    const existingQuestions = readQuestions(projectName);
    if (existingQuestions) {
      // Already initialized, return current state
      return {
        status: readOnboardStatus(projectName),
        questions: existingQuestions,
      };
    }

    const questions = initializeQuestions(projectName);
    return {
      status: "awaiting_answers",
      questions,
    };
  },

  /**
   * Save answers to QUESTIONS.yaml
   */
  saveAnswers(
    projectName: string,
    answers: Record<string, string | string[] | null>,
  ): OnboardingState {
    let questions = readQuestions(projectName);
    if (!questions) {
      return { status: "error", error: "QUESTIONS.yaml not found" };
    }

    // Update answers in business phase
    for (const question of questions.phases.business.questions) {
      if (answers[question.id] !== undefined) {
        question.answer = answers[question.id];
      }
      // Handle details field for questions with options
      if (answers[`${question.id}_details`] !== undefined) {
        question.details = answers[`${question.id}_details`] as string | null;
      }
    }

    // Update answers in features phase
    for (const question of questions.phases.features.questions) {
      if (answers[question.id] !== undefined) {
        question.answer = answers[question.id];
      }
    }

    // Update context from answers
    questions = updateContextFromAnswers(questions);

    // Update counts
    const businessAnswered = countAnswered(questions.phases.business);
    const featuresAnswered = countAnswered(questions.phases.features);
    questions.answered_count = businessAnswered + featuresAnswered;

    // Check phase completion and generate feature questions if needed
    if (isPhaseComplete(questions.phases.business)) {
      questions.phases.business.status = "complete";

      // Generate feature-specific questions if not already done
      if (questions.phases.features.questions.length === 0) {
        const featureQuestions = generateFeatureQuestions(
          questions.phases.business,
        );
        questions.phases.features.questions = featureQuestions;
        questions.total_required += countRequired(questions.phases.features);
        questions.current_phase = 2;

        if (featureQuestions.length === 0) {
          // No feature questions needed, we're complete
          questions.phases.features.status = "complete";
          questions.status = "complete";
        } else {
          questions.phases.features.status = "pending";
          questions.status = "partial";
        }
      }
    }

    // Check if all phases complete
    if (
      isPhaseComplete(questions.phases.business) &&
      (questions.phases.features.questions.length === 0 ||
        isPhaseComplete(questions.phases.features))
    ) {
      questions.phases.features.status = "complete";
      questions.status = "complete";
      writeOnboardStatus(projectName, "complete");
    }

    writeQuestions(projectName, questions);

    return {
      status: readOnboardStatus(projectName),
      questions,
    };
  },

  /**
   * Get questions that still need answers
   */
  getPendingQuestions(projectName: string): OnboardingQuestion[] {
    const questions = readQuestions(projectName);
    if (!questions) return [];

    const pending: OnboardingQuestion[] = [];

    // Add unanswered business questions
    for (const q of questions.phases.business.questions) {
      if (q.required && (q.answer === null || q.answer === "")) {
        pending.push(q);
      }
    }

    // Add unanswered feature questions (if business is complete)
    if (questions.phases.business.status === "complete") {
      for (const q of questions.phases.features.questions) {
        if (q.required) {
          if (q.type === "multi_select") {
            if (!Array.isArray(q.answer) || q.answer.length === 0) {
              pending.push(q);
            }
          } else if (q.answer === null || q.answer === "") {
            pending.push(q);
          }
        }
      }
    }

    return pending;
  },

  /**
   * Check if onboarding is complete
   */
  isComplete(projectName: string): boolean {
    const status = readOnboardStatus(projectName);
    return status === "complete";
  },

  /**
   * Get the 2-line project summary for task context
   */
  getProjectSummary(projectName: string): string | null {
    const questions = readQuestions(projectName);
    if (!questions?.context) return null;

    const { project_name, project_summary } = questions.context;
    if (!project_name || !project_summary) return null;

    // Get goal from b3 answer
    const goalQ = questions.phases.business.questions.find(
      (q) => q.id === "b3",
    );
    const goalMap: Record<string, string> = {
      revenue: "Generate revenue through the platform",
      internal: "Solve internal team problems",
      community: "Build community and user engagement",
      free_service: "Provide free value to users",
    };
    const goal =
      goalQ?.answer && typeof goalQ.answer === "string"
        ? goalMap[goalQ.answer] || goalQ.answer
        : "Deliver value to users";

    return `${project_name}: ${project_summary}\nGoal: ${goal}.`;
  },
};

export default OnboardService;
