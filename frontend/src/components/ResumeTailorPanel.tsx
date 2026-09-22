import { useEffect, useMemo, useRef, useState } from "react";
import type { TailoredResumeResponse } from "../../../lib/schemas/tailoredResume.js";
import { applyResumeSuggestions } from "../../../lib/utils/applyResumeSuggestions.js";
import { tailorResume } from "../api/tailorResume.js";
import { stripContactInfo } from "../utils/stripContactInfo.js";
import { JobDescriptionInput } from "./JobDescriptionInput.js";
import { ResumeInput, type ResumeSource } from "./ResumeInput.js";
import { TailorSuggestionCard } from "./TailorSuggestionCard.js";
import { TailoredResumePreview } from "./TailoredResumePreview.js";

export type ResumeTailorPanelProps = {
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
  resumeSource: ResumeSource;
  onResumeSourceChange: (source: ResumeSource) => void;
  pastedResume: string;
  onPastedResumeChange: (value: string) => void;
  uploadedResume: string;
  onUploadedResumeChange: (value: string) => void;
  storedResume: string;
  hasStoredResume: boolean;
  onSaveStoredResume: (text: string) => Promise<string>;
  onClearStoredResume: () => Promise<void>;
  resumeLoadError: string | null;
  onUseForCoverLetter: (tailoredResumeText: string) => void;
  onResultStaleChange: (isStale: boolean) => void;
  reTailorRequestId: number;
};
type ApplyResult = ReturnType<typeof applyResumeSuggestions>;

