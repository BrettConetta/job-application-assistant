import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ResumeChunk } from "../schemas/resumeChunk.js";
import { selectResumeChunksFromScores } from "./retrieveResumeChunks.js";

function makeChunk(
  id: string,
  section: ResumeChunk["section"],
  similarity: number,
  overrides: Partial<ResumeChunk> = {},
) {
  return {
    chunk: {
      id,
      section,
      text: `${id} text`,
      ...overrides,
    },
    similarity,
  };
}

describe("selectResumeChunksFromScores", () => {
  it("keeps summary and skills, includes all latest experience, and selects the top 2 older roles with 2 bullets each", () => {
    const scores = [
      makeChunk("experience-1-0", "experience", 0.97, {
        parentId: "experience-1",
      }),
      makeChunk("experience-2-0", "experience", 0.965, {
        parentId: "experience-2",
      }),
      makeChunk("projects-2-0", "projects", 0.96, {
        parentId: "projects-2",
      }),
      makeChunk("experience-0-1", "experience", 0.95, {
        parentId: "experience-0",
      }),
      makeChunk("summary", "summary", 0.94),
      makeChunk("experience-1-1", "experience", 0.93, {
        parentId: "experience-1",
      }),
      makeChunk("skills", "skills", 0.92),
      makeChunk("experience-0-0", "experience", 0.91, {
        parentId: "experience-0",
      }),
      makeChunk("experience-2-1", "experience", 0.9, {
        parentId: "experience-2",
      }),
      makeChunk("experience-3-0", "experience", 0.89, {
        parentId: "experience-3",
      }),
      makeChunk("experience-3-1", "experience", 0.885, {
        parentId: "experience-3",
      }),
      makeChunk("projects-2-1", "projects", 0.88, {
        parentId: "projects-2",
      }),
      makeChunk("projects-1-0", "projects", 0.87, {
        parentId: "projects-1",
      }),
      makeChunk("projects-1-1", "projects", 0.86, {
        parentId: "projects-1",
      }),
      makeChunk("projects-0-0", "projects", 0.85, {
        parentId: "projects-0",
      }),
      makeChunk("certifications", "certifications", 0.84),
    ];

    const selected = selectResumeChunksFromScores(scores, {
      maxChunks: 24,
      maxOlderExperienceRoles: 2,
      maxBulletsPerOlderExperienceRole: 2,
      maxProjects: 2,
      maxProjectBulletsPerProject: 2,
    });

    assert.deepEqual(
      selected.map((chunk) => chunk.id),
      [
        "summary",
        "skills",
        "experience-1-0",
        "experience-0-1",
        "experience-1-1",
        "experience-0-0",
        "experience-2-0",
        "experience-2-1",
        "experience-3-0",
        "experience-3-1",
        "projects-2-0",
        "projects-2-1",
        "projects-1-0",
        "projects-1-1",
        "certifications",
      ],
    );
  });

  it("respects minScore and maxChunks while still prioritizing the capped categories", () => {
    const scores = [
      makeChunk("summary", "summary", 0.95),
      makeChunk("skills", "skills", 0.94),
      makeChunk("experience-0-0", "experience", 0.93, {
        parentId: "experience-0",
      }),
      makeChunk("experience-1-0", "experience", 0.92, {
        parentId: "experience-1",
      }),
      makeChunk("experience-2-0", "experience", 0.89, {
        parentId: "experience-2",
      }),
      makeChunk("projects-0-0", "projects", 0.91, {
        parentId: "projects-0",
      }),
      makeChunk("projects-0-1", "projects", 0.88, {
        parentId: "projects-0",
      }),
      makeChunk("awards", "awards", 0.87),
    ];

    const selected = selectResumeChunksFromScores(scores, {
      maxChunks: 6,
      minScore: 0.9,
      maxOlderExperienceRoles: 2,
      maxBulletsPerOlderExperienceRole: 2,
      maxProjects: 2,
      maxProjectBulletsPerProject: 2,
    });

    assert.deepEqual(
      selected.map((chunk) => chunk.id),
      [
        "summary",
        "skills",
        "experience-0-0",
        "experience-1-0",
        "projects-0-0",
      ],
    );
  });
});
