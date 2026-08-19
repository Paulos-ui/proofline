/**
 * JSON Schema handed to the provider as a tool definition, so the model emits a typed
 * object instead of prose we would have to parse. It intentionally mirrors
 * lib/schemas/extraction.ts; Zod remains the authority and re-validates the response,
 * because a provider honouring a schema is a strong hint, not a guarantee.
 */

const bbox = {
  type: "object",
  properties: {
    x: { type: "number", minimum: 0, maximum: 1 },
    y: { type: "number", minimum: 0, maximum: 1 },
    width: { type: "number", minimum: 0, maximum: 1 },
    height: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["x", "y", "width", "height"],
} as const;

const locator = {
  type: "object",
  description: "Where in this artifact the statement is supported.",
  properties: {
    artifactId: { type: "string", description: "Must equal the artifact id given in the request." },
    type: { type: "string", enum: ["image-region", "pdf-page", "audio-range", "text-range", "email-field"] },
    excerpt: { type: "string", description: "The supporting text, verbatim where legible." },
    bbox,
    recognizedText: { type: "string" },
    page: { type: "integer", minimum: 1 },
    startMs: { type: "integer", minimum: 0 },
    endMs: { type: "integer", minimum: 0 },
    transcript: { type: "string" },
    startOffset: { type: "integer", minimum: 0 },
    endOffset: { type: "integer", minimum: 0 },
    field: { type: "string", enum: ["from", "to", "cc", "subject", "date", "body", "attachment"] },
  },
  required: ["artifactId", "type"],
} as const;

const confidence = { type: "number", minimum: 0, maximum: 1 } as const;

export const ARTIFACT_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    artifactSummary: { type: "string", description: "Two or three sentences on what this artifact is and shows." },
    artifactType: {
      type: "string",
      enum: ["screenshot", "chat-log", "email", "receipt", "invoice", "document", "photo", "audio", "shipping-record", "other"],
    },
    detectedLanguage: { type: ["string", "null"] },
    entities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          temporaryId: { type: "string" },
          type: {
            type: "string",
            enum: ["person", "organization", "account", "email", "phone", "transaction", "product", "place", "platform", "document", "other"],
          },
          displayName: { type: "string" },
          normalizedName: { type: "string", description: "Lowercase, punctuation stripped." },
          confidence,
          sourceLocator: locator,
        },
        required: ["temporaryId", "type", "displayName", "normalizedName", "confidence", "sourceLocator"],
      },
    },
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          occurredAt: { type: ["string", "null"], description: "ISO 8601, or null when no time is stated." },
          occurredAtEnd: { type: ["string", "null"] },
          timePrecision: { type: "string", enum: ["exact", "minute", "hour", "day", "inferred", "unknown"] },
          confidence,
          entityRefs: { type: "array", items: { type: "string" } },
          sourceLocators: { type: "array", minItems: 1, items: locator },
        },
        required: ["title", "description", "occurredAt", "occurredAtEnd", "timePrecision", "confidence", "sourceLocators"],
      },
    },
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          speakerOrSource: { type: ["string", "null"] },
          confidence,
          normalizedSubject: { type: ["string", "null"] },
          normalizedPredicate: { type: ["string", "null"] },
          normalizedObject: { type: ["string", "null"] },
          sourceLocators: { type: "array", minItems: 1, items: locator },
        },
        required: ["text", "speakerOrSource", "confidence", "normalizedSubject", "normalizedPredicate", "normalizedObject", "sourceLocators"],
      },
    },
    dates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          raw: { type: "string" },
          normalized: { type: ["string", "null"] },
          timePrecision: { type: "string", enum: ["exact", "minute", "hour", "day", "inferred", "unknown"] },
          sourceLocator: locator,
        },
        required: ["raw", "normalized", "timePrecision", "sourceLocator"],
      },
    },
    amounts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          value: { type: "number" },
          currency: { type: ["string", "null"] },
          context: { type: "string" },
          sourceLocator: locator,
        },
        required: ["value", "currency", "context", "sourceLocator"],
      },
    },
    references: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", description: "e.g. order-id, tracking-number, transaction-ref" },
          value: { type: "string" },
          sourceLocator: locator,
        },
        required: ["kind", "value", "sourceLocator"],
      },
    },
    sensitiveDataCandidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["email", "phone", "financial-account", "address", "government-id", "username", "wallet-address", "face", "other"],
          },
          preview: { type: "string" },
          confidence,
          sourceLocator: locator,
        },
        required: ["category", "preview", "confidence", "sourceLocator"],
      },
    },
    uncertainties: {
      type: "array",
      items: {
        type: "object",
        properties: {
          note: { type: "string" },
          affects: { type: "string", enum: ["time", "identity", "amount", "sequence", "content", "other"] },
        },
        required: ["note", "affects"],
      },
    },
  },
  required: [
    "artifactSummary",
    "artifactType",
    "detectedLanguage",
    "entities",
    "events",
    "claims",
    "dates",
    "amounts",
    "references",
    "sensitiveDataCandidates",
    "uncertainties",
  ],
} as const;
