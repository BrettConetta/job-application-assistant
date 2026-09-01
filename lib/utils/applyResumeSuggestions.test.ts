import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TailoredResumeSuggestion } from "../schemas/tailoredResume.js";
import {
  applyResumeSuggestions,
  applyResumeSuggestionsToChunks,
  assembleResumeBodyFromChunks,
} from "./applyResumeSuggestions.js";
import { chunkResume } from "./chunkResume.js";

const SAMPLE_RESUME = `Summary
Original summary about full-stack work.

Skills
• Languages – Java • TypeScript
• Cloud – AWS

Experience
ICIMS • Holmdel, NJ
Software Engineer October 2022 – December 2025
• Built Java microservices
• Mentored an associate engineer
Associate Software Engineer April 2021 – October 2022
• Led React knowledge sharing

Projects
Job Application Assistant 2026
Personal Project • TypeScript, React, Express
• Built Java microservices
• Mentored an associate engineer
`;

function makeSuggestion(
  overrides: Partial<TailoredResumeSuggestion> &
    Pick<TailoredResumeSuggestion, "chunkId" | "section" | "suggestedText">,
): TailoredResumeSuggestion {
  return {
    action: "rewrite",
    originalText: "placeholder original",
    rationale: "test rationale",
    ...overrides,
  };
}

