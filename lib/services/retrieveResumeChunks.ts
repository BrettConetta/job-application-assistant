import { ResumeChunk } from "../schemas/resumeChunk.js";
import { ResumeIndex } from "../schemas/resumeIndex.js";
import { cosineSimilarity } from "../utils/cosineSimilarity.js";
import { embedText } from "./embedText.js";

type RetrieveResumeChunksOptions = {
  maxChunks?: number;
  ensureSections?: string[];
  ensureLatestExperience?: boolean;
  minScore?: number;
};

export async function retrieveResumeChunks(
  jobDescriptionText: string,
  resumeIndex: ResumeIndex,
  options: RetrieveResumeChunksOptions = {},
): Promise<ResumeChunk[]> {
  const {
    maxChunks = 24,
    ensureSections = ["summary", "skills"],
    ensureLatestExperience = true,
    minScore = 0,
  } = options;

  const selected: ResumeChunk[] = [];
  const selectedIds = new Set<string>();

  // helper function to add a chunk to the selected list if it's not already in the list and the list is not full
  function tryAdd(chunk: ResumeChunk) {
    if (selected.length >= maxChunks) return;
    if (selectedIds.has(chunk.id)) return;
    selected.push(chunk);
    selectedIds.add(chunk.id);
  }

  // embed the job description
  const jobDescriptionEmbedding = await embedText(jobDescriptionText);

  // calculate the similarity scores for each chunk and sort them by similarity
  const similarityScores: { chunk: ResumeChunk; similarity: number }[] = [];
  for (const chunk of resumeIndex) {
    const similarity = cosineSimilarity(
      chunk.embedding,
      jobDescriptionEmbedding,
    );
    similarityScores.push({ chunk: chunk.chunk, similarity });
  }
  similarityScores.sort((a, b) => b.similarity - a.similarity);

  // add chunks that should always be included (skills, summary, latest experience)
  for (const section of ensureSections) {
    const match = similarityScores.find((s) => s.chunk.section === section);
    if (match) {
      tryAdd(match.chunk);
    }
  }
  if (ensureLatestExperience) {
    const latestExperience = similarityScores
      .filter((s) => s.chunk.parentId === "experience-0")
      .sort((a, b) => b.similarity - a.similarity);

    for (const score of latestExperience) {
      tryAdd(score.chunk);
    }
  }

  // add chunks that are similar to the job description
  for (const score of similarityScores) {
    if (selected.length >= maxChunks) break;
    if (score.similarity < minScore) continue;
    if (score.chunk.section === "education") continue;
    if (selectedIds.has(score.chunk.id)) continue;
    tryAdd(score.chunk);
  }
  return selected;
}
