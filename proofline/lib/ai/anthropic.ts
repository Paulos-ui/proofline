import Anthropic from "@anthropic-ai/sdk";
import { ArtifactAnalysisSchema, assertLocatorsBelongTo } from "@/lib/schemas/extraction";
import { aiConfig, isAnalysisConfigured } from "./config";
import { ARTIFACT_ANALYSIS_JSON_SCHEMA } from "./json-schema";
import { EXTRACTION_SYSTEM_PROMPT, buildUserInstruction } from "./prompt";
import {
  AnalysisRejectedError,
  AnalyzerNotConfiguredError,
  type AnalysisInput,
  type AnalysisResult,
  type EvidenceAnalyzer,
} from "./types";

const TOOL_NAME = "record_artifact_analysis";

const SUPPORTED_IMAGE = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"]);
const SUPPORTED_TEXT = new Set(["text/plain", "message/rfc822", "text/csv", "text/markdown"]);

export class AnthropicAnalyzer implements EvidenceAnalyzer {
  readonly name = "anthropic";
  private client: Anthropic | null = null;

  supports(mimeType: string): boolean {
    return SUPPORTED_IMAGE.has(mimeType) || SUPPORTED_TEXT.has(mimeType) || mimeType === "application/pdf";
  }

  private getClient(): Anthropic {
    if (!isAnalysisConfigured()) throw new AnalyzerNotConfiguredError("Anthropic analysis");
    if (!this.client) this.client = new Anthropic({ apiKey: aiConfig().anthropicApiKey });
    return this.client;
  }

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    const config = aiConfig();
    const client = this.getClient();
    const content: Anthropic.MessageParam["content"] = [];

    if (SUPPORTED_IMAGE.has(input.mimeType) && input.data) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: input.mimeType === "image/jpg" ? "image/jpeg" : (input.mimeType as "image/png"),
          data: input.data,
        },
      });
    } else if (input.mimeType === "application/pdf" && input.data) {
      content.push({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: input.data },
      });
    } else if (input.text) {
      content.push({ type: "text", text: `--- artifact content start ---\n${input.text}\n--- artifact content end ---` });
    } else {
      throw new AnalysisRejectedError(`No analysable content was provided for ${input.filename}.`);
    }

    content.push({
      type: "text",
      text: `${buildUserInstruction(input)}\n\nUse artifactId "${input.artifactId}" in every locator.`,
    });

    const response = await client.messages.create({
      model: config.anthropicModel,
      max_tokens: config.maxOutputTokens,
      system: EXTRACTION_SYSTEM_PROMPT,
      tools: [
        {
          name: TOOL_NAME,
          description: "Record the structured analysis of this artifact.",
          input_schema: ARTIFACT_ANALYSIS_JSON_SCHEMA as unknown as Anthropic.Tool["input_schema"],
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [{ role: "user", content }],
    });

    const block = response.content.find((c) => c.type === "tool_use" && c.name === TOOL_NAME);
    if (!block || block.type !== "tool_use") {
      throw new AnalysisRejectedError(
        `The model did not return a structured analysis for ${input.filename}. Nothing was saved.`,
      );
    }

    const parsed = ArtifactAnalysisSchema.safeParse(block.input);
    if (!parsed.success) {
      // A malformed analysis is discarded whole. Partial trust is not a state we keep.
      throw new AnalysisRejectedError(
        `The analysis of ${input.filename} did not match Proofline's schema and was discarded.`,
        parsed.error.issues.slice(0, 8),
      );
    }
    assertLocatorsBelongTo(parsed.data, input.artifactId);

    return {
      analysis: parsed.data,
      provider: this.name,
      model: config.anthropicModel,
      fromFixture: false,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  }
}
