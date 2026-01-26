import { useState } from "react";
import { clsx } from "clsx";
import type { MarketplaceEntry, ConfigField } from "../../services/api";

interface InstallModalProps {
  resource: MarketplaceEntry;
  onClose: () => void;
  onInstall: (config: Record<string, string>) => void;
}

export function InstallModal({ resource, onClose, onInstall }: InstallModalProps) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [installing, setInstalling] = useState(false);

  const fields = resource.configSchema?.fields || [];

  function handleChange(field: ConfigField, value: string) {
    setConfig((prev) => ({ ...prev, [field.name]: value }));
    // Clear error when user types
    if (errors[field.name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field.name];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    for (const field of fields) {
      if (field.required && !config[field.name]?.trim()) {
        newErrors[field.name] = `${field.label} is required`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleInstall() {
    if (!validate()) return;

    setInstalling(true);
    try {
      await onInstall(config);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-secondary)] rounded-xl w-full max-w-md window-glow-strong">
        {/* Header with glass reflection */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between window-header-glass">
          <h2 className="text-lg font-semibold">Install {resource.name}</h2>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--text-tertiary)]">
            This resource requires configuration. Please fill in the required fields below.
          </p>

          {/* Warning */}
          {resource.warning && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
              {resource.warning}
            </div>
          )}

          {/* Config Fields */}
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {field.description && (
                <p className="text-xs text-[var(--text-tertiary)] mb-2">
                  {field.description}
                </p>
              )}

              {field.type === "select" ? (
                <select
                  value={config[field.name] || ""}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className={clsx(
                    "w-full px-3 py-2 bg-[var(--bg-tertiary)] border rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]",
                    errors[field.name]
                      ? "border-red-500"
                      : "border-[var(--border-subtle)]",
                  )}
                >
                  <option value="">Select...</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === "password" ? "password" : "text"}
                  value={config[field.name] || ""}
                  onChange={(e) => handleChange(field, e.target.value)}
                  placeholder={field.placeholder}
                  className={clsx(
                    "w-full px-3 py-2 bg-[var(--bg-tertiary)] border rounded-lg focus:outline-none focus:border-[rgba(100,180,255,0.7)] focus:shadow-[0_0_8px_rgba(100,180,255,0.5)]",
                    errors[field.name]
                      ? "border-red-500"
                      : "border-[var(--border-subtle)]",
                  )}
                />
              )}

              {errors[field.name] && (
                <p className="text-xs text-red-400 mt-1">{errors[field.name]}</p>
              )}

              {field.envVar && (
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Environment variable: <code className="text-[var(--accent-primary)]">{field.envVar}</code>
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg glass hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInstall}
            disabled={installing}
            className={clsx(
              "px-4 py-2 text-sm rounded-lg btn-primary transition-colors",
              installing && "opacity-50 cursor-not-allowed",
            )}
          >
            {installing ? "Installing..." : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}
