import type { ResumeChunk } from "../schemas/resumeChunk.js";
import type { TailoredResumeSuggestion } from "../schemas/tailoredResume.js";
import { chunkResume } from "./chunkResume.js";
import { formatExperienceContext } from "./parseExperienceChunk.js";
import { formatProjectContext } from "./parseProjectChunk.js";

export function applyResumeSuggestionsToChunks(
  originalResumeText: string,
  suggestions: TailoredResumeSuggestion[],
): {
  updatedChunks: ResumeChunk[];
  appliedChunkIds: string[];
  failedChunkIds: string[];
} {
  let updatedChunks = chunkResume(originalResumeText);
  const failedChunkIds: string[] = [];
  const appliedChunkIds: string[] = [];
  for (const suggestion of suggestions) {
    if (suggestion.action === "drop") {
      updatedChunks = updatedChunks.filter(
        (chunk) => chunk.id !== suggestion.chunkId,
      );
      appliedChunkIds.push(suggestion.chunkId);
      continue;
    }
    const index = updatedChunks.findIndex(
      (chunk) => chunk.id === suggestion.chunkId,
    );
    if (index === -1) {
      failedChunkIds.push(suggestion.chunkId);
      continue;
    }
    const chunk = updatedChunks[index];
    let updatedChunk: ResumeChunk = chunk;
    if (suggestion.section === "experience") {
      if (!chunk.experienceContext) {
        failedChunkIds.push(suggestion.chunkId);
        continue;
      }

      updatedChunk = {
        ...chunk,
        text: suggestion.suggestedText,
      };
      updatedChunks[index] = updatedChunk;
      appliedChunkIds.push(suggestion.chunkId);
    } else if (suggestion.section === "projects") {
      if (!chunk.projectContext) {
        failedChunkIds.push(suggestion.chunkId);
        continue;
      }

      updatedChunk = {
        ...chunk,
        text: suggestion.suggestedText,
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
  let previousParentId: string | undefined;
  for (const chunk of chunks) {
    const isEntrySection =
      chunk.section === "experience" || chunk.section === "projects";
    const entryChanged = isEntrySection && chunk.parentId !== previousParentId;
    if (chunk.section !== previousSection) {
      if (body) body += "\n";
      body +=
        chunk.section.charAt(0).toUpperCase() + chunk.section.slice(1) + "\n";
      previousSection = chunk.section;
      previousParentId = undefined; // force header on first entry in section
    } else if (entryChanged) {
      body += "\n";
    }
    const shouldEmitEntryHeader =
      isEntrySection && chunk.parentId !== previousParentId;
    let chunkBody = chunk.text;
    if (shouldEmitEntryHeader) {
      if (chunk.section === "experience" && chunk.experienceContext) {
        chunkBody = [
          formatExperienceContext(chunk.experienceContext),
          chunk.text,
        ]
          .filter(Boolean)
          .join("\n");
      } else if (chunk.section === "projects" && chunk.projectContext) {
        chunkBody = [formatProjectContext(chunk.projectContext), chunk.text]
          .filter(Boolean)
          .join("\n");
      }
    }
    body += chunkBody + "\n";
    previousParentId = chunk.parentId;
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
