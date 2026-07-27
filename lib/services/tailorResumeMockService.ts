import fs from "node:fs";
import path from "node:path";
import {
  TailoredResumeResponseSchema,
  type TailoredResumeResponse,
} from "../schemas/tailoredResume.js";

export function isMocksEnabled(): boolean {
  return process.env.MOCKS_ENABLED === "true";
}

export function getTailorResumeMockPath(projectRoot: string): string {
  return path.join(projectRoot, "data", "mocks", "tailorResume.json");
}

export function readTailorResumeMock(
  projectRoot: string,
): TailoredResumeResponse | null {
  try {
    const raw = fs.readFileSync(getTailorResumeMockPath(projectRoot), "utf8");
    const parsed = TailoredResumeResponseSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export function writeTailorResumeMock(
  projectRoot: string,
  response: TailoredResumeResponse,
): void {
  const validated = TailoredResumeResponseSchema.parse(response);
  const filePath = getTailorResumeMockPath(projectRoot);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
}