export function ResumeTailorPanel({
  jobDescription,
  onJobDescriptionChange,
  resumeSource,
  onResumeSourceChange,
  pastedResume,
  onPastedResumeChange,
  uploadedResume,
  onUploadedResumeChange,
  storedResume,
  hasStoredResume,
  onSaveStoredResume,
  onClearStoredResume,
  resumeLoadError,
  onUseForCoverLetter,
  onResultStaleChange,
  reTailorRequestId,
}: ResumeTailorPanelProps) {
  const [result, setResult] = useState<TailoredResumeResponse | null>(null);
  const [isTailoring, setIsTailoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeUsedForTailor, setResumeUsedForTailor] = useState<string>("");
  const [checkedChunkIds, setCheckedChunkIds] = useState<string[]>([]);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [isResultStale, setIsResultStale] = useState(false);
  const resultsOverviewRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) {
      resultsOverviewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [result]);

  useEffect(() => {
    if (applyResult) {
      previewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [applyResult?.appliedChunkIds]);

  // Mark results outdated when inputs change; do not depend on `result` so a
  // successful tailor run is not immediately flagged as stale.
  useEffect(() => {
    if (result) {
      setIsResultStale(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally ignore `result`
  }, [
    jobDescription,
    resumeSource,
    pastedResume,
    uploadedResume,
    storedResume,
  ]);

  useEffect(() => {
    onResultStaleChange(isResultStale);
  }, [isResultStale, onResultStaleChange]);

  useEffect(() => {
    return () => onResultStaleChange(false);
  }, [onResultStaleChange]);

  useEffect(() => {
    if (reTailorRequestId > 0) {
      void handleTailor();
    }
    // Only react to banner Re-tailor clicks, not handleTailor identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reTailorRequestId]);

  function confirmIfStale(message: string): boolean {
    if (!isResultStale) return true;
    return window.confirm(message);
  }

  function handleCheckboxChange(chunkId: string) {
    setCheckedChunkIds((previous) =>
      previous.includes(chunkId)
        ? previous.filter((id) => id !== chunkId)
        : [...previous, chunkId],
    );
    setApplyResult(null);
  }

  function handleApply() {
    const checkedSuggestions =
      result?.suggestions.filter((suggestion) =>
        checkedChunkIds.includes(suggestion.chunkId),
      ) ?? [];

    if (!resumeUsedForTailor || checkedSuggestions.length === 0) return;

    if (
      !confirmIfStale(
        "These results are outdated because the job description or resume changed. Apply them anyway?",
      )
    ) {
      return;
    }

    setApplyResult(
      applyResumeSuggestions(
        resumeUsedForTailor,
        result!.suggestions,
        checkedSuggestions,
      ),
    );
  }

  function handleUseForCoverLetter(tailoredResumeText: string) {
    if (
      !confirmIfStale(
        "These results are outdated because the job description or resume changed. Use this tailored resume for a cover letter anyway?",
      )
    ) {
      return;
    }

    onUseForCoverLetter(tailoredResumeText);
  }

  const activeResumeText = useMemo(() => {
    if (resumeSource === "stored") {
      return storedResume;
    }
    if (resumeSource === "upload") {
      return uploadedResume;
    }
    return pastedResume;
  }, [resumeSource, storedResume, uploadedResume, pastedResume]);

  async function handleTailor() {
    setError(null);
    setResult(null);
    setCheckedChunkIds([]);
    setApplyResult(null);
    setIsResultStale(false);

    if (!jobDescription.trim()) {
      setError("Please paste a job description.");
      return;
    }

    if (!activeResumeText.trim()) {
      setError(
        resumeSource === "stored"
          ? "Save a resume under My Resume first, or switch to Paste/Upload."
          : resumeSource === "upload"
            ? "Please upload a resume file."
            : "Please provide your resume.",
      );
      return;
    }

    setIsTailoring(true);

    try {
      const payload =
        resumeSource === "stored"
          ? { jobDescription: jobDescription.trim() }
          : {
              jobDescription: jobDescription.trim(),
              resumeText: stripContactInfo(activeResumeText),
            };

      const resumeForThisRun =
        resumeSource === "stored"
          ? storedResume
          : stripContactInfo(activeResumeText);

      const tailored = await tailorResume(payload);
      setResult(tailored);
      setCheckedChunkIds(
        tailored.suggestions
          .filter(({ action }) => action !== "keep")
          .map(({ chunkId }) => chunkId),
      );
      setResumeUsedForTailor(resumeForThisRun);
      setIsResultStale(false);
    } catch (tailorError) {
      setError(
        tailorError instanceof Error
          ? tailorError.message
          : "Something went wrong.",
      );
    } finally {
      setIsTailoring(false);
    }
  }

  const headerParts = [
    result?.roleTitle?.trim(),
    result?.companyName?.trim(),
  ].filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <JobDescriptionInput
            value={jobDescription}
            onChange={onJobDescriptionChange}
            disabled={isTailoring}
          />
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <ResumeInput
            source={resumeSource}
            onSourceChange={onResumeSourceChange}
            pastedResume={pastedResume}
            onPastedResumeChange={onPastedResumeChange}
            uploadedResume={uploadedResume}
            onUploadedResumeChange={onUploadedResumeChange}
            storedResume={storedResume}
            hasStoredResume={hasStoredResume}
            onSaveStoredResume={onSaveStoredResume}
            onClearStoredResume={onClearStoredResume}
            disabled={isTailoring}
          />

          {resumeLoadError && (
            <p className="text-sm text-red-600" role="alert">
              {resumeLoadError}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => void handleTailor()}
          disabled={isTailoring}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:mx-auto sm:block sm:max-w-md"
        >
          {isTailoring ? "Tailoring..." : "Tailor resume"}
        </button>

        {isTailoring && (
          <p className="text-center text-sm text-gray-600" role="status">
            Indexing and tailoring can take some time, usually under a minute.
          </p>
        )}

        {error && (
          <p className="text-center text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>

      {result ? (
        <div className="space-y-8">
          <section
            ref={resultsOverviewRef}
            className="scroll-mt-4 space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            aria-label="Tailoring overview"
          >
            <div>
              {headerParts.length > 0 ? (
                <h2 className="text-lg font-semibold text-gray-900">
                  {headerParts.join(" · ")}
                </h2>
              ) : (
                <h2 className="text-lg font-semibold text-gray-900">
                  Tailoring results
                </h2>
              )}
              <p className="mt-1 text-sm text-gray-600">
                {result.suggestions.length} suggestion
                {result.suggestions.length === 1 ? "" : "s"}
                {result.suggestions.length > 0
                  ? " — review the comparisons below."
                  : "."}
              </p>
            </div>

            {result.keywordsToMirror.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Keywords to mirror
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.keywordsToMirror.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 ring-1 ring-inset ring-indigo-200"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Warnings
                </h3>
                <ul className="list-disc space-y-1 pl-4 text-sm text-amber-900">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.suggestions.length === 0 && (
              <p className="text-sm text-gray-500">
                No suggestions were returned for this job description.
              </p>
            )}
          </section>

          {result.suggestions.length > 0 && (
            <section className="space-y-4" aria-label="Resume suggestions">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  Suggestion comparisons
                </h2>
                <p className="text-xs text-gray-500">
                  Red = removed from original · Green = added in suggested
                </p>
              </div>

              <div className="space-y-4">
                {result.suggestions.map((suggestion) => (
                  <TailorSuggestionCard
                    key={suggestion.chunkId}
                    suggestion={suggestion}
                    onCheckboxChange={handleCheckboxChange}
                    checked={checkedChunkIds.includes(suggestion.chunkId)}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm text-gray-600">
                  {checkedChunkIds.length} suggestion
                  {checkedChunkIds.length === 1 ? "" : "s"} selected
                </p>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={checkedChunkIds.length === 0}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Apply selected
                </button>
              </div>
            </section>
          )}

          {applyResult && (
            <div ref={previewRef} className="scroll-mt-4">
              <TailoredResumePreview
                tailoredResumeText={applyResult.tailoredResumeText}
                appliedCount={applyResult.appliedChunkIds.length}
                failedChunkIds={applyResult.failedChunkIds}
                onTextChange={(tailoredResumeText) =>
                  setApplyResult((previous) =>
                    previous ? { ...previous, tailoredResumeText } : previous,
                  )
                }
                onUseForCoverLetter={() =>
                  handleUseForCoverLetter(applyResult.tailoredResumeText)
                }
              />
            </div>
          )}
        </div>
      ) : (
        !isTailoring &&
        !error && (
          <p className="text-center text-sm text-gray-500">
            Results will appear below after you tailor your resume.
          </p>
        )
      )}
    </div>
  );
}
