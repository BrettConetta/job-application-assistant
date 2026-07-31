import type { ResumeChunk } from "../schemas/resumeChunk.js";
import type { TailoredResumeSuggestion } from "../schemas/tailoredResume.js";
import { chunkResume } from "./chunkResume.js";
import { COMPANY_SEP, ROLE_DATES } from "./parseExperienceChunk.js";
import {
  NAME_AND_YEAR_LINE,
  PROJECT_TYPE_AND_TECH_STACK_LINE,
} from "./parseProjectChunk.js";

export function applyResumeSuggestionsToChunks(
  originalResumeText: string,
  suggestions: TailoredResumeSuggestion[],
): {
  updatedChunks: ResumeChunk[];
  appliedChunkIds: string[];
  failedChunkIds: string[];
} {
  const chunks = chunkResume(originalResumeText);
  const updatedChunks = [...chunks];
  const failedChunkIds: string[] = [];
  const appliedChunkIds: string[] = [];
  for (const suggestion of suggestions) {
    const index = updatedChunks.findIndex(
      (chunk) => chunk.id === suggestion.chunkId,
    );
    if (index === -1) {
      failedChunkIds.push(suggestion.chunkId);
      continue;
    }
    const chunk = chunks[index];
    let updatedChunk: ResumeChunk = chunk;
    if (suggestion.section === "experience") {
      const lines = chunk.text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const companyLine = lines.find(
        (l) => COMPANY_SEP.test(l) && !l.startsWith("•"),
      );
      const roleLine = lines.find(
        (l) => ROLE_DATES.test(l) && !l.startsWith("•"),
      );

      if (!companyLine || !roleLine) {
        failedChunkIds.push(suggestion.chunkId);
        continue;
      }

      updatedChunk = {
        ...chunk,
        text: [companyLine, roleLine, suggestion.suggestedText].join("\n"),
      };
      updatedChunks[index] = updatedChunk;
      appliedChunkIds.push(suggestion.chunkId);
    } else if (suggestion.section === "projects") {
      const lines = chunk.text
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

      if (!nameAndYearLine || !projectTypeAndTechStackLine) {
        failedChunkIds.push(suggestion.chunkId);
        continue;
      }

      updatedChunk = {
        ...chunk,
        text: [
          nameAndYearLine,
          projectTypeAndTechStackLine,
          suggestion.suggestedText,
        ].join("\n"),
      };
      updatedChunks[index] = updatedChunk;
      appliedChunkIds.push(suggestion.chunkId);
    } else {
      updatedChunk = {
        ...chunk,
        text: suggestion.suggestedText,
      };
      updatedChunks[index] = updatedChunk;
      appliedChunkIds.push(suggestion.chunkId);
    }
  }
  return {
    updatedChunks,
    appliedChunkIds,
    failedChunkIds,
  };
}

export function assembleResumeBodyFromChunks(chunks: ResumeChunk[]): string {
  let body = "";
  let previousSection: string | null = null;
  for (const chunk of chunks) {
    if (chunk.section !== previousSection) {
      if (body) {
        body += "\n";
      }
      body +=
        chunk.section.charAt(0).toUpperCase() + chunk.section.slice(1) + "\n";
      previousSection = chunk.section;
    } else if (
      chunk.section === "experience" ||
      chunk.section === "projects"
    ) {
      body += "\n";
    }
    body += chunk.text + "\n";
  }
  return body.trimEnd();
}

export function applyResumeSuggestions(
  originalResumeText: string,
  suggestions: TailoredResumeSuggestion[],
) {
  const { updatedChunks, appliedChunkIds, failedChunkIds } =
    applyResumeSuggestionsToChunks(originalResumeText, suggestions);

  const tailoredResumeText = assembleResumeBodyFromChunks(updatedChunks);

  return {
    tailoredResumeText,
    appliedChunkIds,
    failedChunkIds,
  };
}
