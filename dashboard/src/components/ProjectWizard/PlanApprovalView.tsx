import { useState } from "react";
import { clsx } from "clsx";
import type { GeneratedPlan, AgentType } from "../../types/wizard";
import { AGENT_COLORS } from "../../types/wizard";
import { PhaseVisualization } from "./PhaseVisualization";

interface CreationProgress {
  phase: "idle" | "creating" | "tasks" | "discovery" | "polling" | "done";
  message: string;
  detail?: string;
}

interface PlanApprovalViewProps {
  plan: GeneratedPlan;
  onApprove: () => void;
  onModify: () => void;
  onReject: () => void;
  isApproving?: boolean;
  creationProgress?: CreationProgress;
}

type TabId = "overview" | "features" | "tasks" | "phases";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-value" style={color ? { color } : {}}>
        {value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function TechBadge({ tech }: { tech: string }) {
  return (
    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
      {tech}
    </span>
  );
}

function AgentBadge({ agent }: { agent: AgentType }) {
  const colors = AGENT_COLORS[agent];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] rounded-full border"
      style={{
        backgroundColor: `${colors.glow}`,
        color: colors.color,
        borderColor: `${colors.color}30`,
      }}
    >
      {agent}
    </span>
  );
}

function OverviewTab({ plan }: { plan: GeneratedPlan }) {
  const uniqueAgents = new Set(plan.tasks.map((t) => t.agent)).size;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Features"
          value={plan.features.length}
          color="var(--accent-violet)"
        />
        <StatCard
          label="Tasks"
          value={plan.tasks.length}
          color="var(--accent-cyan)"
        />
        <StatCard
          label="Est. Time"
          value={`${plan.estimatedTotalHours}h`}
          color="var(--accent-amber)"
        />
        <StatCard
          label="Agents"
          value={uniqueAgents}
          color="var(--accent-emerald)"
        />
      </div>

      {/* Description */}
      <div className="p-4 bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)]">
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-2">
          Description
        </h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {plan.description}
        </p>
      </div>

      {/* Tech Stack */}
      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
          Technology Stack
        </h3>
        <div className="flex flex-wrap gap-2">
          {plan.techStack.map((tech) => (
            <TechBadge key={tech} tech={tech} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FeaturesTab({ plan }: { plan: GeneratedPlan }) {
  return (
    <div className="space-y-4">
      {plan.features.map((feature, index) => (
        <div
          key={feature.id}
          className="p-4 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)]"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-violet-glow)] flex items-center justify-center text-sm font-semibold text-[var(--accent-violet)]">
              {index + 1}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                {feature.name}
              </h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {feature.description}
              </p>
              <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                Phase {feature.phase}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TasksTab({ plan }: { plan: GeneratedPlan }) {
  return (
    <div className="space-y-3">
      {plan.tasks.map((task) => (
        <div
          key={task.id}
          className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase">
                  {task.id}
                </span>
                <AgentBadge agent={task.agent} />
              </div>
              <h4 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                {task.title}
              </h4>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                {task.description}
              </p>
              {task.dependencies.length > 0 && (
                <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                  Depends on: {task.dependencies.join(", ")}
                </div>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {task.estimatedHours}h
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                estimated
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PhasesTab({ plan }: { plan: GeneratedPlan }) {
  return <PhaseVisualization phases={plan.phases} />;
}

function CreationProgressOverlay({ progress }: { progress: CreationProgress }) {
  const phaseIcons: Record<CreationProgress["phase"], string> = {
    idle: "",
    creating: "📁",
    tasks: "📋",
    discovery: "🔍",
    polling: "⏳",
    done: "✅",
  };

  return (
    <div className="absolute inset-0 bg-[var(--bg-primary)]/95 backdrop-blur-sm flex items-center justify-center z-10 rounded-[var(--radius-lg)]">
      <div className="text-center p-8 max-w-md">
        <div className="text-4xl mb-4">{phaseIcons[progress.phase]}</div>
        <div className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {progress.message}
        </div>
        {progress.detail && (
          <div className="text-sm text-[var(--text-secondary)]">
            {progress.detail}
          </div>
        )}
        {progress.phase !== "done" && (
          <div className="mt-4">
            <div className="w-48 h-1 bg-[var(--bg-hover)] rounded-full overflow-hidden mx-auto">
              <div
                className="h-full bg-[var(--accent-primary)] rounded-full animate-pulse"
                style={{ width: "60%" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function PlanApprovalView({
  plan,
  onApprove,
  onModify,
  onReject,
  isApproving = false,
  creationProgress,
}: PlanApprovalViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const showProgressOverlay =
    creationProgress && creationProgress.phase !== "idle";

  const tabs: Tab[] = [
    {
      id: "overview",
      label: "Overview",
      icon: (
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
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"
          />
        </svg>
      ),
    },
    {
      id: "features",
      label: "Features",
      icon: (
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
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
      count: plan.features.length,
    },
    {
      id: "tasks",
      label: "Tasks",
      icon: (
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      count: plan.tasks.length,
    },
    {
      id: "phases",
      label: "Execution Plan",
      icon: (
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
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full relative">
      {/* Creation Progress Overlay */}
      {showProgressOverlay && (
        <CreationProgressOverlay progress={creationProgress} />
      )}

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "tab flex items-center gap-2",
              activeTab === tab.id && "active",
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-[var(--bg-hover)]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "overview" && <OverviewTab plan={plan} />}
        {activeTab === "features" && <FeaturesTab plan={plan} />}
        {activeTab === "tasks" && <TasksTab plan={plan} />}
        {activeTab === "phases" && <PhasesTab plan={plan} />}
      </div>

      {/* Action buttons */}
      <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)] flex items-center justify-between">
        <button onClick={onReject} className="btn btn-danger">
          Reject
        </button>
        <div className="flex gap-3">
          <button onClick={onModify} className="btn btn-ghost">
            Modify
          </button>
          <button
            onClick={onApprove}
            disabled={isApproving}
            className="btn btn-success disabled:opacity-50"
          >
            {isApproving ? "Creating..." : "Approve & Execute"}
          </button>
        </div>
      </div>
    </div>
  );
}
