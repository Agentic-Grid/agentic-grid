import { useState, useEffect } from "react";
import { clsx } from "clsx";
import type { Webhook, WebhookEvent } from "../../types";
import {
  getWebhooks,
  createWebhook,
  deleteWebhook,
  updateWebhook,
  testWebhook,
} from "../../services/api";

const eventLabels: Record<WebhookEvent, string> = {
  "session.created": "Session Created",
  "session.completed": "Session Completed",
  "session.error": "Session Error",
  "tool.called": "Tool Called",
  "message.received": "Message Received",
};

export function WebhooksView() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    url: "",
    events: [] as WebhookEvent[],
    secret: "",
    enabled: true,
  });

  useEffect(() => {
    loadWebhooks();
  }, []);

  async function loadWebhooks() {
    try {
      const response = await getWebhooks();
      setWebhooks(response.data);
    } catch (err) {
      console.error("Failed to load webhooks:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newWebhook.name.trim() || !newWebhook.url.trim()) {
      alert("Name and URL are required");
      return;
    }

    if (newWebhook.events.length === 0) {
      alert("Select at least one event");
      return;
    }

    try {
      await createWebhook(newWebhook);
      await loadWebhooks();
      setShowCreate(false);
      setNewWebhook({
        name: "",
        url: "",
        events: [],
        secret: "",
        enabled: true,
      });
    } catch (err: any) {
      alert(`Failed to create: ${err.message}`);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this webhook?")) return;

    try {
      await deleteWebhook(id);
      await loadWebhooks();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  }

  async function handleToggle(webhook: Webhook) {
    try {
      await updateWebhook(webhook.id, { enabled: !webhook.enabled });
      await loadWebhooks();
    } catch (err: any) {
      alert(`Failed to update: ${err.message}`);
    }
  }

  async function handleTest(webhook: Webhook) {
    setTesting(webhook.id);
    try {
      const result = await testWebhook(webhook.url, webhook.secret);
      if (result.data.success) {
        alert(`Test successful! Status: ${result.data.status}`);
      } else {
        alert(
          `Test failed! Status: ${result.data.status} ${result.data.statusText}`,
        );
      }
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    } finally {
      setTesting(null);
    }
  }

  function toggleEvent(event: WebhookEvent) {
    setNewWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="loading-pulse">Loading webhooks...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold mb-1">Webhooks</h1>
          <p className="text-sm text-[var(--text-tertiary)]">
            Get notified when events happen
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2"
        >
          <span>+</span>
          <span>New Webhook</span>
        </button>
      </div>

      {/* Webhook list */}
      <div className="flex-1 overflow-y-auto p-6">
        {webhooks.length === 0 ? (
          <div className="text-center text-[var(--text-tertiary)] py-12">
            <div className="text-4xl mb-4">🔔</div>
            <p>No webhooks configured</p>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="card p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={clsx(
                      "w-3 h-3 rounded-full mt-1.5",
                      webhook.enabled
                        ? "bg-[var(--accent-emerald)]"
                        : "bg-[var(--text-tertiary)]",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{webhook.name}</h3>
                    <p className="text-sm text-[var(--text-tertiary)] truncate">
                      {webhook.url}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          className="text-xs px-2 py-0.5 rounded bg-[var(--bg-tertiary)]"
                        >
                          {eventLabels[event]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(webhook)}
                      disabled={testing === webhook.id}
                      className="text-sm text-[var(--accent-cyan)] hover:underline disabled:opacity-50"
                    >
                      {testing === webhook.id ? "Testing..." : "Test"}
                    </button>
                    <button
                      onClick={() => handleToggle(webhook)}
                      className={clsx(
                        "text-sm hover:underline",
                        webhook.enabled
                          ? "text-[var(--accent-amber)]"
                          : "text-[var(--accent-emerald)]",
                      )}
                    >
                      {webhook.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => handleDelete(webhook.id)}
                      className="text-sm text-[var(--accent-rose)] hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div
            className="modal-content w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">Create New Webhook</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input
                  type="text"
                  value={newWebhook.name}
                  onChange={(e) =>
                    setNewWebhook({ ...newWebhook, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] outline-none focus:border-[var(--accent-primary)]"
                  placeholder="My Webhook"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">URL</label>
                <input
                  type="url"
                  value={newWebhook.url}
                  onChange={(e) =>
                    setNewWebhook({ ...newWebhook, url: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] outline-none focus:border-[var(--accent-primary)]"
                  placeholder="https://example.com/webhook"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Secret (optional)</label>
                <input
                  type="text"
                  value={newWebhook.secret}
                  onChange={(e) =>
                    setNewWebhook({ ...newWebhook, secret: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] outline-none focus:border-[var(--accent-primary)]"
                  placeholder="HMAC secret for signing"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Events</label>
                <div className="space-y-2">
                  {(Object.keys(eventLabels) as WebhookEvent[]).map((event) => (
                    <label
                      key={event}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="rounded"
                      />
                      <span className="text-sm">{eventLabels[event]}</span>
                    </label>
                  ))}
                </div>
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
