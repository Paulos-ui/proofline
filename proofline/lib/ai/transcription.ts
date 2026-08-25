import { aiConfig, isTranscriptionConfigured } from "./config";
import { AnalyzerNotConfiguredError, type AudioTranscriber, type Transcription, type TranscriptSegment } from "./types";

/**
 * Transcription is a separate adapter so no other part of Proofline depends on a
 * particular vendor. If nothing is configured, audio artifacts are marked as needing
 * review rather than being silently treated as analysed.
 */

type VerboseSegment = { start: number; end: number; text: string };

export class OpenAICompatibleTranscriber implements AudioTranscriber {
  readonly name = "openai-compatible";

  async transcribe(file: { data: string; mimeType: string; filename: string }): Promise<Transcription> {
    if (!isTranscriptionConfigured()) throw new AnalyzerNotConfiguredError("Audio transcription");
    const config = aiConfig();
    const bytes = Buffer.from(file.data, "base64");
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(bytes)], { type: file.mimeType }), file.filename);
    form.append("model", config.transcriptionModel);
    form.append("response_format", "verbose_json");

    const response = await fetch(`${config.transcriptionBaseUrl.replace(/\/$/, "")}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.transcriptionApiKey}` },
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Transcription failed (${response.status}). The audio artifact was not analysed.`);
    }

    const body = (await response.json()) as { text?: string; segments?: VerboseSegment[] };
    const segments: TranscriptSegment[] = (body.segments ?? []).map((s) => ({
      startMs: Math.round(s.start * 1000),
      endMs: Math.round(s.end * 1000),
      text: s.text.trim(),
    }));

    return {
      text: body.text ?? segments.map((s) => s.text).join(" "),
      segments,
      provider: config.transcriptionProvider || this.name,
      fromFixture: false,
    };
  }
}

/** Renders segments into a transcript the analyser can locate ranges within. */
export function segmentsToLocatableText(segments: TranscriptSegment[]): string {
  return segments.map((s) => `[${s.startMs}-${s.endMs}] ${s.speaker ? `${s.speaker}: ` : ""}${s.text}`).join("\n");
}
