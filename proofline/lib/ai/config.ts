/** Single place where AI provider configuration is read. No model ids elsewhere. */

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6";

export function aiConfig() {
  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    anthropicModel: process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL,
    maxOutputTokens: Number(process.env.ANTHROPIC_MAX_TOKENS ?? 8000),
    transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER ?? "",
    transcriptionApiKey: process.env.TRANSCRIPTION_API_KEY ?? "",
    transcriptionModel: process.env.TRANSCRIPTION_MODEL ?? "whisper-1",
    transcriptionBaseUrl: process.env.TRANSCRIPTION_BASE_URL ?? "https://api.openai.com/v1",
  };
}

export function isAnalysisConfigured(): boolean {
  return aiConfig().anthropicApiKey.length > 0;
}

export function isTranscriptionConfigured(): boolean {
  const c = aiConfig();
  return c.transcriptionProvider.length > 0 && c.transcriptionApiKey.length > 0;
}
