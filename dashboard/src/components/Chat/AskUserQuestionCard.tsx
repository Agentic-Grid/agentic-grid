/**
 * AskUserQuestionCard - Interactive UI for Claude's AskUserQuestion tool calls.
 *
 * Renders questions with selectable options and an optional custom text field.
 * When the user submits answers, they are sent back as a chat message.
 */

import { useState, useCallback } from "react";
import { clsx } from "clsx";

// Types matching the AskUserQuestion tool schema
interface QuestionOption {
  label: string;
  description: string;
}

interface Question {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

interface AskUserQuestionCardProps {
  questions: Question[];
  onSubmit?: (message: string) => void;
  isAnswered?: boolean;
}

export function AskUserQuestionCard({
  questions,
  onSubmit,
  isAnswered = false,
}: AskUserQuestionCardProps) {
  // Track selected option(s) per question index
  const [selections, setSelections] = useState<Record<number, Set<string>>>(
    () => {
      const init: Record<number, Set<string>> = {};
      questions.forEach((_, i) => {
        init[i] = new Set();
      });
      return init;
    },
  );

  // Track custom "Other" text per question index
  const [customTexts, setCustomTexts] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    questions.forEach((_, i) => {
      init[i] = "";
    });
    return init;
  });

  // Track whether "Other" is active per question
  const [otherActive, setOtherActive] = useState<Record<number, boolean>>(
    () => {
      const init: Record<number, boolean> = {};
      questions.forEach((_, i) => {
        init[i] = false;
      });
      return init;
    },
  );

  const [submitted, setSubmitted] = useState(isAnswered);

  const handleOptionToggle = useCallback(
    (questionIdx: number, optionLabel: string, multiSelect: boolean) => {
      setSelections((prev) => {
        const next = { ...prev };
        const current = new Set(prev[questionIdx]);

        if (multiSelect) {
          if (current.has(optionLabel)) {
            current.delete(optionLabel);
          } else {
            current.add(optionLabel);
          }
        } else {
          // Single select: clear and set
          current.clear();
          current.add(optionLabel);
        }

        // Deactivate "Other" when selecting a predefined option (single select only)
        if (!multiSelect) {
          setOtherActive((p) => ({ ...p, [questionIdx]: false }));
          setCustomTexts((p) => ({ ...p, [questionIdx]: "" }));
        }

        next[questionIdx] = current;
        return next;
      });
    },
    [],
  );

  const handleOtherToggle = useCallback(
    (questionIdx: number, multiSelect: boolean) => {
      setOtherActive((prev) => {
        const isNowActive = !prev[questionIdx];
        // For single select, clear predefined selections when activating Other
        if (isNowActive && !multiSelect) {
          setSelections((s) => ({ ...s, [questionIdx]: new Set() }));
        }
        return { ...prev, [questionIdx]: isNowActive };
      });
    },
    [],
  );

  const handleCustomTextChange = useCallback(
    (questionIdx: number, text: string) => {
      setCustomTexts((prev) => ({ ...prev, [questionIdx]: text }));
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (!onSubmit || submitted) return;

    // Build a formatted answer message
    const answerParts: string[] = [];

    questions.forEach((q, i) => {
      const selected = Array.from(selections[i]);
      const hasOther = otherActive[i] && customTexts[i].trim();

      if (selected.length === 0 && !hasOther) return;

      const answers: string[] = [...selected];
      if (hasOther) {
        answers.push(customTexts[i].trim());
      }

      if (questions.length === 1) {
        // Single question: just send the answer directly
        answerParts.push(answers.join(", "));
      } else {
        // Multiple questions: label each
        answerParts.push(`${q.header}: ${answers.join(", ")}`);
      }
    });

    if (answerParts.length > 0) {
      onSubmit(answerParts.join("\n"));
      setSubmitted(true);
    }
  }, [onSubmit, submitted, questions, selections, otherActive, customTexts]);

  // Check if at least one question has an answer
  const hasAnyAnswer = questions.some((_, i) => {
    return (
      selections[i].size > 0 ||
      (otherActive[i] && customTexts[i].trim().length > 0)
    );
  });

  if (submitted) {
    return (
      <div className="px-3 pb-3 pt-1">
        <div className="flex items-center gap-2 text-xs text-[var(--accent-emerald)]">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>Answered</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 pt-1 space-y-4">
      {questions.map((q, qIdx) => (
        <div key={qIdx} className="space-y-2">
          {/* Question header chip + text */}
          <div className="flex items-start gap-2">
            <span className="shrink-0 mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
              {q.header}
            </span>
            <p className="text-sm text-[var(--text-primary)] leading-snug">
              {q.question}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-1.5 pl-1">
            {q.options.map((opt) => {
              const isSelected = selections[qIdx].has(opt.label);
              return (
                <button
                  key={opt.label}
                  onClick={() =>
                    handleOptionToggle(qIdx, opt.label, q.multiSelect)
                  }
                  className={clsx(
                    "w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150",
                    "border",
                    isSelected
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/8 shadow-[0_0_8px_var(--accent-primary-glow)]"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--bg-hover)]",
                  )}
                >
                  {/* Radio/Checkbox indicator */}
                  <div
                    className={clsx(
                      "shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center transition-colors",
                      q.multiSelect ? "rounded" : "rounded-full",
                      isSelected
                        ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
                        : "border-2 border-[var(--border-default)] bg-transparent",
                    )}
                  >
                    {isSelected && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className={clsx(
                        "text-sm font-medium",
                        isSelected
                          ? "text-[var(--accent-primary)]"
                          : "text-[var(--text-primary)]",
                      )}
                    >
                      {opt.label}
                    </div>
                    {opt.description && (
                      <div className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
                        {opt.description}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {/* "Other" option */}
            <button
              onClick={() => handleOtherToggle(qIdx, q.multiSelect)}
              className={clsx(
                "w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150",
                "border",
                otherActive[qIdx]
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/8 shadow-[0_0_8px_var(--accent-primary-glow)]"
                  : "border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--bg-hover)]",
              )}
            >
              <div
                className={clsx(
                  "shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center transition-colors",
                  q.multiSelect ? "rounded" : "rounded-full",
                  otherActive[qIdx]
                    ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
                    : "border-2 border-[var(--border-default)] bg-transparent",
                )}
              >
                {otherActive[qIdx] && (
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span
                className={clsx(
                  "text-sm font-medium",
                  otherActive[qIdx]
                    ? "text-[var(--accent-primary)]"
                    : "text-[var(--text-tertiary)]",
                )}
              >
                Other
              </span>
            </button>

            {/* Custom text field when "Other" is active */}
            {otherActive[qIdx] && (
              <div className="pl-6 pt-1">
                <input
                  type="text"
                  value={customTexts[qIdx]}
                  onChange={(e) =>
                    handleCustomTextChange(qIdx, e.target.value)
                  }
                  placeholder="Type your answer..."
                  className={clsx(
                    "w-full px-3 py-2 rounded-lg text-sm transition-all",
                    "bg-[var(--bg-primary)] border border-[var(--border-subtle)]",
                    "text-[var(--text-primary)] placeholder-[var(--text-tertiary)]",
                    "focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_8px_var(--accent-primary-glow)]",
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && hasAnyAnswer) {
                      handleSubmit();
                    }
                  }}
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!hasAnyAnswer}
        className={clsx(
          "w-full py-2 rounded-xl text-sm font-medium transition-all duration-200",
          hasAnyAnswer
            ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary-dim)] text-white shadow-[0_2px_12px_var(--accent-primary-glow)] hover:shadow-[0_4px_20px_var(--accent-primary-glow)] active:scale-[0.98]"
            : "bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed",
        )}
      >
        Submit Answer{questions.length > 1 ? "s" : ""}
      </button>
    </div>
  );
}
