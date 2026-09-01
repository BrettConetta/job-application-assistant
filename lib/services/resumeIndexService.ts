import fs from "node:fs";
import { ResumeChunk } from "../schemas/resumeChunk.js";
import { ResumeIndex, ResumeIndexSchema } from "../schemas/resumeIndex.js";
import { chunkResume } from "../utils/chunkResume.js";
import { formatExperienceContext } from "../utils/parseExperienceChunk.js";
import { formatProjectContext } from "../utils/parseProjectChunk.js";
import { getResumeIndexPath, readResumeFile } from "../utils/resumeFiles.js";
import { embedText } from "./embedText.js";

export async function indexStoredResume(
  projectRoot: string,
): Promise<ResumeIndex> {
  const resumeText = readResumeFile(projectRoot);
  if (!resumeText.trim()) {
    return [];
  }

  let chunkEmbeddings: {
    chunk: ResumeChunk;
    embedding: number[];
  }[] = [];

  const chunks = chunkResume(resumeText);
  // Check if the index file exists and if it does, check if the chunks match the cached index.
  let shouldRebuildIndex = true;
  const resumeIndexPath = getResumeIndexPath(projectRoot);
  if (fs.existsSync(resumeIndexPath)) {
    const fileContents = fs.readFileSync(resumeIndexPath, "utf8");
    if (fileContents.trim().length) {
      try {
        const cached = ResumeIndexSchema.parse(JSON.parse(fileContents));
        if (chunksMatchCache(chunks, cached)) {
          chunkEmbeddings = cached;
          shouldRebuildIndex = false;
        }
      } catch (error) {
        console.error("Failed to parse resume index file:", error);
      }
    }
  }

  // If the index needs to be rebuilt, embed the chunks and save the index.
  if (shouldRebuildIndex) {
    chunkEmbeddings = await embedChunks(chunks);
    try {
      fs.writeFileSync(
        resumeIndexPath,
        JSON.stringify(chunkEmbeddings, null, 2),
      );
    } catch (error) {
      // If the write fails, log the error, but always return the in-memory index so downstream processes can continue.
      console.error("Failed to write resume index file:", error);
    }
  }

  return chunkEmbeddings;
}

export async function indexResumeText(
  resumeText: string,
): Promise<ResumeIndex> {
  if (!resumeText.trim()) {
    return [];
  }

  // if the resume text is provided, embed the chunks and return the index.
  return embedChunks(chunkResume(resumeText));
}

function chunksMatchCache(chunks: ResumeChunk[], cached: ResumeIndex): boolean {
  if (chunks.length !== cached.length) return false;
  return chunks.every(
    (chunk, i) =>
      chunk.id === cached[i]!.chunk.id &&
      chunk.text === cached[i]!.chunk.text &&
      JSON.stringify(chunk.experienceContext) ===
        JSON.stringify(cached[i]!.chunk.experienceContext) &&
      JSON.stringify(chunk.projectContext) ===
        JSON.stringify(cached[i]!.chunk.projectContext),
  );
}

export function loadResumeIndex(projectRoot: string): ResumeIndex {
  const resumeIndexPath = getResumeIndexPath(projectRoot);

  try {
    return ResumeIndexSchema.parse(
      JSON.parse(fs.readFileSync(resumeIndexPath, "utf8")),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function clearResumeIndex(projectRoot: string): void {
  const resumeIndexPath = getResumeIndexPath(projectRoot);

  try {
    fs.unlinkSync(resumeIndexPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
}

async function embedChunks(chunks: ResumeChunk[]): Promise<ResumeIndex> {
  const chunkEmbeddings: {
    chunk: ResumeChunk;
    embedding: number[];
  }[] = [];

  for (const chunk of chunks) {
    const contextText = chunk.experienceContext
      ? formatExperienceContext(chunk.experienceContext)
      : chunk.projectContext
        ? formatProjectContext(chunk.projectContext)
        : "";
    const textToEmbed = [contextText, chunk.text].filter(Boolean).join("\n");
    chunkEmbeddings.push({
      chunk,
      embedding: await embedText(textToEmbed),
    });
  }

  return chunkEmbeddings;
}
