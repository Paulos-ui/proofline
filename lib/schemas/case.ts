import { z } from "zod";
import { SourceLocatorSchema } from "./locator";
import {
  ArtifactKindSchema,
  ConfidenceSchema,
  EntityTypeSchema,
  SensitiveCategorySchema,
  TimePrecisionSchema,
} from "./extraction";

/** The persisted, resolved shape of a case — what the workspace renders. */

export const PROCESSING_STATUSES = [
  "queued",
  "hashing",
  "uploaded",
  "analyzing",
  "extracted",
  "needs-review",
  "failed",
] as const;
export const ProcessingStatusSchema = z.enum(PROCESSING_STATUSES);
export type ProcessingStatus = z.infer<typeof ProcessingStatusSchema>;

export const ArtifactSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  byteSize: z.number().int().nonnegative(),
  storagePath: z.string(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  processingStatus: ProcessingStatusSchema,
  kind: ArtifactKindSchema.nullable(),
  summary: z.string().nullable(),
  /** Present for image artifacts; lets the UI map normalised bboxes to pixels. */
  dimensions: z.object({ width: z.number(), height: z.number() }).nullable().optional(),
  transcript: z.string().nullable().optional(),
  textContent: z.string().nullable().optional(),
  previewPath: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

export const EntityMentionSchema = z.object({
  id: z.string(),
  entityId: z.string(),
  artifactId: z.string(),
  locator: SourceLocatorSchema,
  surfaceText: z.string(),
  confidence: ConfidenceSchema,
});
export type EntityMention = z.infer<typeof EntityMentionSchema>;

export const EntitySchema = z.object({
  id: z.string(),
  caseId: z.string(),
  type: EntityTypeSchema,
  canonicalName: z.string(),
  aliases: z.array(z.string()).default([]),
  confidence: ConfidenceSchema,
  /** "possible-match" means Proofline did not merge; it only proposed. */
  resolution: z.enum(["confirmed", "possible-match", "unresolved"]).default("unresolved"),
  mentions: z.array(EntityMentionSchema).default([]),
});
export type Entity = z.infer<typeof EntitySchema>;

export const EventSourceSchema = z.object({
  artifactId: z.string(),
  locator: SourceLocatorSchema,
  excerpt: z.string(),
});
export type EventSource = z.infer<typeof EventSourceSchema>;

export const TimelineEventSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  title: z.string(),
  description: z.string(),
  occurredAt: z.string().nullable(),
  occurredAtEnd: z.string().nullable(),
  timePrecision: TimePrecisionSchema,
  confidence: ConfidenceSchema,
  entityIds: z.array(z.string()).default([]),
  sources: z.array(EventSourceSchema).min(1),
  needsReview: z.boolean().default(false),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const ClaimSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  eventId: z.string().nullable(),
  text: z.string(),
  speakerOrSource: z.string().nullable(),
  normalized: z.object({
    subject: z.string().nullable(),
    predicate: z.string().nullable(),
    object: z.string().nullable(),
  }),
  confidence: ConfidenceSchema,
  sources: z.array(EventSourceSchema).min(1),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const RELATIONSHIP_TYPES = [
  "communicated-with",
  "paid",
  "received-payment-from",
  "sold-to",
  "purchased-from",
  "mentions",
  "appears-in",
  "references",
  "shipped-to",
  "same-as",
] as const;
export const RelationshipTypeSchema = z.enum(RELATIONSHIP_TYPES);
export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

export const RelationshipSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  sourceEntityId: z.string(),
  targetEntityId: z.string(),
  type: RelationshipTypeSchema,
  label: z.string().optional(),
  confidence: ConfidenceSchema,
  supportingSources: z.array(EventSourceSchema).default([]),
});
export type Relationship = z.infer<typeof RelationshipSchema>;

export const CONFLICT_CLASSIFICATIONS = [
  "compatible",
  "potentially-inconsistent",
  "unresolved",
  "insufficient-evidence",
] as const;
export const ConflictClassificationSchema = z.enum(CONFLICT_CLASSIFICATIONS);
export type ConflictClassification = z.infer<typeof ConflictClassificationSchema>;

export const ConflictSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  classification: ConflictClassificationSchema,
  /** Neutral description of the difference. Never an accusation. */
  explanation: z.string(),
  confidence: ConfidenceSchema,
  claimAId: z.string(),
  claimBId: z.string().nullable(),
  dimension: z.enum(["status", "time", "amount", "identity", "location", "other"]),
  supportingSources: z.array(EventSourceSchema).default([]),
});
export type Conflict = z.infer<typeof ConflictSchema>;

export const RedactionSuggestionSchema = z.object({
  id: z.string(),
  artifactId: z.string(),
  category: SensitiveCategorySchema,
  locator: SourceLocatorSchema,
  preview: z.string(),
  confidence: ConfidenceSchema,
  detector: z.enum(["pattern", "model"]),
  decision: z.enum(["pending", "redact", "keep", "ignored"]).default("pending"),
});
export type RedactionSuggestion = z.infer<typeof RedactionSuggestionSchema>;

export const ManifestEntrySchema = z.object({
  id: z.string(),
  filename: z.string(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  byteSize: z.number().int().nonnegative(),
  mimeType: z.string(),
});
export type ManifestEntry = z.infer<typeof ManifestEntrySchema>;

export const ManifestSchema = z.object({
  version: z.literal("1"),
  caseId: z.string(),
  caseRef: z.string(),
  createdAt: z.string(),
  artifacts: z.array(ManifestEntrySchema),
  merkleRoot: z.string().regex(/^[0-9a-f]{64}$/),
});
export type Manifest = z.infer<typeof ManifestSchema>;

export const AnchorSchema = z.object({
  network: z.string(),
  cluster: z.string(),
  signature: z.string(),
  merkleRoot: z.string(),
  anchoredAt: z.string(),
  explorerUrl: z.string(),
  memo: z.string(),
});
export type Anchor = z.infer<typeof AnchorSchema>;

export const CaseSchema = z.object({
  id: z.string(),
  /** Short human reference shown in exports and verification, e.g. PL-84F2. */
  ref: z.string(),
  ownerId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["draft", "processing", "ready", "archived"]),
  incidentTimezone: z.string(),
  isSynthetic: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastProcessedAt: z.string().nullable(),
});
export type Case = z.infer<typeof CaseSchema>;

/** Everything the workspace needs for one case, in one object. */
export const CaseBundleSchema = z.object({
  case: CaseSchema,
  artifacts: z.array(ArtifactSchema),
  entities: z.array(EntitySchema),
  events: z.array(TimelineEventSchema),
  claims: z.array(ClaimSchema),
  relationships: z.array(RelationshipSchema),
  conflicts: z.array(ConflictSchema),
  redactions: z.array(RedactionSuggestionSchema),
  manifest: ManifestSchema.nullable(),
  anchor: AnchorSchema.nullable(),
});
export type CaseBundle = z.infer<typeof CaseBundleSchema>;
