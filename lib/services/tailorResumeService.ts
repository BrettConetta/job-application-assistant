import type { Anthropic } from "@anthropic-ai/sdk";
import {
  buildTailorResumeUserPrompt,
  TAILOR_RESUME_JSON_RETRY_PROMPT,
  TAILOR_RESUME_SYSTEM_PROMPT,
} from "../prompts/index.js";
import { ResumeIndex } from "../schemas/resumeIndex.js";
import {
  TailoredResumeResponseSchema,
  type TailoredResumeResponse,
} from "../schemas/tailoredResume.js";
import { getAnthropicClient } from "../utils/anthropicClient.js";
import { parseClaudeResponse } from "../utils/parseAnthropicResponse.js";
import { retrieveResumeChunks } from "./retrieveResumeChunks.js";

export async function tailorResume(
  jobDescription: string,
  resumeIndex: ResumeIndex,
): Promise<TailoredResumeResponse> {
  const client = getAnthropicClient();
  const chunks = await retrieveResumeChunks(jobDescription, resumeIndex);
  const userPrompt = buildTailorResumeUserPrompt({ jobDescription, chunks });

  const baseRequest = {
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 8192,
    system: TAILOR_RESUME_SYSTEM_PROMPT,
  } as const;

  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    console.log("wainting for response from anthropic, attempt:", attempt);
    const response = await client.messages.create({
      ...baseRequest,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Anthropic returned no text content");
    }

    const rawText = textBlock.text;

    try {
      const tailoredResume = parseClaudeResponse(
        rawText,
        TailoredResumeResponseSchema,
      );

      // add experience context to each suggestion (company, location, title, dates)
      tailoredResume.suggestions.forEach((suggestion) => {
        if (suggestion.section === "experience") {
          const relevantChunk = chunks.find(
            (chunk) => chunk.id === suggestion.chunkId,
          );
          if (relevantChunk) {
            suggestion.experienceContext = relevantChunk.experienceContext;
          }
        }
        if (suggestion.section === "projects") {
          const relevantChunk = chunks.find(
            (chunk) => chunk.id === suggestion.chunkId,
          );
          if (relevantChunk) {
            suggestion.projectContext = relevantChunk.projectContext;
          }
        }
      });

      return tailoredResume;
    } catch (error) {
      console.error(
        `Tailored resume parse failed (attempt ${attempt}):`,
        rawText,
      );
      if (attempt === 1) {
        throw new Error(
          "Claude returned invalid tailored resume JSON after retry",
        );
      }
      messages = [
        { role: "user", content: userPrompt },
        { role: "assistant", content: rawText },
        { role: "user", content: TAILOR_RESUME_JSON_RETRY_PROMPT },
      ];
    }
  }

  throw new Error("Unreachable");
}
