import dotenv from "dotenv";
import express, { Request, Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { GenerateCoverLetterRequestSchema } from "../../lib/schemas/coverLetter.js";
import { TailoredResumeRequestSchema } from "../../lib/schemas/tailoredResume.js";
import {
  extractAndStoreApplicant,
  readStoredApplicant,
} from "../../lib/services/applicantStorageService.js";
import { generateCoverLetter } from "../../lib/services/coverLetterService.js";
import { ensureOllamaRunning } from "../../lib/services/ensureOllama.js";
import {
  indexResumeText,
  indexStoredResume,
} from "../../lib/services/resumeIndexService.js";
import {
  clearStoredResume,
  readStoredResume,
  writeStoredResume,
} from "../../lib/services/resumeStorageService.js";
import {
  isMocksEnabled,
  readTailorResumeMock,
  writeTailorResumeMock,
} from "../../lib/services/tailorResumeMockService.js";
import { tailorResume } from "../../lib/services/tailorResumeService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(
  __dirname,
  __dirname.includes(`${path.sep}dist${path.sep}`) ? "../../../.." : "../..",
);
dotenv.config({ path: path.resolve(PROJECT_ROOT, ".env") });

const SaveResumeRequestSchema = z.object({
  text: z.string().min(1, "Resume text is required"),
});

const ExtractApplicantRequestSchema = z.object({
  text: z.string().min(1, "Resume text is required"),
});

const app = express();
const PORT = process.env.PORT ?? 3001;

let ollamaReady: Promise<void> | null = null;

function ensureOllamaOnce() {
  if (!ollamaReady) {
    ollamaReady = ensureOllamaRunning();
  }
  return ollamaReady;
}

app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/api/applicant", (_req: Request, res: Response) => {
  try {
    const applicant = readStoredApplicant(PROJECT_ROOT);
    return res.json({ applicant });
  } catch (error) {
    console.error("Failed to read applicant info:", error);
    return res.status(500).json({ error: "Failed to read applicant info" });
  }
});

app.put("/api/applicant/extract", (req: Request, res: Response) => {
  try {
    const parsed = ExtractApplicantRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => issue.message)
        .join("; ");
      return res.status(400).json({ error: message });
    }

    const applicant = extractAndStoreApplicant(PROJECT_ROOT, parsed.data.text);
    return res.json({ applicant });
  } catch (error) {
    console.error("Failed to extract applicant info:", error);
    return res.status(500).json({ error: "Failed to extract applicant info" });
  }
});

app.post("/api/cover-letter/generate", async (req: Request, res: Response) => {
  try {
    const parsed = GenerateCoverLetterRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => issue.message)
        .join("; ");
      return res.status(400).json({ error: message });
    }

    const result = await generateCoverLetter(parsed.data);
    return res.json(result);
  } catch (error) {
    console.error("Cover letter generation failed:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate cover letter";
    const status = message.includes("ANTHROPIC_API_KEY") ? 500 : 502;
    return res.status(status).json({ error: message });
  }
});

app.get("/api/resume", (_req: Request, res: Response) => {
  try {
    const text = readStoredResume(PROJECT_ROOT);
    return res.json({ text });
  } catch (error) {
    console.error("Failed to read stored resume:", error);
    return res.status(500).json({ error: "Failed to read stored resume" });
  }
});

app.put("/api/resume", (req: Request, res: Response) => {
  try {
    const parsed = SaveResumeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => issue.message)
        .join("; ");
      return res.status(400).json({ error: message });
    }

    const text = writeStoredResume(PROJECT_ROOT, parsed.data.text);
    return res.json({ text });
  } catch (error) {
    console.error("Failed to save resume:", error);
    return res.status(500).json({ error: "Failed to save resume" });
  }
});

app.delete("/api/resume", (_req: Request, res: Response) => {
  try {
    clearStoredResume(PROJECT_ROOT);
    return res.status(204).send();
  } catch (error) {
    console.error("Failed to clear stored resume:", error);
    return res.status(500).json({ error: "Failed to clear stored resume" });
  }
});

app.post("/api/resume/tailor", async (req: Request, res: Response) => {
  try {
    const parsed = TailoredResumeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues
        .map((issue) => issue.message)
        .join("; ");
      return res.status(400).json({ error: message });
    }

    if (isMocksEnabled()) {
      const mock = readTailorResumeMock(PROJECT_ROOT);
      if (mock) {
        console.log("Returning mocked tailor resume response");
        return res.json(mock);
      }
      console.warn(
        "MOCKS_ENABLED=true but no tailor resume mock found; calling Claude",
      );
    }

    const fromRequest = Boolean(parsed.data.resumeText?.trim());
    const resumeText =
      parsed.data.resumeText?.trim() || readStoredResume(PROJECT_ROOT);

    if (!resumeText.trim()) {
      return res.status(400).json({
        error:
          "Resume text is required (provide resume text or save a resume first)",
      });
    }

    await ensureOllamaOnce();
    console.log("ollama ready");

    const resumeIndex = fromRequest
      ? await indexResumeText(resumeText)
      : await indexStoredResume(PROJECT_ROOT);

    const result = await tailorResume(parsed.data.jobDescription, resumeIndex);
    writeTailorResumeMock(PROJECT_ROOT, result);
    return res.json(result);
  } catch (error) {
    console.error("Failed to tailor resume:", error);
    const message =
      error instanceof Error ? error.message : "Failed to tailor resume";
    return res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
