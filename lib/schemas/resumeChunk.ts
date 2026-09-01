import { z } from "zod";

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

export const ResumeChunkSchema = z.object({
  id: z.string().trim().min(1, "ID is required"),
  section: z.enum([
    "summary",
    "experience",
    "skills",
    "education",
    "projects",
    "certifications",
    "publications",
    "patents",
    "awards",
    "languages",
    "interests",
    "references",
  ] as const),
  text: z.string().trim().min(1, "Text is required"),
  parentId: z.string().trim().min(1).optional(),
  experienceContext: ExperienceContextSchema.optional(),
  projectContext: ProjectContextSchema.optional(),
});

export type ResumeChunk = z.infer<typeof ResumeChunkSchema>;
