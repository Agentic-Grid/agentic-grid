import { useState, useEffect } from "react";
import { clsx } from "clsx";
import {
  getInstalledResources,
  addHook,
  removeHook,
  addPermission,
  removePermission,
  type Resource,
} from "../../services/api";

type ConfigSection = "hooks" | "permissions";

const hookEvents = [
  { value: "user-prompt-submit", label: "User Prompt Submit" },
  { value: "stop", label: "Stop" },
  { value: "pre-tool-use", label: "Pre Tool Use" },
  { value: "post-tool-use", label: "Post Tool Use" },
  { value: "notification", label: "Notification" },
  { value: "shell-command", label: "Shell Command" },
  { value: "subagent-spawn", label: "Subagent Spawn" },
  { value: "subagent-complete", label: "Subagent Complete" },
];

export function ConfigureTab() {
  const [section, setSection] = useState<ConfigSection>("hooks");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  // Hook form
  const [hookEvent, setHookEvent] = useState("");
  const [hookCommand, setHookCommand] = useState("");
  const [hookBackground, setHookBackground] = useState(false);
  const [addingHook, setAddingHook] = useState(false);

  // Permission form
  const [permPattern, setPermPattern] = useState("");
  const [permAction, setPermAction] = useState<"allow" | "deny">("allow");
  const [addingPerm, setAddingPerm] = useState(false);

  useEffect(() => {
    loadResources();
  }, []);

  async function loadResources() {
    try {
      setLoading(true);
      const response = await getInstalledResources();
      setResources(response.data.resources);
    } catch (err) {
      console.error("Failed to load resources:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter hooks and permissions from resources
  const hooks = resources.filter((r) => r.type === "hook");
  const permissions = resources.filter((r) => r.type === "permission");

  async function handleAddHook() {
    if (!hookEvent || !hookCommand) {
      alert("Event and command are required");
      return;
    }

    try {
      setAddingHook(true);
      await addHook(hookEvent, hookCommand, hookBackground);
      setHookEvent("");
      setHookCommand("");
      setHookBackground(false);
      await loadResources();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add hook";
      alert(message);
    } finally {
      setAddingHook(false);
    }
  }

  async function handleRemoveHook(event: string, index: number) {
    if (!confirm("Remove this hook?")) return;

    try {
      await removeHook(event, index);
      await loadResources();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove hook";
      alert(message);
    }
  }

  async function handleAddPermission() {
    if (!permPattern) {
      alert("Pattern is required");
      return;
    }

    try {
      setAddingPerm(true);
      await addPermission(permPattern, permAction);
      setPermPattern("");
      await loadResources();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add permission";
      alert(message);
    } finally {
      setAddingPerm(false);
    }
  }

  async function handleRemovePermission(pattern: string, action: "allow" | "deny") {
    if (!confirm("Remove this permission?")) return;

    try {
      await removePermission(pattern, action);
      await loadResources();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to remove permission";
      alert(message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-pulse">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Section Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSection("hooks")}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            section === "hooks"
              ? "bg-[var(--accent-primary)] text-white"
              : "glass hover:bg-[var(--bg-tertiary)]",
          )}
        >
          Hooks ({hooks.length})
        </button>
        <button
          onClick={() => setSection("permissions")}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            section === "permissions"
              ? "bg-[var(--accent-primary)] text-white"
              : "glass hover:bg-[var(--bg-tertiary)]",
          )}
        >
          Permissions ({permissions.length})
        </button>
      </div>

      {/* Hooks Section */}
      {section === "hooks" && (
        <div className="space-y-6">
          {/* Add Hook Form */}
          <div className="card p-4">
            <h3 className="font-medium mb-4">Add New Hook</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Event</label>
                <select
                  value={hookEvent}
                  onChange={(e) => setHookEvent(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]"
                >
                  <option value="">Select event...</option>
                  {hookEvents.map((evt) => (
                    <option key={evt.value} value={evt.value}>
                      {evt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Command</label>
                <input
                  type="text"
                  value={hookCommand}
                  onChange={(e) => setHookCommand(e.target.value)}
                  placeholder="echo 'Hello'"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]"
                />
              </div>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hookBackground}
                    onChange={(e) => setHookBackground(e.target.checked)}
                    className="rounded border-[var(--border-subtle)]"
                  />
                  Run in background
                </label>
                <button
                  onClick={handleAddHook}
                  disabled={addingHook}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {addingHook ? "Adding..." : "Add Hook"}
                </button>
              </div>
            </div>
          </div>

          {/* Hooks List */}
          {hooks.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-tertiary)]">
              No hooks configured
            </div>
          ) : (
            <div className="space-y-2">
              {hooks.map((hook, index) => (
                <div
                  key={hook.id}
                  className="card p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <span className="px-2 py-1 text-xs rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                      {(hook as any).event}
                    </span>
                    <code className="text-sm text-[var(--text-primary)]">
                      {(hook as any).command}
                    </code>
                    {(hook as any).runInBackground && (
                      <span className="text-xs text-[var(--text-tertiary)]">
                        (background)
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveHook((hook as any).event, index)}
                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Permissions Section */}
      {section === "permissions" && (
        <div className="space-y-6">
          {/* Add Permission Form */}
          <div className="card p-4">
            <h3 className="font-medium mb-4">Add New Permission</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Pattern</label>
                <input
                  type="text"
                  value={permPattern}
                  onChange={(e) => setPermPattern(e.target.value)}
                  placeholder="Bash(npm:*)"
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Action</label>
                <select
                  value={permAction}
                  onChange={(e) => setPermAction(e.target.value as "allow" | "deny")}
                  className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]"
                >
                  <option value="allow">Allow</option>
                  <option value="deny">Deny</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddPermission}
                  disabled={addingPerm}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {addingPerm ? "Adding..." : "Add Permission"}
                </button>
              </div>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">
              Examples: <code>Bash(npm:*)</code>, <code>Read(/path/to/file)</code>, <code>Write</code>
            </p>
          </div>

          {/* Permissions List */}
          {permissions.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-tertiary)]">
              No permissions configured
            </div>
          ) : (
            <div className="space-y-2">
              {permissions.map((perm) => {
                const isAllow = (perm as any).action === "allow";
                return (
                  <div
                    key={perm.id}
                    className="card p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={clsx(
                          "px-2 py-1 text-xs rounded",
                          isAllow
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400",
                        )}
                      >
                        {isAllow ? "ALLOW" : "DENY"}
                      </span>
                      <code className="text-sm text-[var(--text-primary)]">
                        {(perm as any).pattern}
                      </code>
                    </div>
                    <button
                      onClick={() =>
                        handleRemovePermission(
                          (perm as any).pattern,
                          (perm as any).action,
                        )
                      }
                      className="p-1 text-[var(--text-tertiary)] hover:text-[var(--accent-rose)] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
