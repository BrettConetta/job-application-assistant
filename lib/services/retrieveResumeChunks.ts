import { ResumeChunk } from "../schemas/resumeChunk.js";
import { ResumeIndex } from "../schemas/resumeIndex.js";
import { cosineSimilarity } from "../utils/cosineSimilarity.js";
import { embedText } from "./embedText.js";

export type RetrieveResumeChunksOptions = {
  maxChunks?: number;
  ensureSections?: string[];
  ensureLatestExperience?: boolean;
  minScore?: number;
  maxOlderExperienceRoles?: number;
  maxBulletsPerOlderExperienceRole?: number;
  maxProjects?: number;
  maxProjectBulletsPerProject?: number;
};

type SimilarityScore = {
  chunk: ResumeChunk;
  similarity: number;
};

const LATEST_EXPERIENCE_PARENT_ID = "experience-0";
const SECOND_LATEST_EXPERIENCE_PARENT_ID = "experience-1";

export async function retrieveResumeChunks(
  jobDescriptionText: string,
  resumeIndex: ResumeIndex,
  options: RetrieveResumeChunksOptions = {},
): Promise<ResumeChunk[]> {
  // embed the job description
  const jobDescriptionEmbedding = await embedText(jobDescriptionText);

  // calculate the similarity scores for each chunk and sort them by similarity
  const similarityScores: SimilarityScore[] = [];
  for (const chunk of resumeIndex) {
    const similarity = cosineSimilarity(
      chunk.embedding,
      jobDescriptionEmbedding,
    );
    similarityScores.push({ chunk: chunk.chunk, similarity });
  }
  similarityScores.sort((a, b) => b.similarity - a.similarity);

  return selectResumeChunksFromScores(similarityScores, options);
}

export function selectResumeChunksFromScores(
  similarityScores: SimilarityScore[],
  options: RetrieveResumeChunksOptions = {},
): ResumeChunk[] {
  const {
    maxChunks = 28,
    ensureSections = ["summary", "skills"],
    ensureLatestExperience = true,
    minScore = 0,
    maxOlderExperienceRoles = 2,
    maxBulletsPerOlderExperienceRole = 2,
    maxProjects = 2,
    maxProjectBulletsPerProject = 2,
  } = options;

  const selected: ResumeChunk[] = [];
  const selectedIds = new Set<string>();

  function tryAdd(chunk: ResumeChunk) {
    if (selected.length >= maxChunks) return false;
    if (selectedIds.has(chunk.id)) return false;
    selected.push(chunk);
    selectedIds.add(chunk.id);
    return true;
  }

  for (const section of ensureSections) {
    const match = similarityScores.find((s) => s.chunk.section === section);
    if (match) {
      tryAdd(match.chunk);
    }
  }

  if (ensureLatestExperience) {
    const latestExperience = similarityScores
      .filter(
        (s) =>
          s.chunk.parentId === LATEST_EXPERIENCE_PARENT_ID ||
          s.chunk.parentId === SECOND_LATEST_EXPERIENCE_PARENT_ID,
      )
      .sort((a, b) => b.similarity - a.similarity);

    for (const score of latestExperience) {
      tryAdd(score.chunk);
    }
  }

  const topOlderExperienceParentIds = similarityScores
    .filter(
      (s) =>
        s.similarity >= minScore &&
        s.chunk.section === "experience" &&
        Boolean(s.chunk.parentId) &&
        s.chunk.parentId !== LATEST_EXPERIENCE_PARENT_ID &&
        s.chunk.parentId !== SECOND_LATEST_EXPERIENCE_PARENT_ID,
    )
    .map((s) => s.chunk.parentId!)
    .filter(
      (parentId, index, parentIds) => parentIds.indexOf(parentId) === index,
    )
    .slice(0, maxOlderExperienceRoles);

  for (const parentId of topOlderExperienceParentIds) {
    const olderExperienceScores = similarityScores
      .filter(
        (s) =>
          s.similarity >= minScore &&
          s.chunk.section === "experience" &&
          s.chunk.parentId === parentId,
      )
      .slice(0, maxBulletsPerOlderExperienceRole);

    for (const score of olderExperienceScores) {
      tryAdd(score.chunk);
    }
  }

  const topProjectParentIds = similarityScores
    .filter(
      (s) =>
        s.similarity >= minScore &&
        s.chunk.section === "projects" &&
        Boolean(s.chunk.parentId),
    )
    .map((s) => s.chunk.parentId!)
    .filter(
      (parentId, index, parentIds) => parentIds.indexOf(parentId) === index,
    )
    .slice(0, maxProjects);

  for (const parentId of topProjectParentIds) {
    const projectScores = similarityScores
      .filter(
        (s) =>
          s.similarity >= minScore &&
          s.chunk.section === "projects" &&
          s.chunk.parentId === parentId,
      )
      .slice(0, maxProjectBulletsPerProject);

    for (const score of projectScores) {
      tryAdd(score.chunk);
    }
  }

  // fill any remaining space with other relevant sections, excluding the categories already handled above
  for (const score of similarityScores) {
    if (selected.length >= maxChunks) break;
    if (score.similarity < minScore) continue;
    if (score.chunk.section === "education") continue;
    if (score.chunk.section === "experience") continue;
    if (score.chunk.section === "projects") continue;
    if (selectedIds.has(score.chunk.id)) continue;
    tryAdd(score.chunk);
  }

  return selected;
}
