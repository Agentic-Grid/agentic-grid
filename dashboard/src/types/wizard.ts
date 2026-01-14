// ============================================================================
// Project Wizard Types
// ============================================================================

export type WizardStep = "basics" | "discovery" | "generating" | "approval";

export type SetupMode = "quick" | "guided" | "template";

export interface DiscoveryMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: string;
  quickPicks?: string[];
}

export interface GeneratedFeature {
  id: string;
  name: string;
  description: string;
  tasks: GeneratedTask[];
  phase: number;
}

export interface GeneratedTask {
  id: string;
  title: string;
  description: string;
  agent: AgentType;
  estimatedHours: number;
  dependencies: string[];
}

export type AgentType =
  | "DESIGNER"
  | "FRONTEND"
  | "BACKEND"
  | "DATA"
  | "DEVOPS"
  | "DISCOVERY"
  | "QA";

export interface ExecutionPhase {
  number: number;
  name: string;
  parallel: boolean;
  agents: PhaseAgent[];
}

export interface PhaseAgent {
  type: AgentType;
  tasks: string[];
  taskCount: number;
}

export interface GeneratedPlan {
  projectName: string;
  description: string;
  techStack: string[];
  features: GeneratedFeature[];
  tasks: GeneratedTask[];
  phases: ExecutionPhase[];
  estimatedTotalHours: number;
}

export interface WizardState {
  step: WizardStep;
  projectName: string;
  setupMode: SetupMode;
  discoveryMessages: DiscoveryMessage[];
  generatingProgress: number;
  generatingStep: string;
  generatedPlan: GeneratedPlan | null;
  error: string | null;
}

// Agent color mapping
export const AGENT_COLORS: Record<
  AgentType,
  { color: string; glow: string; dim: string }
> = {
  DESIGNER: {
    color: "var(--accent-violet)",
    glow: "var(--accent-violet-glow)",
    dim: "var(--accent-violet-dim)",
  },
  FRONTEND: {
    color: "var(--accent-cyan)",
    glow: "var(--accent-cyan-glow)",
    dim: "var(--accent-cyan-dim)",
  },
  BACKEND: {
    color: "var(--accent-primary)",
    glow: "var(--accent-primary-glow)",
    dim: "var(--accent-primary-dim)",
  },
  DATA: {
    color: "var(--accent-emerald)",
    glow: "var(--accent-emerald-glow)",
    dim: "var(--accent-emerald-dim)",
  },
  DEVOPS: {
    color: "var(--accent-amber)",
    glow: "var(--accent-amber-glow)",
    dim: "var(--accent-amber-dim)",
  },
  DISCOVERY: {
    color: "var(--accent-rose)",
    glow: "var(--accent-rose-glow)",
    dim: "var(--accent-rose-dim)",
  },
  QA: {
    color: "var(--text-tertiary)",
    glow: "rgba(255, 255, 255, 0.1)",
    dim: "var(--text-muted)",
  },
};
