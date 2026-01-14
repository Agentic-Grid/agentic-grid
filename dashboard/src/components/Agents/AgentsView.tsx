import { useState, useEffect } from "react";
import type { Agent, AgentDomain } from "../../types";
import { getAgents, createAgent, deleteAgent } from "../../services/api";

const domainLabels: Record<AgentDomain, string> = {
  development: "Development",
  research: "Research",
  trading: "Trading",
  social: "Social",
  general: "General",
};

const domainIcons: Record<AgentDomain, string> = {
  development: "💻",
  research: "🔬",
  trading: "📈",
  social: "📱",
  general: "🤖",
};

export function AgentsView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    domain: "general" as AgentDomain,
    systemPrompt: "",
    tools: [] as string[],
    allowedCommands: [] as string[],
  });

  useEffect(() => {
    loadAgents();
  }, []);

  async function loadAgents() {
    try {
      const response = await getAgents();
      setAgents(response.data);
    } catch (err) {
      console.error("Failed to load agents:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newAgent.name.trim()) {
      alert("Name is required");
      return;
    }

    try {
      await createAgent(newAgent);
      await loadAgents();
      setShowCreate(false);
      setNewAgent({
        name: "",
        description: "",
        domain: "general",
        systemPrompt: "",
        tools: [],
        allowedCommands: [],
      });
    } catch (err: any) {
      alert(`Failed to create: ${err.message}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this agent?")) return;

    try {
      await deleteAgent(id);
      await loadAgents();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-pulse">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold mb-1">Custom Agents</h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            Create specialized agents for different domains
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2"
        >
          <span>+</span>
          <span>New Agent</span>
        </button>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.id} className="card p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{domainIcons[agent.domain]}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{agent.name}</h3>
                  <p className="text-sm text-[var(--text-tertiary)] line-clamp-2">
                    {agent.description || "No description"}
                  </p>
                </div>
              </div>

              <div className="text-xs text-[var(--text-tertiary)]">
                <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)]">
                  {domainLabels[agent.domain]}
                </span>
              </div>

              {agent.systemPrompt && (
                <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-2 rounded line-clamp-2">
                  {agent.systemPrompt}
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-xs text-[var(--text-tertiary)]">
                  {agent.tools.length} tools
                </span>
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="text-xs text-[var(--accent-rose)] hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div
            className="modal-content w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">Create New Agent</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] outline-none focus:border-[var(--accent-primary)]"
                  placeholder="My Agent"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Domain</label>
                <select
                  value={newAgent.domain}
                  onChange={(e) =>
                    setNewAgent({
                      ...newAgent,
                      domain: e.target.value as AgentDomain,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] outline-none focus:border-[var(--accent-primary)]"
                >
                  {Object.entries(domainLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {domainIcons[value as AgentDomain]} {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Description</label>
                <input
                  type="text"
                  value={newAgent.description}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] outline-none focus:border-[var(--accent-primary)]"
                  placeholder="What this agent does..."
                />
              </div>

              <div>
                <label className="block text-sm mb-1">System Prompt</label>
                <textarea
                  value={newAgent.systemPrompt}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, systemPrompt: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] outline-none focus:border-[var(--accent-primary)] resize-none"
                  placeholder="Custom instructions for this agent..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="btn-primary px-4 py-2 rounded-lg"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
