import { clsx } from "clsx";
import type { ExecutionPhase, AgentType } from "../../types/wizard";
import { AGENT_COLORS } from "../../types/wizard";

interface PhaseVisualizationProps {
  phases: ExecutionPhase[];
}

function AgentCard({
  agent,
}: {
  agent: { type: AgentType; tasks: string[]; taskCount: number };
}) {
  const colors = AGENT_COLORS[agent.type];

  return (
    <div
      className="min-w-[140px] max-w-[180px] p-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-default)] transition-colors"
      style={{ borderLeftWidth: "3px", borderLeftColor: colors.color }}
    >
      <div
        className="text-xs font-semibold uppercase tracking-[0.05em] mb-1"
        style={{ color: colors.color }}
      >
        {agent.type}
      </div>
      <div className="text-[10px] text-[var(--text-muted)] mb-1">
        {agent.taskCount} {agent.taskCount === 1 ? "task" : "tasks"}
      </div>
      <div className="text-[10px] text-[var(--text-tertiary)] max-h-[60px] overflow-hidden">
        {agent.tasks.slice(0, 3).map((task, i) => (
          <div key={i} className="truncate">
            {task}
          </div>
        ))}
        {agent.tasks.length > 3 && (
          <div className="text-[var(--text-muted)]">
            +{agent.tasks.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseRow({
  phase,
  isLast,
}: {
  phase: ExecutionPhase;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-4">
      {/* Phase indicator */}
      <div className="flex flex-col items-center flex-shrink-0 w-10">
        <div className="w-10 h-10 rounded-full bg-[var(--bg-hover)] flex items-center justify-center text-[var(--text-secondary)] font-semibold text-base">
          {phase.number}
        </div>
        {!isLast && (
          <div className="flex-1 w-0.5 bg-[var(--border-subtle)] my-2" />
        )}
      </div>

      {/* Phase content */}
      <div className="flex-1 pb-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-base font-semibold text-[var(--text-primary)]">
            {phase.name}
          </span>
          <span
            className={clsx(
              "px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-full",
              phase.parallel
                ? "bg-[var(--accent-cyan-glow)] text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30"
                : "bg-[var(--bg-hover)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]",
            )}
          >
            {phase.parallel ? "Parallel" : "Sequential"}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {phase.agents.map((agent, index) => (
            <AgentCard key={`${agent.type}-${index}`} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PhaseVisualization({ phases }: PhaseVisualizationProps) {
  return (
    <div className="space-y-0">
      {phases.map((phase, index) => (
        <PhaseRow
          key={phase.number}
          phase={phase}
          isLast={index === phases.length - 1}
        />
      ))}
    </div>
  );
}
