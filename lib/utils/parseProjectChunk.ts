import type { ProjectContext } from "../schemas/tailoredResume.js";

const NAME_AND_YEAR_LINE = /^(.*)\s(\d{4})$/;
const PROJECT_TYPE_AND_TECH_STACK_LINE = /^(.+?)\s•\s(.+)$/;

export function parseProjectChunk(text: string): ProjectContext {
  const empty = { name: "", year: "", projectType: "", techStack: "" };
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const nameAndYearLine = lines.find(
    (l) => NAME_AND_YEAR_LINE.test(l) && !l.startsWith("•"),
  );
  const projectTypeAndTechStackLine = lines.find(
    (l) =>
      PROJECT_TYPE_AND_TECH_STACK_LINE.test(l) &&
      !l.startsWith("•") &&
      l.includes("•"),
  );
  if (!nameAndYearLine && !projectTypeAndTechStackLine) return empty;

  let name = "";
  let year = "";
  if (nameAndYearLine) {
    const match = nameAndYearLine.match(/^(.*)\s(\d{4})$/);
    name = match?.[1]?.trim() ?? "";
    year = match?.[2]?.trim() ?? "";
  }

  let projectType = "";
  let techStack = "";
  if (projectTypeAndTechStackLine) {
    const [projType, tStack] = projectTypeAndTechStackLine.split(
      PROJECT_TYPE_AND_TECH_STACK_LINE,
    );
    projectType = projType?.trim() ?? "";
    techStack = tStack?.trim() ?? "";
  }

  return { name, year, projectType, techStack };
}
