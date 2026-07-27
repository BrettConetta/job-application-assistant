import { z } from "zod";
import { ResumeChunkSchema } from "./resumeChunk.js";

export const ExperienceContextSchema = z.object({
  company: z.string().trim(),
  location: z.string().trim(),
  title: z.string().trim(),
  dates: z.string().trim(),
});
export type ExperienceContext = z.infer<typeof ExperienceContextSchema>;

export const ProjectContextSchema = z.object({
  name: z.string().trim(),
  year: z.string().trim(),
  projectType: z.string().trim(),
  techStack: z.string().trim(),
});
export type ProjectContext = z.infer<typeof ProjectContextSchema>;

export const TailoredResumeRequestSchema = z.object({
  jobDescription: z.string().trim().min(1, "jobDescription is required"),
  resumeText: z.string().trim().optional(),
});

export type TailoredResumeRequest = z.infer<typeof TailoredResumeRequestSchema>;

export const TailoredResumeSuggestionSchema = z.object({
  chunkId: z.string().trim().min(1, "chunkId is required"), // must match a retrieved chunk id
  section: ResumeChunkSchema.shape.section,
  action: z.enum(["rewrite", "keep", "emphasize"] as const),
  originalText: z.string().trim().min(1, "originalText is required"), // echo of chunk text (or subset)
  suggestedText: z.string().trim().min(1, "suggestedText is required"), // tailored version; same as original if keep
  rationale: z.string().trim().min(1, "rationale is required"), // short: why this change for this JD
  experienceContext: ExperienceContextSchema.optional(),
  projectContext: ProjectContextSchema.optional(),
});

export type TailoredResumeSuggestion = z.infer<
  typeof TailoredResumeSuggestionSchema
>;

export const TailoredResumeResponseSchema = z.object({
  companyName: z.string(), // optional nicety, like cover letters
  roleTitle: z.string(), // inferred from JD; empty if unclear
  suggestions: z.array(TailoredResumeSuggestionSchema),
  keywordsToMirror: z.array(z.string()), // JD terms you already have evidence for
  warnings: z.array(z.string()), // e.g. "no fintech experience in chunks"
});

export type TailoredResumeResponse = z.infer<
  typeof TailoredResumeResponseSchema
>;
