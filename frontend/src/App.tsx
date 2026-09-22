import { useState } from "react";
import { CoverLetterPanel } from "./components/CoverLetterPanel.js";
import type { ResumeSource } from "./components/ResumeInput.js";
import { ResumeTailorPanel } from "./components/ResumeTailorPanel.js";
import { useApplicantInfo } from "./hooks/useApplicantInfo.js";
import { useStoredResume } from "./hooks/useStoredResume.js";

type AppTab = "resume-tailor" | "cover-letter";
type ResumeDraft = {
  source: ResumeSource;
  pastedResume: string;
  uploadedResume: string;
};

const EMPTY_RESUME_DRAFT: ResumeDraft = {
  source: "paste",
  pastedResume: "",
  uploadedResume: "",
};

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("resume-tailor");
  const [jobDescription, setJobDescription] = useState("");
  const [tailorResumeDraft, setTailorResumeDraft] =
    useState<ResumeDraft>(EMPTY_RESUME_DRAFT);
  const [coverLetterResumeDraft, setCoverLetterResumeDraft] =
    useState<ResumeDraft>(EMPTY_RESUME_DRAFT);
  const [isTailorResultStale, setIsTailorResultStale] = useState(false);
  const [reTailorRequestId, setReTailorRequestId] = useState(0);

  const {
    storedResume,
    hasStoredResume,
    isLoaded: isResumeLoaded,
    loadError: resumeLoadError,
    saveResume,
    clearResume,
  } = useStoredResume();

  const {
    applicant,
    isLoaded: isApplicantLoaded,
    loadError: applicantLoadError,
    refreshApplicant,
    syncApplicantFromResume,
  } = useApplicantInfo();

  async function handleResumeSaved(rawText: string) {
    const sanitized = await saveResume(rawText);
    await refreshApplicant();
    return sanitized;
  }

  async function handleResumeCleared() {
    await clearResume();
    await refreshApplicant();
  }

  function handleUseForCoverLetter(tailoredResumeText: string) {
    setCoverLetterResumeDraft((previous) => ({
      ...previous,
      source: "paste",
      pastedResume: tailoredResumeText,
    }));
    setActiveTab("cover-letter");
  }

  if (!isResumeLoaded || !isApplicantLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm text-gray-600">
        Loading...
      </div>
    );
  }

  const commonInputProps = {
    jobDescription,
    onJobDescriptionChange: setJobDescription,
    storedResume,
    hasStoredResume,
    onSaveStoredResume: handleResumeSaved,
    onClearStoredResume: handleResumeCleared,
    resumeLoadError,
  };

  const tailorInputProps = {
    ...commonInputProps,
    resumeSource: tailorResumeDraft.source,
    onResumeSourceChange: (source: ResumeSource) =>
      setTailorResumeDraft((previous) => ({ ...previous, source })),
    pastedResume: tailorResumeDraft.pastedResume,
    onPastedResumeChange: (pastedResume: string) =>
      setTailorResumeDraft((previous) => ({ ...previous, pastedResume })),
    uploadedResume: tailorResumeDraft.uploadedResume,
    onUploadedResumeChange: (uploadedResume: string) =>
      setTailorResumeDraft((previous) => ({ ...previous, uploadedResume })),
  };

  const coverLetterInputProps = {
    ...commonInputProps,
    resumeSource: coverLetterResumeDraft.source,
    onResumeSourceChange: (source: ResumeSource) =>
      setCoverLetterResumeDraft((previous) => ({ ...previous, source })),
    pastedResume: coverLetterResumeDraft.pastedResume,
    onPastedResumeChange: (pastedResume: string) =>
      setCoverLetterResumeDraft((previous) => ({ ...previous, pastedResume })),
    uploadedResume: coverLetterResumeDraft.uploadedResume,
    onUploadedResumeChange: (uploadedResume: string) =>
      setCoverLetterResumeDraft((previous) => ({
        ...previous,
        uploadedResume,
      })),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div
          className={`mx-auto px-4 py-4 sm:px-6 ${
            activeTab === "resume-tailor" ? "max-w-7xl" : "max-w-6xl"
          }`}
        >
          <h1 className="text-2xl font-bold text-gray-900">
            Job Application Assistant
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Generate cover letters and tailor your resume for each role.
          </p>

          <div
            className="mt-4 flex gap-1 border-b border-gray-200"
            role="tablist"
            aria-label="Application tools"
          >
            <TabButton
              id="resume-tailor"
              label="Resume Tailor"
              active={activeTab === "resume-tailor"}
              onSelect={setActiveTab}
            />
            <TabButton
              id="cover-letter"
              label="Cover Letter"
              active={activeTab === "cover-letter"}
              onSelect={setActiveTab}
            />
          </div>
        </div>

        {activeTab === "resume-tailor" && isTailorResultStale && (
          <div
            className="border-t border-b border-amber-200 bg-amber-50"
            role="status"
          >
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
              <p className="text-sm text-amber-900">
                <span className="font-medium">Results are outdated.</span> Job
                description or resume changed since this run.
              </p>
              <button
                type="button"
                onClick={() => setReTailorRequestId((id) => id + 1)}
                className="shrink-0 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
              >
                Re-tailor
              </button>
            </div>
          </div>
        )}
      </header>

      <main
        className={`mx-auto px-4 py-8 sm:px-6 ${
          activeTab === "resume-tailor" ? "max-w-7xl" : "max-w-6xl"
        }`}
      >
        <div hidden={activeTab !== "resume-tailor"}>
          <ResumeTailorPanel
            {...tailorInputProps}
            onUseForCoverLetter={handleUseForCoverLetter}
            onResultStaleChange={setIsTailorResultStale}
            reTailorRequestId={reTailorRequestId}
          />
        </div>
        <div hidden={activeTab !== "cover-letter"}>
          <CoverLetterPanel
            {...coverLetterInputProps}
            applicantLoadError={applicantLoadError}
            applicant={applicant}
            refreshApplicant={refreshApplicant}
            syncApplicantFromResume={syncApplicantFromResume}
          />
        </div>
      </main>
    </div>
  );
}

function TabButton({
  id,
  label,
  active,
  onSelect,
}: {
  id: AppTab;
  label: string;
  active: boolean;
  onSelect: (tab: AppTab) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={() => onSelect(id)}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-indigo-600 text-indigo-700"
          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

export default App;
