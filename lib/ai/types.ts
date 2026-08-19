import type { ArtifactAnalysis } from "@/lib/schemas/extraction";

/** Everything an analyser is allowed to see about one artifact. */
export type AnalysisInput = {
  artifactId: string;
  filename: string;
  mimeType: string;
  /** Base64 payload for image and PDF artifacts. */
  data?: string;
  /** Plain text for txt/eml artifacts, or a transcript for audio. */
  text?: string;
  dimensions?: { width: number; height: number } | null;
  caseContext?: string;
};

export type AnalysisResult = {
  analysis: ArtifactAnalysis;
  provider: string;
  model: string;
  /** True when the analysis came from a stored fixture rather than a live call. */
  fromFixture: boolean;
  usage?: { inputTokens: number; outputTokens: number };
};

export interface EvidenceAnalyzer {
  readonly name: string;
  supports(mimeType: string): boolean;
  analyze(input: AnalysisInput): Promise<AnalysisResult>;
}

export type TranscriptSegment = { startMs: number; endMs: number; text: string; speaker?: string };

export type Transcription = {
  text: string;
  segments: TranscriptSegment[];
  provider: string;
  fromFixture: boolean;
};

export interface AudioTranscriber {
  readonly name: string;
  transcribe(file: { data: string; mimeType: string; filename: string }): Promise<Transcription>;
}

export class AnalyzerNotConfiguredError extends Error {
  constructor(what: string) {
    super(`${what} is not configured. Add the required credentials to .env.local, or use the demo case.`);
    this.name = "AnalyzerNotConfiguredError";
  }
}

export class AnalysisRejectedError extends Error {
  constructor(
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "AnalysisRejectedError";
  }
}
