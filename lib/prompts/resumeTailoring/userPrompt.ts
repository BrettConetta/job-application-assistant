import type { TailorResumeInput } from "../types.js";

export function buildTailorResumeUserPrompt(input: TailorResumeInput): string {
  const { jobDescription, chunks } = input;

  const chunksJson = JSON.stringify(
    chunks.map((chunk) => ({
      id: chunk.id,
      section: chunk.section,
      text: chunk.text,
      experienceContext: chunk.experienceContext,
      projectContext: chunk.projectContext,
    })),
    null,
    2,
  );

  return `<job_description>
${jobDescription.trim()}
</job_description>

<resume_chunks>
${chunksJson}
</resume_chunks>

Using only the resume chunks above, produce ATS-friendly tailoring suggestions for this job description.
Return exactly one suggestion per chunk. For experience chunks, originalText and suggestedText must be bullet/body lines only (omit company, role title, location, and date headers). For projects chunks, originalText and suggestedText must be bullet/body lines only (omit project name, project type, tech stack, and year headers). For all other sections, originalText must be the full chunk text and suggestedText a full chunk replacement (unchanged bullets included).
Ground every change in the provided chunks only — do not invent experience or assume omitted sections exist.`;
}
