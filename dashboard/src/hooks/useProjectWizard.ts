import { useState, useCallback } from "react";
import { spawnProject } from "../services/api";
import type {
  WizardState,
  WizardStep,
  SetupMode,
  DiscoveryMessage,
  GeneratedPlan,
  ExecutionPhase,
} from "../types/wizard";

const INITIAL_STATE: WizardState = {
  step: "basics",
  projectName: "",
  setupMode: "guided",
  discoveryMessages: [],
  generatingProgress: 0,
  generatingStep: "",
  generatedPlan: null,
  error: null,
};

const GENERATION_STEPS = [
  "Forking base-project repository",
  "Creating project structure",
  "Generating PRD from requirements",
  "Breaking down into features",
  "Creating task definitions",
  "Calculating dependencies",
];

const INITIAL_DISCOVERY_MESSAGE: DiscoveryMessage = {
  id: "1",
  role: "assistant",
  content:
    "Hi! I'm here to help you plan your project. Let's start with the basics. What kind of application are you building?",
  timestamp: new Date().toISOString(),
  quickPicks: [
    "Web Application",
    "Mobile App",
    "API/Backend",
    "Full-stack App",
    "CLI Tool",
  ],
};

export function useProjectWizard() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

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

  const startDiscovery = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: "discovery",
      discoveryMessages: [INITIAL_DISCOVERY_MESSAGE],
    }));
  }, []);

  const sendDiscoveryMessage = useCallback((content: string) => {
    const userMessage: DiscoveryMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    // Simulate AI response (in real implementation, this would call an API)
    const aiResponses = [
      {
        content:
          "Great choice! What's the main problem you're trying to solve? Who are the primary users?",
        quickPicks: [
          "Business users",
          "Developers",
          "General consumers",
          "Internal team",
        ],
      },
      {
        content:
          "I understand. What features are must-haves for your MVP? Select all that apply or describe in your own words.",
        quickPicks: [
          "User authentication",
          "Dashboard/Analytics",
          "Payment processing",
          "Real-time updates",
          "API integrations",
        ],
      },
      {
        content:
          "Almost done! Any specific technologies you want to use, or should I suggest based on your requirements?",
        quickPicks: [
          "Use recommended stack",
          "React + Node.js",
          "Next.js + Prisma",
          "Let me specify",
        ],
      },
      {
        content:
          "Perfect! I have enough information to generate your project plan. Click 'Generate Plan' when you're ready.",
        quickPicks: [],
      },
    ];

    setState((prev) => {
      const responseIndex = Math.min(
        Math.floor(prev.discoveryMessages.length / 2),
        aiResponses.length - 1,
      );
      const aiResponse = aiResponses[responseIndex];

      const aiMessage: DiscoveryMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse.content,
        timestamp: new Date().toISOString(),
        quickPicks: aiResponse.quickPicks,
      };

      return {
        ...prev,
        discoveryMessages: [...prev.discoveryMessages, userMessage, aiMessage],
      };
    });
  }, []);

  const generatePlan = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      step: "generating",
      generatingProgress: 0,
      generatingStep: GENERATION_STEPS[0],
    }));

    // Simulate plan generation with progress
    for (let i = 0; i < GENERATION_STEPS.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setState((prev) => ({
        ...prev,
        generatingProgress: ((i + 1) / GENERATION_STEPS.length) * 100,
        generatingStep: GENERATION_STEPS[i],
      }));
    }

    // Generate mock plan based on discovery
    const mockPlan: GeneratedPlan = {
      projectName: state.projectName,
      description:
        "A modern web application built with the latest technologies.",
      techStack: [
        "React 19",
        "TypeScript",
        "Tailwind CSS 4",
        "Node.js",
        "PostgreSQL",
        "Docker",
      ],
      features: [
        {
          id: "feat-001",
          name: "User Authentication",
          description:
            "Secure user authentication with OAuth and session management",
          tasks: [],
          phase: 1,
        },
        {
          id: "feat-002",
          name: "Dashboard",
          description:
            "Interactive dashboard with real-time data visualization",
          tasks: [],
          phase: 2,
        },
        {
          id: "feat-003",
          name: "API Integration",
          description:
            "RESTful API with proper error handling and documentation",
          tasks: [],
          phase: 1,
        },
      ],
      tasks: [
        {
          id: "task-001",
          title: "Design authentication flow",
          description:
            "Create UI/UX designs for login, signup, and password reset",
          agent: "DESIGNER",
          estimatedHours: 4,
          dependencies: [],
        },
        {
          id: "task-002",
          title: "Create database schema",
          description:
            "Design and implement database schema for users and sessions",
          agent: "DATA",
          estimatedHours: 3,
          dependencies: [],
        },
        {
          id: "task-003",
          title: "Implement auth API endpoints",
          description: "Build authentication endpoints with JWT tokens",
          agent: "BACKEND",
          estimatedHours: 6,
          dependencies: ["task-002"],
        },
        {
          id: "task-004",
          title: "Build login components",
          description: "Implement React components for authentication",
          agent: "FRONTEND",
          estimatedHours: 5,
          dependencies: ["task-001", "task-003"],
        },
        {
          id: "task-005",
          title: "Design dashboard layout",
          description: "Create responsive dashboard design with charts",
          agent: "DESIGNER",
          estimatedHours: 6,
          dependencies: [],
        },
        {
          id: "task-006",
          title: "Implement dashboard API",
          description: "Build API endpoints for dashboard data",
          agent: "BACKEND",
          estimatedHours: 4,
          dependencies: ["task-002"],
        },
        {
          id: "task-007",
          title: "Build dashboard UI",
          description: "Implement dashboard React components",
          agent: "FRONTEND",
          estimatedHours: 8,
          dependencies: ["task-005", "task-006"],
        },
        {
          id: "task-008",
          title: "Setup CI/CD pipeline",
          description:
            "Configure GitHub Actions for automated testing and deployment",
          agent: "DEVOPS",
          estimatedHours: 3,
          dependencies: [],
        },
        {
          id: "task-009",
          title: "Write integration tests",
          description: "Create comprehensive test suite for all features",
          agent: "QA",
          estimatedHours: 6,
          dependencies: ["task-004", "task-007"],
        },
      ],
      phases: [
        {
          number: 1,
          name: "Foundation",
          parallel: true,
          agents: [
            {
              type: "DESIGNER",
              tasks: ["Design authentication flow"],
              taskCount: 1,
            },
            { type: "DATA", tasks: ["Create database schema"], taskCount: 1 },
            { type: "DEVOPS", tasks: ["Setup CI/CD pipeline"], taskCount: 1 },
          ],
        },
        {
          number: 2,
          name: "Core Features",
          parallel: true,
          agents: [
            {
              type: "BACKEND",
              tasks: ["Implement auth API endpoints"],
              taskCount: 1,
            },
            {
              type: "DESIGNER",
              tasks: ["Design dashboard layout"],
              taskCount: 1,
            },
          ],
        },
        {
          number: 3,
          name: "Frontend Implementation",
          parallel: true,
          agents: [
            {
              type: "FRONTEND",
              tasks: ["Build login components", "Build dashboard UI"],
              taskCount: 2,
            },
            {
              type: "BACKEND",
              tasks: ["Implement dashboard API"],
              taskCount: 1,
            },
          ],
        },
        {
          number: 4,
          name: "Quality Assurance",
          parallel: false,
          agents: [
            { type: "QA", tasks: ["Write integration tests"], taskCount: 1 },
          ],
        },
      ] as ExecutionPhase[],
      estimatedTotalHours: 45,
    };

    setState((prev) => ({
      ...prev,
      step: "approval",
      generatedPlan: mockPlan,
    }));
  }, [state.projectName]);

  const approveAndCreate = useCallback(async () => {
    if (!state.generatedPlan) return;

    setState((prev) => ({ ...prev, error: null }));

    try {
      await spawnProject(state.projectName);
      return true;
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to create project",
      }));
      return false;
    }
  }, [state.projectName, state.generatedPlan]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      switch (prev.step) {
        case "discovery":
          return { ...prev, step: "basics", discoveryMessages: [] };
        case "generating":
          return { ...prev, step: "discovery" };
        case "approval":
          return { ...prev, step: "discovery", generatedPlan: null };
        default:
          return prev;
      }
    });
  }, []);

  const canProceed = useCallback(() => {
    switch (state.step) {
      case "basics":
        return state.projectName.trim().length > 0;
      case "discovery":
        return state.discoveryMessages.length >= 4; // At least 2 exchanges
      case "generating":
        return false; // Can't proceed while generating
      case "approval":
        return state.generatedPlan !== null;
      default:
        return false;
    }
  }, [
    state.step,
    state.projectName,
    state.discoveryMessages.length,
    state.generatedPlan,
  ]);

  return {
    state,
    setStep,
    setProjectName,
    setSetupMode,
    setError,
    startDiscovery,
    sendDiscoveryMessage,
    generatePlan,
    approveAndCreate,
    reset,
    goBack,
    canProceed,
  };
}
