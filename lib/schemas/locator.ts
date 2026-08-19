import { z } from "zod";

/**
 * A source locator is the smallest addressable region of an artifact that supports a
 * generated statement. Every AI-derived object in Proofline carries at least one.
 * The shape is polymorphic because "where" means something different per media type.
 */

const bboxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});

export const ImageRegionLocatorSchema = z.object({
  artifactId: z.string().min(1),
  excerpt: z.string().max(2000).optional(),
  type: z.literal("image-region"),
  /** Normalised 0..1 coordinates relative to the artifact's intrinsic dimensions. */
  bbox: bboxSchema,
  recognizedText: z.string().max(2000).optional(),
});

export const PdfPageLocatorSchema = z.object({
  artifactId: z.string().min(1),
  excerpt: z.string().max(2000).optional(),
  type: z.literal("pdf-page"),
  page: z.number().int().min(1),
  bbox: bboxSchema.optional(),
});

export const AudioRangeLocatorSchema = z.object({
  artifactId: z.string().min(1),
  excerpt: z.string().max(2000).optional(),
  type: z.literal("audio-range"),
  startMs: z.number().int().min(0),
  endMs: z.number().int().min(0),
  transcript: z.string().max(4000).optional(),
});

export const TextRangeLocatorSchema = z.object({
  artifactId: z.string().min(1),
  excerpt: z.string().max(2000).optional(),
  type: z.literal("text-range"),
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(0),
});

export const EmailFieldLocatorSchema = z.object({
  artifactId: z.string().min(1),
  excerpt: z.string().max(2000).optional(),
  type: z.literal("email-field"),
  field: z.enum(["from", "to", "cc", "subject", "date", "body", "attachment"]),
  startOffset: z.number().int().min(0).optional(),
  endOffset: z.number().int().min(0).optional(),
});

export const SourceLocatorSchema = z.discriminatedUnion("type", [
  ImageRegionLocatorSchema,
  PdfPageLocatorSchema,
  AudioRangeLocatorSchema,
  TextRangeLocatorSchema,
  EmailFieldLocatorSchema,
]);

export type SourceLocator = z.infer<typeof SourceLocatorSchema>;
export type ImageRegionLocator = z.infer<typeof ImageRegionLocatorSchema>;
export type AudioRangeLocator = z.infer<typeof AudioRangeLocatorSchema>;
export type BoundingBox = z.infer<typeof bboxSchema>;

export function formatMs(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Human-readable position label, e.g. "page 3" or "0:14 – 0:18". */
export function describeLocator(locator: SourceLocator): string {
  switch (locator.type) {
    case "image-region":
      return "image region";
    case "pdf-page":
      return `page ${locator.page}`;
    case "audio-range":
      return `${formatMs(locator.startMs)} – ${formatMs(locator.endMs)}`;
    case "text-range":
      return `chars ${locator.startOffset}–${locator.endOffset}`;
    case "email-field":
      return `${locator.field} field`;
  }
}
