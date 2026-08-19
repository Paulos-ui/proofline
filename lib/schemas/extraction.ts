import { z } from "zod";
import { SourceLocatorSchema } from "./locator";

/**
 * The strict contract between the model and the rest of Proofline.
 * Anything the provider returns is validated against this before it can reach the
 * database or the UI. A response that does not parse is a failed analysis, not a
 * partially-trusted one.
 */

export const CONFIDENCE_BANDS = ["high", "medium", "low"] as const;
export type ConfidenceBand = (typeof CONFIDENCE_BANDS)[number];

/**
 * Model self-assessment, 0..1. This is NOT a calibrated probability — see
 * /limitations. Bands are what the UI shows by default.
 */
export const ConfidenceSchema = z.number().min(0).max(1);

export function confidenceBand(value: number): ConfidenceBand {
  if (value >= 0.75) return "high";
  if (value >= 0.45) return "medium";
  return "low";
}

export function confidenceLabel(value: number): string {
  const band = confidenceBand(value);
  return band === "high" ? "High confidence" : band === "medium" ? "Review suggested" : "Low confidence";
}

export const ENTITY_TYPES = [
  "person",
  "organization",
  "account",
  "email",
  "phone",
  "transaction",
  "product",
  "place",
  "platform",
  "document",
  "other",
] as const;
export const EntityTypeSchema = z.enum(ENTITY_TYPES);
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const TIME_PRECISIONS = ["exact", "minute", "hour", "day", "inferred", "unknown"] as const;
export const TimePrecisionSchema = z.enum(TIME_PRECISIONS);
export type TimePrecision = z.infer<typeof TimePrecisionSchema>;

export const ARTIFACT_KINDS = [
  "screenshot",
  "chat-log",
  "email",
  "receipt",
  "invoice",
  "document",
  "photo",
  "audio",
  "shipping-record",
  "other",
] as const;
export const ArtifactKindSchema = z.enum(ARTIFACT_KINDS);
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>;

export const SENSITIVE_CATEGORIES = [
  "email",
  "phone",
  "financial-account",
  "address",
  "government-id",
  "username",
  "wallet-address",
  "face",
  "other",
] as const;
export const SensitiveCategorySchema = z.enum(SENSITIVE_CATEGORIES);
export type SensitiveCategory = z.infer<typeof SensitiveCategorySchema>;

export const ExtractedEntitySchema = z.object({
  /** Stable only within one artifact analysis; resolution assigns real ids. */
  temporaryId: z.string().min(1),
  type: EntityTypeSchema,
  displayName: z.string().min(1).max(200),
  normalizedName: z.string().min(1).max(200),
  confidence: ConfidenceSchema,
  sourceLocator: SourceLocatorSchema,
});

export const ExtractedEventSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1200),
  /** ISO 8601. Null when the artifact does not state a time — never guessed. */
  occurredAt: z.string().nullable(),
  occurredAtEnd: z.string().nullable(),
  timePrecision: TimePrecisionSchema,
  confidence: ConfidenceSchema,
  entityRefs: z.array(z.string()).default([]),
  sourceLocators: z.array(SourceLocatorSchema).min(1),
});

export const ExtractedClaimSchema = z.object({
  text: z.string().min(1).max(600),
  speakerOrSource: z.string().max(200).nullable(),
  confidence: ConfidenceSchema,
  normalizedSubject: z.string().max(200).nullable(),
  normalizedPredicate: z.string().max(200).nullable(),
  normalizedObject: z.string().max(200).nullable(),
  sourceLocators: z.array(SourceLocatorSchema).min(1),
});

export const ExtractedAmountSchema = z.object({
  value: z.number(),
  currency: z.string().max(8).nullable(),
  context: z.string().max(300),
  sourceLocator: SourceLocatorSchema,
});

export const ExtractedDateSchema = z.object({
  raw: z.string().max(120),
  normalized: z.string().nullable(),
  timePrecision: TimePrecisionSchema,
  sourceLocator: SourceLocatorSchema,
});

export const ExtractedReferenceSchema = z.object({
  kind: z.string().max(60),
  value: z.string().max(300),
  sourceLocator: SourceLocatorSchema,
});

export const SensitiveCandidateSchema = z.object({
  category: SensitiveCategorySchema,
  preview: z.string().max(200),
  confidence: ConfidenceSchema,
  sourceLocator: SourceLocatorSchema,
});

export const UncertaintySchema = z.object({
  note: z.string().max(600),
  affects: z.enum(["time", "identity", "amount", "sequence", "content", "other"]),
});

export const ArtifactAnalysisSchema = z.object({
  artifactSummary: z.string().min(1).max(1200),
  artifactType: ArtifactKindSchema,
  detectedLanguage: z.string().max(40).nullable(),
  entities: z.array(ExtractedEntitySchema).default([]),
  events: z.array(ExtractedEventSchema).default([]),
  claims: z.array(ExtractedClaimSchema).default([]),
  dates: z.array(ExtractedDateSchema).default([]),
  amounts: z.array(ExtractedAmountSchema).default([]),
  references: z.array(ExtractedReferenceSchema).default([]),
  sensitiveDataCandidates: z.array(SensitiveCandidateSchema).default([]),
  uncertainties: z.array(UncertaintySchema).default([]),
});

export type ArtifactAnalysis = z.infer<typeof ArtifactAnalysisSchema>;
export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;
export type ExtractedEvent = z.infer<typeof ExtractedEventSchema>;
export type ExtractedClaim = z.infer<typeof ExtractedClaimSchema>;
export type SensitiveCandidate = z.infer<typeof SensitiveCandidateSchema>;

/**
 * Every locator the model emits must point at the artifact actually being analysed.
 * A model that invents an artifact id is producing ungrounded output, so the whole
 * analysis is rejected rather than partially kept.
 */
export function assertLocatorsBelongTo(analysis: ArtifactAnalysis, artifactId: string): void {
  const offenders = new Set<string>();
  const check = (id: string) => {
    if (id !== artifactId) offenders.add(id);
  };
  analysis.entities.forEach((e) => check(e.sourceLocator.artifactId));
  analysis.events.forEach((e) => e.sourceLocators.forEach((l) => check(l.artifactId)));
  analysis.claims.forEach((c) => c.sourceLocators.forEach((l) => check(l.artifactId)));
  analysis.dates.forEach((d) => check(d.sourceLocator.artifactId));
  analysis.amounts.forEach((a) => check(a.sourceLocator.artifactId));
  analysis.references.forEach((r) => check(r.sourceLocator.artifactId));
  analysis.sensitiveDataCandidates.forEach((s) => check(s.sourceLocator.artifactId));
  if (offenders.size > 0) {
    throw new Error(
      `Analysis references artifacts it was not given: ${[...offenders].join(", ")}. Expected only ${artifactId}.`,
    );
  }
}
