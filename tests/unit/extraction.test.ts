import { describe, expect, it } from "vitest";
import {
  ArtifactAnalysisSchema,
  assertLocatorsBelongTo,
  confidenceBand,
  confidenceLabel,
} from "@/lib/schemas/extraction";
import { SourceLocatorSchema, describeLocator } from "@/lib/schemas/locator";

const locator = (artifactId = "art-01") => ({
  artifactId,
  type: "image-region" as const,
  bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.1 },
  excerpt: "Status: Pending",
});

const validAnalysis = {
  artifactSummary: "A transfer receipt showing a pending payment.",
  artifactType: "receipt",
  detectedLanguage: "en",
  entities: [
    {
      temporaryId: "e1",
      type: "transaction",
      displayName: "PL-TRF-4471-9082",
      normalizedName: "pl-trf-4471-9082",
      confidence: 0.9,
      sourceLocator: locator(),
    },
  ],
  events: [
    {
      title: "Receipt captured",
      description: "The receipt shows the transfer as pending.",
      occurredAt: "2026-03-03T11:47:00.000Z",
      occurredAtEnd: null,
      timePrecision: "minute",
      confidence: 0.9,
      entityRefs: ["e1"],
      sourceLocators: [locator()],
    },
  ],
  claims: [],
  dates: [],
  amounts: [],
  references: [],
  sensitiveDataCandidates: [],
  uncertainties: [],
};

describe("analysis validation", () => {
  it("accepts a well-formed analysis", () => {
    expect(ArtifactAnalysisSchema.safeParse(validAnalysis).success).toBe(true);
  });

  it("rejects an event with no source locator", () => {
    const malformed = {
      ...validAnalysis,
      events: [{ ...validAnalysis.events[0], sourceLocators: [] }],
    };
    expect(ArtifactAnalysisSchema.safeParse(malformed).success).toBe(false);
  });

  it("rejects an unknown artifact type rather than coercing it", () => {
    expect(ArtifactAnalysisSchema.safeParse({ ...validAnalysis, artifactType: "hologram" }).success).toBe(false);
  });

  it("rejects confidence outside 0..1", () => {
    const malformed = { ...validAnalysis, entities: [{ ...validAnalysis.entities[0], confidence: 1.4 }] };
    expect(ArtifactAnalysisSchema.safeParse(malformed).success).toBe(false);
  });

  it("rejects a bounding box outside the image", () => {
    const malformed = {
      ...validAnalysis,
      entities: [
        { ...validAnalysis.entities[0], sourceLocator: { ...locator(), bbox: { x: 1.4, y: 0, width: 0.2, height: 0.2 } } },
      ],
    };
    expect(ArtifactAnalysisSchema.safeParse(malformed).success).toBe(false);
  });

  it("keeps a missing timestamp missing", () => {
    const parsed = ArtifactAnalysisSchema.parse({
      ...validAnalysis,
      events: [{ ...validAnalysis.events[0], occurredAt: null, timePrecision: "unknown" }],
    });
    expect(parsed.events[0]!.occurredAt).toBeNull();
    expect(parsed.events[0]!.timePrecision).toBe("unknown");
  });

  it("preserves source locators through validation", () => {
    const parsed = ArtifactAnalysisSchema.parse(validAnalysis);
    expect(parsed.events[0]!.sourceLocators[0]).toMatchObject({ artifactId: "art-01", type: "image-region" });
    expect(parsed.entities[0]!.sourceLocator.excerpt).toBe("Status: Pending");
  });

  it("fails safely on a response that is not an object", () => {
    expect(ArtifactAnalysisSchema.safeParse("Here is the analysis you asked for.").success).toBe(false);
    expect(ArtifactAnalysisSchema.safeParse(null).success).toBe(false);
  });
});

describe("locator ownership", () => {
  it("accepts locators pointing at the artifact under analysis", () => {
    const parsed = ArtifactAnalysisSchema.parse(validAnalysis);
    expect(() => assertLocatorsBelongTo(parsed, "art-01")).not.toThrow();
  });

  it("rejects an analysis that references another artifact", () => {
    const parsed = ArtifactAnalysisSchema.parse({
      ...validAnalysis,
      events: [{ ...validAnalysis.events[0], sourceLocators: [locator("art-99")] }],
    });
    expect(() => assertLocatorsBelongTo(parsed, "art-01")).toThrow(/art-99/);
  });
});

describe("locator descriptions", () => {
  it("describes each locator type in the reader's terms", () => {
    expect(describeLocator(SourceLocatorSchema.parse(locator()))).toBe("image region");
    expect(describeLocator(SourceLocatorSchema.parse({ artifactId: "a", type: "pdf-page", page: 3 }))).toBe("page 3");
    expect(
      describeLocator(SourceLocatorSchema.parse({ artifactId: "a", type: "audio-range", startMs: 14200, endMs: 18800 })),
    ).toBe("0:14 – 0:18");
  });
});

describe("confidence presentation", () => {
  it("bands values rather than presenting them as probabilities", () => {
    expect(confidenceBand(0.9)).toBe("high");
    expect(confidenceBand(0.5)).toBe("medium");
    expect(confidenceBand(0.2)).toBe("low");
    expect(confidenceLabel(0.5)).toBe("Review suggested");
  });
});