describe("applyResumeSuggestionsToChunks", () => {
  it("replaces a full non-experience/projects chunk by chunkId", () => {
    const { updatedChunks, appliedChunkIds, failedChunkIds } =
      applyResumeSuggestionsToChunks(SAMPLE_RESUME, [
        makeSuggestion({
          chunkId: "summary",
          section: "summary",
          suggestedText: "Rewritten summary tailored to the role.",
        }),
      ]);

    assert.deepEqual(appliedChunkIds, ["summary"]);
    assert.deepEqual(failedChunkIds, []);
    const summary = updatedChunks.find((c) => c.id === "summary");
    assert.equal(summary?.text, "Rewritten summary tailored to the role.");
  });

  it("keeps experience headers in experienceContext and replaces only the bullet body", () => {
    const { updatedChunks, appliedChunkIds, failedChunkIds } =
      applyResumeSuggestionsToChunks(SAMPLE_RESUME, [
        makeSuggestion({
          chunkId: "experience-0",
          section: "experience",
          suggestedText:
            "• Architected scalable Java services\n• Mentored engineers on delivery",
        }),
      ]);

    assert.deepEqual(appliedChunkIds, ["experience-0"]);
    assert.deepEqual(failedChunkIds, []);

    const experience0 = updatedChunks.find((c) => c.id === "experience-0");
    assert.ok(experience0);
    assert.deepEqual(experience0.experienceContext, {
      company: "ICIMS",
      location: "Holmdel, NJ",
      title: "Software Engineer",
      dates: "October 2022 – December 2025",
    });
    assert.equal(
      experience0.text,
      "• Architected scalable Java services\n• Mentored engineers on delivery",
    );
    assert.doesNotMatch(experience0.text, /ICIMS • Holmdel, NJ/);
    assert.doesNotMatch(
      experience0.text,
      /Software Engineer October 2022 – December 2025/,
    );
  });

  it("keeps project headers in projectContext and replaces only the bullet body", () => {
    const { updatedChunks, appliedChunkIds, failedChunkIds } =
      applyResumeSuggestionsToChunks(SAMPLE_RESUME, [
        makeSuggestion({
          chunkId: "projects-0",
          section: "projects",
          suggestedText:
            "• Built a full-stack TypeScript app\n• Integrated LLM APIs",
        }),
      ]);

    assert.deepEqual(appliedChunkIds, ["projects-0"]);
    assert.deepEqual(failedChunkIds, []);

    const project = updatedChunks.find((c) => c.id === "projects-0");
    assert.ok(project);
    assert.deepEqual(project.projectContext, {
      name: "Job Application Assistant",
      year: "2026",
      projectType: "Personal Project",
      techStack: "TypeScript, React, Express",
    });
    assert.equal(
      project.text,
      "• Built a full-stack TypeScript app\n• Integrated LLM APIs",
    );
    assert.doesNotMatch(project.text, /Job Application Assistant 2026/);
    assert.doesNotMatch(
      project.text,
      /Personal Project • TypeScript, React, Express/,
    );
  });

  it("applies by chunkId when project and experience share the same bullet text", () => {
    const { updatedChunks, appliedChunkIds, failedChunkIds } =
      applyResumeSuggestionsToChunks(SAMPLE_RESUME, [
        makeSuggestion({
          chunkId: "projects-0",
          section: "projects",
          suggestedText: "• Project-only rewritten bullets",
        }),
      ]);

    assert.deepEqual(appliedChunkIds, ["projects-0"]);
    assert.deepEqual(failedChunkIds, []);

    const experience0 = updatedChunks.find((c) => c.id === "experience-0");
    const project = updatedChunks.find((c) => c.id === "projects-0");
    assert.ok(experience0);
    assert.ok(project);
    assert.match(experience0.text, /• Built Java microservices/);
    assert.match(project.text, /• Project-only rewritten bullets/);
    assert.doesNotMatch(project.text, /• Built Java microservices/);
  });

  it("records missing chunkIds as failed and leaves other chunks unchanged", () => {
    const before = chunkResume(SAMPLE_RESUME);
    const { updatedChunks, appliedChunkIds, failedChunkIds } =
      applyResumeSuggestionsToChunks(SAMPLE_RESUME, [
        makeSuggestion({
          chunkId: "experience-99",
          section: "experience",
          suggestedText: "• Should not apply",
        }),
      ]);

    assert.deepEqual(appliedChunkIds, []);
    assert.deepEqual(failedChunkIds, ["experience-99"]);
    assert.deepEqual(updatedChunks, before);
  });

  it("fails experience suggestions whose matched chunk lacks experienceContext", () => {
    const { appliedChunkIds, failedChunkIds, updatedChunks } =
      applyResumeSuggestionsToChunks(SAMPLE_RESUME, [
        makeSuggestion({
          chunkId: "summary",
          section: "experience",
          suggestedText: "• Wrong section type for this chunk",
        }),
      ]);

    assert.deepEqual(appliedChunkIds, []);
    assert.deepEqual(failedChunkIds, ["summary"]);
    assert.match(
      updatedChunks.find((c) => c.id === "summary")?.text ?? "",
      /^Original summary about full-stack work\.\n?$/,
    );
  });

  it("applies multiple suggestions and collects applied and failed ids", () => {
    const { appliedChunkIds, failedChunkIds, updatedChunks } =
      applyResumeSuggestionsToChunks(SAMPLE_RESUME, [
        makeSuggestion({
          chunkId: "summary",
          section: "summary",
          suggestedText: "New summary",
        }),
        makeSuggestion({
          chunkId: "missing-chunk",
          section: "skills",
          suggestedText: "• Nope",
        }),
        makeSuggestion({
          chunkId: "skills",
          section: "skills",
          suggestedText: "• Languages – TypeScript",
        }),
      ]);

    assert.deepEqual(appliedChunkIds, ["summary", "skills"]);
    assert.deepEqual(failedChunkIds, ["missing-chunk"]);
    assert.equal(
      updatedChunks.find((c) => c.id === "summary")?.text,
      "New summary",
    );
    assert.equal(
      updatedChunks.find((c) => c.id === "skills")?.text,
      "• Languages – TypeScript",
    );
  });
});

