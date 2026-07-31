import { useState } from "react";

type CopyStatus = "idle" | "copied" | "error";

type TailoredResumePreviewProps = {
  tailoredResumeText: string;
  appliedCount: number;
  failedChunkIds: string[];
  onTextChange: (value: string) => void;
  onUseForCoverLetter: () => void;
};

export function TailoredResumePreview({
  tailoredResumeText,
  appliedCount,
  failedChunkIds,
  onTextChange,
  onUseForCoverLetter,
}: TailoredResumePreviewProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(tailoredResumeText);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <section
      className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      aria-label="Tailored resume preview"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Tailored resume preview
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {appliedCount} suggestion{appliedCount === 1 ? "" : "s"} applied.
            Review and edit the text before using it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-50"
          >
            {copyStatus === "copied" ? "Copied!" : "Copy tailored resume"}
          </button>
          <button
            type="button"
            onClick={onUseForCoverLetter}
            disabled={!tailoredResumeText.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Use for cover letter
          </button>
        </div>
      </div>

      {failedChunkIds.length > 0 && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 p-3"
          role="alert"
        >
          <p className="text-sm font-medium text-amber-900">
            Could not apply {failedChunkIds.length} suggestion
            {failedChunkIds.length === 1 ? "" : "s"}:
          </p>
          <p className="mt-1 text-sm text-amber-800">
            {failedChunkIds.join(", ")}
          </p>
        </div>
      )}

      {copyStatus === "error" && (
        <p className="text-sm text-red-600" role="alert">
          Could not copy to clipboard. Please select and copy manually.
        </p>
      )}

      <textarea
        value={tailoredResumeText}
        onChange={(event) => {
          setCopyStatus("idle");
          onTextChange(event.target.value);
        }}
        rows={24}
        aria-label="Editable tailored resume text"
        className="min-h-96 w-full resize-y rounded-lg border border-gray-300 bg-white p-4 font-mono text-sm leading-relaxed text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none"
      />
    </section>
  );
}
