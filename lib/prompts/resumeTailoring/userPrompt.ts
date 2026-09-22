import type { TailorResumeInput } from "../types.js";

export function buildTailorResumeUserPrompt(input: TailorResumeInput): string {
  const { jobDescription, chunks } = input;

  const chunksJson = JSON.stringify(
    chunks.map((chunk) => ({
      id: chunk.id,
      section: chunk.section,
      text: chunk.text,
      parentId: chunk.parentId,
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
Return exactly one suggestion per chunk.

Selection / drop guidance for this pass:
- Experience roles experience-0 and experience-1 are intentionally over-included so you can choose what to keep.
- For experience-0: use action "drop" so about 5–7 bullets remain.
- For experience-1: use action "drop" so about 2–3 bullets remain. Never drop all bullets from this role.
- Never remove an entire experience role. Every experience parentId in the chunks must keep at least 2 bullets (or all of them if fewer than 2 exist).
- For experience-1, prefer distinct bullets over junior duplicates of experience-0 work. Prefer tech knowledge-sharing / enablement over onboarding/cohorts or Apply Network retells already covered under experience-0.
- Prefer technical/product bullets over soft bullets; keep at most one soft/leadership bullet unless the JD clearly emphasizes leadership, mentoring, hiring, or collaboration rituals.
- Prefer mentoring over interviewing or Scrum Master when keeping a soft bullet. Mentoring on experience-0 counts as that soft bullet; do not also keep interviews/Scrum Master.
- If two bullets tell the same story (especially same company across roles), keep the stronger/senior version and drop the weaker duplicate — but still leave ≥2 bullets on the older role for employment continuity.
- For Apply Network / apply-flow work on experience-0: usually keep the 1M+ submissions scale bullet plus at most 1–2 JD-matching feature bullets; do not keep every related bullet. Prefer dropping experience-1 Apply Network bullets that retell the same product story.
- If the JD emphasizes production troubleshooting, event-driven systems, or distributed systems, prefer keeping an experience-0 ops/event-driven bullet (e.g. SQS / production triage) over an extra Apply Network feature bullet.
- Projects are already capped by retrieval; only drop project bullets if redundant or a weak JD match.
- Prefer dropping weak matches over forced rewrites, except when a drop would erase a whole role.

Formatting rules:
- For experience chunks, originalText and suggestedText must be bullet/body lines only (omit company, role title, location, and date headers).
- For projects chunks, originalText and suggestedText must be bullet/body lines only (omit project name, project type, tech stack, and year headers).
- For all other sections, originalText must be the full chunk text and suggestedText a full chunk replacement (unchanged bullets included).
- If action is "drop", suggestedText must equal originalText.
- Ground every change in the provided chunks only — do not invent experience or assume omitted sections exist.`;
}
