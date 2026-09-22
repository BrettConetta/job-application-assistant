export const TAILOR_RESUME_JSON_RETRY_PROMPT =
  "Your previous response was not valid JSON matching the required schema. " +
  "Return ONLY a single JSON object with exactly these keys: " +
  "companyName (string; empty string if unknown), " +
  "roleTitle (string; empty string if unclear), " +
  "suggestions (array of objects, exactly one per provided resume chunk, each with chunkId, section, action, originalText, suggestedText, rationale), " +
  "keywordsToMirror (array of strings), " +
  "warnings (array of strings). " +
  "action must be one of: rewrite, keep, emphasize, drop. " +
  "For experience, originalText and suggestedText must be bullet/body lines only (omit company, role title, location, and date headers). " +
  "For projects, originalText and suggestedText must be bullet/body lines only (omit project name, project type, tech stack, and year headers). " +
  "For all other sections, originalText must be the full original chunk text and suggestedText a full chunk replacement. " +
  "If action is drop, suggestedText must equal originalText. " +
  "For experience-0, prefer drop so about 5-7 bullets remain. " +
  "For experience-1, leave about 2-3 bullets. " +
  "Never drop an entire experience role; keep at least 2 bullets per experience parentId when available. " +
  "For experience-1, prefer distinct non-duplicate bullets (e.g. tech knowledge-sharing) over onboarding or Apply Network retells. " +
  "If the JD emphasizes ops/event-driven work, prefer keeping those experience-0 bullets over extra Apply Network features. " +
  "No markdown, no code fences, no extra text.";
