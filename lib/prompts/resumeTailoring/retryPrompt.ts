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
  "No markdown, no code fences, no extra text.";
