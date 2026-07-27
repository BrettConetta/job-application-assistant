import type { ExperienceContext } from "../schemas/tailoredResume.js";

const COMPANY_SEP = /\s•\s/;
const ROLE_DATES =
  /^(.+?)\s+((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\s*[–—-]\s+(?:Present|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}))\s*$/i;

export function parseExperienceChunk(text: string): ExperienceContext {
  const empty = { company: "", location: "", title: "", dates: "" };
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const companyLine = lines.find(
    (l) => COMPANY_SEP.test(l) && !l.startsWith("•"),
  );
  const roleLine = lines.find((l) => ROLE_DATES.test(l) && !l.startsWith("•"));

  if (!companyLine && !roleLine) return empty;

  let company = "";
  let location = "";
  if (companyLine) {
    const [c, loc] = companyLine.split(COMPANY_SEP);
    company = c?.trim() ?? "";
    location = loc?.trim() ?? "";
  }

  let title = "";
  let dates = "";
  if (roleLine) {
    const match = roleLine.match(ROLE_DATES);
    title = match?.[1]?.trim() ?? "";
    dates = match?.[2]?.trim() ?? "";
  }

  return { company, location, title, dates };
}
