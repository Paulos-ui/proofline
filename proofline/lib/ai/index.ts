import { AnthropicAnalyzer } from "./anthropic";
import { OpenAICompatibleTranscriber } from "./transcription";
import { isAnalysisConfigured, isTranscriptionConfigured } from "./config";
import type { AudioTranscriber, EvidenceAnalyzer } from "./types";

export * from "./types";
export * from "./config";

let analyzer: EvidenceAnalyzer | null = null;
let transcriber: AudioTranscriber | null = null;

export function getAnalyzer(): EvidenceAnalyzer {
  if (!analyzer) analyzer = new AnthropicAnalyzer();
  return analyzer;
}

export function getTranscriber(): AudioTranscriber {
  if (!transcriber) transcriber = new OpenAICompatibleTranscriber();
  return transcriber;
}

/** What the UI shows on the case screen about live processing availability. */
export function capabilityReport() {
  return {
    analysis: isAnalysisConfigured(),
    transcription: isTranscriptionConfigured(),
  };
}
