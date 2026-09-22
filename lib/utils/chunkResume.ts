import type { ResumeChunk } from "../schemas/resumeChunk.js";
import { normalizeResumeLineBreaks } from "./normalizeResumeText.js";
import { parseExperienceChunk } from "./parseExperienceChunk.js";
import { parseProjectChunk } from "./parseProjectChunk.js";

const SECTION_ALIASES: Record<string, string> = {
  summary: "summary",
  "professional summary": "summary",
  experience: "experience",
  "work experience": "experience",
  education: "education",
  skills: "skills",
  "technical skills": "skills",
  projects: "projects",
};

const SECTION_HEADER_LINE =
  /^(?:Summary|Experience|Education|Skills|Projects|Work Experience|Technical Skills|Professional Summary)\s*$/i;
const COMPANY_LINE = /^.+\s•\s+[^,]+,\s*[A-Za-z]{2}\s*$/;
const ROLE_DATE_LINE =
  /^.+?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\s*[–—-]\s+(?:Present|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})\s*$/i;
const PROJECT_LINE = /^.+\s•\s+.+$/;

function normalizeSection(header: string): string {
  const key = header.trim().toLowerCase();
  return SECTION_ALIASES[key] ?? key; // fallback if you add new headers later
}

function isHeader(line: string, headerRegex: RegExp): boolean {
  return headerRegex.test(line.trim());
}

export function chunkResume(resume: string): ResumeChunk[] {
  const sections = chunkResumeIntoSections(resume);
  const chunkedSections = sections.flatMap((section) => {
    if (section.section === "experience") {
      return chunkExperienceIntoRoles(section);
    }
    if (section.section === "projects") {
      return chunkProjectsSectionIntoEntries(section, PROJECT_LINE, true);
    }
    return section;
  });
  return chunkedSections;
}

export function chunkResumeIntoSections(resume: string): ResumeChunk[] {
  const resumeLines = normalizeResumeLineBreaks(resume).split("\n");

  let sectionHeader: string | null = null;
  let sectionText: string[] = [];

  const sections: ResumeChunk[] = [];

  // pushes the sectionHeader and sectionText into sections as long as there is a sectionHeader
  // sectionHeader wont be set the first time a section header is found
  const flush = () => {
    if (sectionHeader === null) return;
    sections.push({
      id: sectionHeader,
      section: sectionHeader as ResumeChunk["section"],
      text: sectionText.join("\n"),
    });
    sectionText = [];
  };

  // loop through the lines, adding a new entry to sections when the next header is found
  // because of the if in flush(), nothing happens when the first section header is found
  // pushes the current line to sectionText if it isn't a section header
  for (const line of resumeLines) {
    if (isHeader(line, SECTION_HEADER_LINE)) {
      flush();
      // set the sectionHeader to the current line (the next section header)
      sectionHeader = normalizeSection(line);
      continue;
    }

    // handles the contact info at the top of the resume before a sectionHeader is found
    if (sectionHeader === null) {
      continue;
    }

    // add the line to the sectionText
    sectionText.push(line);
  }

  // push the last sectionHeader and sectionText into sections
  flush();

  return sections;
}

export function chunkProjectsSectionIntoEntries(
  section: ResumeChunk,
  newEntryRegex: RegExp,
  prependPreviousLine: boolean = false,
): ResumeChunk[] {
  const entries: ResumeChunk[] = [];
  const sectionLines = section.text.split("\n");

  let titleLine: string | null = null;
  let entryText: string[] = [];
  let entryHeader: string | null = null;
  let previousLine: string | null = null;
  let iteration = 0;

  const flush = () => {
    if (entryHeader === null) return;
    entries.push({
      id: `${section.section}-${iteration++}`,
      section: section.section,
      text: entryText.join("\n"),
      projectContext: parseProjectChunk(
        [titleLine, entryHeader].filter(Boolean).join("\n"),
      ),
    });
    entryText = [];
    titleLine = null;
  };

  for (const line of sectionLines) {
    if (isHeader(line, newEntryRegex)) {
      // push the current entry to the entries array
      flush();
      entryHeader = line.trim();

      // start new entry with that title + this header line
      if (
        prependPreviousLine &&
        previousLine?.trim() &&
        !previousLine.trim().startsWith("•")
      ) {
        titleLine = previousLine;
      }
    } else if (entryHeader === null) {
      // waiting for first entry header — title may sit here for projects
    } else if (line.trim().startsWith("•")) {
      // add the current line to the entryText if it is a bullet
      entryText.push(line);
    }

    // set the previous line to the current line
    previousLine = line;
  }

  // push the last sectionHeader and sectionText into sections
  flush();

  return entries.flatMap((entry) => chunkProjectIntoBullets(entry));
}

export function chunkProjectIntoBullets(project: ResumeChunk): ResumeChunk[] {
  return project.text
    .split("\n")
    .filter((line) => line.trim().startsWith("•"))
    .map((line, index) => ({
      id: `${project.id}-${index}`,
      parentId: project.id,
      section: project.section,
      text: line.trim(),
      projectContext: project.projectContext,
    }));
}

export function chunkExperienceIntoRoles(section: ResumeChunk): ResumeChunk[] {
  const roles: ResumeChunk[] = [];
  const sectionLines = section.text.split("\n");

  let currentCompanyLine: string | null = null;
  let currentRoleLine: string | null = null;
  let entryText: string[] = [];
  let inRole = false;
  let iteration = 0;

  const flush = () => {
    if (!inRole) return;
    roles.push({
      id: `${section.section}-${iteration++}`,
      section: section.section,
      text: entryText.join("\n"),
      experienceContext: parseExperienceChunk(
        [currentCompanyLine, currentRoleLine].filter(Boolean).join("\n"),
      ),
    });
    entryText = [];
    inRole = false;
  };

  for (const line of sectionLines) {
    const trimmed = line.trim();

    if (isHeader(line, COMPANY_LINE)) {
      flush();
      currentCompanyLine = trimmed;
      continue;
    }

    if (isHeader(line, ROLE_DATE_LINE)) {
      flush();
      inRole = true;
      currentRoleLine = trimmed;
      continue;
    }

    if (inRole && trimmed.startsWith("•")) {
      entryText.push(line);
    }
    // else: stray lines before the first role — ignore
  }

  flush();
  return roles.flatMap((role) => chunkRoleIntoBullets(role));
}

export function chunkRoleIntoBullets(role: ResumeChunk): ResumeChunk[] {
  return role.text
    .split("\n")
    .filter((line) => line.trim().startsWith("•"))
    .map((line, index) => ({
      id: `${role.id}-${index}`,
      parentId: role.id,
      section: role.section,
      text: line.trim(),
      experienceContext: role.experienceContext,
    }));
}
