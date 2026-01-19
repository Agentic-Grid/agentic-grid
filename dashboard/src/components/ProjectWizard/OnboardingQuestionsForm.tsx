import { useState, useMemo } from "react";
import { clsx } from "clsx";
import type {
  OnboardingQuestion,
  OnboardingQuestions,
} from "../../types/kanban";

interface OnboardingQuestionsFormProps {
  questions: OnboardingQuestions;
  onSaveAnswers: (answers: Record<string, string | string[] | null>) => void;
  onGeneratePlan: () => void;
  canGeneratePlan: boolean;
  isSaving: boolean;
}

function TextInput({
  question,
  value,
  onChange,
}: {
  question: OnboardingQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const isMultiline =
    question.placeholder?.includes("\n") ||
    question.id === "b7" ||
    question.id === "b8" ||
    question.id === "b9" ||
    question.id === "b10";

  if (isMultiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        className="input min-h-[100px] resize-y"
        rows={4}
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={question.placeholder}
      className="input"
    />
  );
}

function SingleSelectInput({
  question,
  value,
  onChange,
}: {
  question: OnboardingQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {question.options?.map((option) => (
        <label
          key={option.value}
          className={clsx(
            "flex items-start gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer transition-all",
            value === option.value
              ? "bg-[var(--accent-primary-glow)] border-[var(--accent-primary)] text-[var(--text-primary)]"
              : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-medium)]",
          )}
        >
          <input
            type="radio"
            name={question.id}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 accent-[var(--accent-primary)]"
          />
          <div>
            <div className="font-medium text-sm">{option.label}</div>
            {option.description && (
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {option.description}
              </div>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

function MultiSelectInput({
  question,
  value,
  onChange,
}: {
  question: OnboardingQuestion;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  return (
    <div className="space-y-2">
      {question.options?.map((option) => (
        <label
          key={option.value}
          className={clsx(
            "flex items-start gap-3 p-3 rounded-[var(--radius-md)] border cursor-pointer transition-all",
            value.includes(option.value)
              ? "bg-[var(--accent-primary-glow)] border-[var(--accent-primary)] text-[var(--text-primary)]"
              : "bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-medium)]",
          )}
        >
          <input
            type="checkbox"
            value={option.value}
            checked={value.includes(option.value)}
            onChange={() => handleToggle(option.value)}
            className="mt-1 accent-[var(--accent-primary)]"
          />
          <div>
            <div className="font-medium text-sm">{option.label}</div>
            {option.description && (
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {option.description}
              </div>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

function QuestionItem({
  question,
  value,
  onChange,
}: {
  question: OnboardingQuestion;
  value: string | string[] | null;
  onChange: (value: string | string[] | null) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {question.question}
          {question.required && (
            <span className="text-[var(--accent-rose)] ml-1">*</span>
          )}
        </span>
      </label>

      {question.type === "text" && (
        <TextInput
          question={question}
          value={(value as string) || ""}
          onChange={(v) => onChange(v || null)}
        />
      )}

      {question.type === "single_select" && (
        <SingleSelectInput
          question={question}
          value={(value as string) || ""}
          onChange={(v) => onChange(v || null)}
        />
      )}

      {question.type === "multi_select" && (
        <MultiSelectInput
          question={question}
          value={(value as string[]) || []}
          onChange={(v) => onChange(v.length > 0 ? v : null)}
        />
      )}
    </div>
  );
}

export function OnboardingQuestionsForm({
  questions,
  onSaveAnswers,
  onGeneratePlan,
  canGeneratePlan,
  isSaving,
}: OnboardingQuestionsFormProps) {
  // Get all questions from current phase
  const currentPhaseQuestions = useMemo(() => {
    if (questions.current_phase === 1) {
      return questions.phases.business.questions;
    }
    return questions.phases.features.questions;
  }, [questions]);

  // Group questions by category
  const questionsByCategory = useMemo(() => {
    const groups: Record<string, OnboardingQuestion[]> = {};
    for (const q of currentPhaseQuestions) {
      if (!groups[q.category]) {
        groups[q.category] = [];
      }
      groups[q.category].push(q);
    }
    return groups;
  }, [currentPhaseQuestions]);

  // Track local answers
  const [localAnswers, setLocalAnswers] = useState<
    Record<string, string | string[] | null>
  >(() => {
    const initial: Record<string, string | string[] | null> = {};
    for (const q of currentPhaseQuestions) {
      initial[q.id] = q.answer;
    }
    return initial;
  });

  // Calculate progress
  const progress = useMemo(() => {
    const required = currentPhaseQuestions.filter((q) => q.required);
    const answered = required.filter((q) => {
      const answer = localAnswers[q.id];
      if (answer === null || answer === undefined) return false;
      if (Array.isArray(answer)) return answer.length > 0;
      return answer.trim().length > 0;
    });
    return {
      answered: answered.length,
      total: required.length,
      percent: Math.round((answered.length / required.length) * 100),
    };
  }, [currentPhaseQuestions, localAnswers]);

  const handleAnswerChange = (
    questionId: string,
    value: string | string[] | null,
  ) => {
    setLocalAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSave = () => {
    onSaveAnswers(localAnswers);
  };

  const hasChanges = useMemo(() => {
    for (const q of currentPhaseQuestions) {
      const original = q.answer;
      const current = localAnswers[q.id];
      if (JSON.stringify(original) !== JSON.stringify(current)) {
        return true;
      }
    }
    return false;
  }, [currentPhaseQuestions, localAnswers]);

  return (
    <div className="flex flex-col">
      {/* Progress bar */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--text-secondary)]">
            Phase {questions.current_phase}:{" "}
            {questions.current_phase === 1
              ? "Business Context"
              : "Feature Details"}
          </span>
          <span className="text-sm text-[var(--text-tertiary)]">
            {progress.answered}/{progress.total} required questions
          </span>
        </div>
        <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent-primary)] transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {/* Questions */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-8">
        {Object.entries(questionsByCategory).map(
          ([category, categoryQuestions]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-4">
                {category}
              </h3>
              <div className="space-y-6">
                {categoryQuestions.map((question) => (
                  <QuestionItem
                    key={question.id}
                    question={question}
                    value={localAnswers[question.id]}
                    onChange={(value) => handleAnswerChange(question.id, value)}
                  />
                ))}
              </div>
            </div>
          ),
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <div className="text-sm text-[var(--text-tertiary)]">
          {hasChanges && "Unsaved changes"}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="btn btn-ghost disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Progress"}
          </button>
          <button
            onClick={onGeneratePlan}
            disabled={!canGeneratePlan || isSaving}
            className="btn btn-primary disabled:opacity-50"
          >
            Generate Plan
          </button>
        </div>
      </div>
    </div>
  );
}
