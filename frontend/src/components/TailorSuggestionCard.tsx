import { useState } from "react";
import type { TailoredResumeSuggestion } from "../../../lib/schemas/tailoredResume.js";
import { copyResumeSuggestion } from "../utils/copyResumeSuggestion.js";
import {
  renderOriginalDiff,
  renderSuggestedDiff,
} from "../utils/diffResumeText.js";

const ACTION_STYLES: Record<TailoredResumeSuggestion["action"], string> = {
  rewrite: "bg-amber-50 text-amber-800 ring-amber-200",
  emphasize: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  keep: "bg-gray-100 text-gray-700 ring-gray-200",
  drop: "bg-red-50 text-red-800 ring-red-200",
};

function formatSection(section: string): string {
  return section.charAt(0).toUpperCase() + section.slice(1);
}

type TailorSuggestionCardProps = {
  suggestion: TailoredResumeSuggestion;
  onCheckboxChange: (chunkId: string) => void;
  checked: boolean;
};

export function TailorSuggestionCard({
  suggestion,
  onCheckboxChange,
  checked,
}: TailorSuggestionCardProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  async function handleCopy() {
    try {
      await copyResumeSuggestion(suggestion.suggestedText, suggestion.section);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
    }
  }

  const showDiff = suggestion.action !== "keep";

  return (
    <article className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              onChange={() => onCheckboxChange(suggestion.chunkId)}
              checked={checked}
              aria-label={`Select ${formatSection(suggestion.section)} suggestion`}
              disabled={suggestion.action === "keep"}
            />
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {formatSection(suggestion.section)}
          </span>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ACTION_STYLES[suggestion.action]}`}
          >
            {
              // capitalize first letter of the action
              suggestion.action.replace(/^./, (c: string) => c.toUpperCase())
            }
          </span>
        </div>
        {suggestion.experienceContext && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-base font-semibold text-gray-900">
                {suggestion.experienceContext.title}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-700">
                {suggestion.experienceContext.company} •{" "}
                {suggestion.experienceContext.location}
              </span>
              <span className="text-xs text-gray-500">
                {suggestion.experienceContext.dates}
              </span>
            </div>
          </>
        )}
        {suggestion.projectContext && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-base font-semibold text-gray-900">
                {suggestion.projectContext.name}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-700">
                {suggestion.projectContext.projectType} •{" "}
                {suggestion.projectContext.techStack}
              </span>
              <span className="text-xs text-gray-500">
                {suggestion.projectContext.year}
              </span>
            </div>
          </>
        )}
      </div>
      <p className="text-sm text-gray-600">{suggestion.rationale}</p>

      {copyStatus === "error" && (
        <p className="text-sm text-red-600" role="alert">
          Could not copy to clipboard. Please select and copy manually.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Original
          </h3>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
            {showDiff
              ? renderOriginalDiff(
                  suggestion.originalText,
                  suggestion.suggestedText,
                )
              : suggestion.originalText}
          </div>
        </div>

        <div className="min-w-0 space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Suggested
          </h3>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
            {showDiff
              ? renderSuggestedDiff(
                  suggestion.originalText,
                  suggestion.suggestedText,
                )
              : suggestion.suggestedText}
          </div>
        </div>
      </div>
      {suggestion.action !== "keep" && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="shrink-0 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
          >
            {copyStatus === "copied" ? "Copied!" : "Copy suggested"}
          </button>
        </div>
      )}
    </article>
  );
}