describe("assembleResumeBodyFromChunks", () => {
  it("emits a section header once per section and joins chunk text", () => {
    const body = assembleResumeBodyFromChunks([
      {
        id: "summary",
        section: "summary",
        text: "Summary body",
      },
      {
        id: "experience-0",
        section: "experience",
        text: "• Bullet A",
        experienceContext: {
          company: "ICIMS",
          location: "Holmdel, NJ",
          title: "Software Engineer",
          dates: "October 2022 – December 2025",
        },
      },
      {
        id: "experience-1",
        section: "experience",
        text: "• Bullet B",
        experienceContext: {
          company: "ICIMS",
          location: "Holmdel, NJ",
          title: "Associate Software Engineer",
          dates: "April 2021 – October 2022",
        },
      },
      {
        id: "projects-0",
        section: "projects",
        text: "• Project bullet A",
        projectContext: {
          name: "Project One",
          year: "2026",
          projectType: "Personal Project",
          techStack: "TypeScript",
        },
      },
      {
        id: "projects-1",
        section: "projects",
        text: "• Project bullet B",
        projectContext: {
          name: "Project Two",
          year: "2025",
          projectType: "Personal Project",
          techStack: "React",
        },
      },
    ]);

    assert.equal(
      body,
      [
        "Summary",
        "Summary body",
        "",
        "Experience",
        "ICIMS • Holmdel, NJ",
        "Software Engineer October 2022 – December 2025",
        "• Bullet A",
        "",
        "ICIMS • Holmdel, NJ",
        "Associate Software Engineer April 2021 – October 2022",
        "• Bullet B",
        "",
        "Projects",
        "Project One 2026",
        "Personal Project • TypeScript",
        "• Project bullet A",
        "",
        "Project Two 2025",
        "Personal Project • React",
        "• Project bullet B",
      ].join("\n"),
    );
  });
});

describe("applyResumeSuggestions", () => {
  it("returns tailored resume text with applied and failed chunk ids", () => {
    const result = applyResumeSuggestions(SAMPLE_RESUME, [
      makeSuggestion({
        chunkId: "summary",
        section: "summary",
        suggestedText: "Tailored summary for EY.",
      }),
      makeSuggestion({
        chunkId: "experience-0",
        section: "experience",
        suggestedText: "• Tailored experience bullets",
      }),
      makeSuggestion({
        chunkId: "projects-0",
        section: "projects",
        suggestedText: "• Tailored project bullets",
      }),
      makeSuggestion({
        chunkId: "does-not-exist",
        section: "skills",
        suggestedText: "• Unused",
      }),
    ]);

    assert.deepEqual(result.appliedChunkIds, [
      "summary",
      "experience-0",
      "projects-0",
    ]);
    assert.deepEqual(result.failedChunkIds, ["does-not-exist"]);
    assert.match(result.tailoredResumeText, /^Summary\nTailored summary for EY\./);
    assert.match(
      result.tailoredResumeText,
      /Software Engineer October 2022 – December 2025\n• Tailored experience bullets/,
    );
    assert.match(
      result.tailoredResumeText,
      /Personal Project • TypeScript, React, Express\n• Tailored project bullets/,
    );
    assert.match(
      result.tailoredResumeText,
      /Associate Software Engineer April 2021 – October 2022\n• Led React knowledge sharing/,
    );
    assert.doesNotMatch(
      result.tailoredResumeText,
      /Experience[\s\S]*• Built Java microservices/,
    );
  });
});

describe("chunkResume experience context", () => {
  it("keeps the prior company on a second role until a new company line", () => {
    const resume = `Experience
ICIMS • Holmdel, NJ
Software Engineer October 2022 – December 2025
• Built Java microservices
Associate Software Engineer April 2021 – October 2022
• Led React knowledge sharing
Life Skills Software, Inc • Red Bank, NJ
Full Stack Developer May 2020 – June 2021
• Built a classroom app
`;
    const chunks = chunkResume(resume);
    const experience = chunks.filter((c) => c.section === "experience");

    assert.equal(experience.length, 3);
    assert.deepEqual(experience[0]?.experienceContext, {
      company: "ICIMS",
      location: "Holmdel, NJ",
      title: "Software Engineer",
      dates: "October 2022 – December 2025",
    });
    assert.deepEqual(experience[1]?.experienceContext, {
      company: "ICIMS",
      location: "Holmdel, NJ",
      title: "Associate Software Engineer",
      dates: "April 2021 – October 2022",
    });
    assert.deepEqual(experience[2]?.experienceContext, {
      company: "Life Skills Software, Inc",
      location: "Red Bank, NJ",
      title: "Full Stack Developer",
      dates: "May 2020 – June 2021",
    });
  });
});
