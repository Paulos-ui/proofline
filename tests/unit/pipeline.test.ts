import { describe, expect, it } from "vitest";
import { computeCase, type AnalyzedArtifact } from "@/lib/evidence/pipeline";
import type { ArtifactAnalysis } from "@/lib/schemas/extraction";

const analysis = (overrides: Partial<ArtifactAnalysis> = {}): ArtifactAnalysis => ({
  artifactSummary: "summary",
  artifactType: "screenshot",
  detectedLanguage: "en",
  entities: [],
  events: [],
  claims: [],
  dates: [],
  amounts: [],
  references: [],
  sensitiveDataCandidates: [],
  uncertainties: [],
  ...overrides,
});

const locator = (artifactId: string) => ({
  artifactId,
  type: "image-region" as const,
  bbox: { x: 0, y: 0, width: 0.5, height: 0.2 },
  excerpt: "excerpt",
});

const artifact = (id: string, a: ArtifactAnalysis, textContent?: string): AnalyzedArtifact => ({
  artifactId: id,
  filename: `${id}.png`,
  mimeType: "image/png",
  analysis: a,
  ...(textContent ? { textContent } : {}),
});

describe("case computation", () => {
  it("does not invent a timestamp for an event with none", () => {
    const result = computeCase("c1", [
      artifact(
        "a1",
        analysis({
          events: [
            {
              title: "Parcel collected",
              description: "",
              occurredAt: null,
              occurredAtEnd: null,
              timePrecision: "unknown",
              confidence: 0.8,
              entityRefs: [],
              sourceLocators: [locator("a1")],
            },
          ],
        }),
      ),
    ]);
    expect(result.events[0]!.occurredAt).toBeNull();
    expect(result.events[0]!.timePrecision).toBe("unknown");
    expect(result.events[0]!.needsReview).toBe(true);
  });

  it("downgrades an unparseable timestamp to unknown rather than guessing", () => {
    const result = computeCase("c1", [
      artifact(
        "a1",
        analysis({
          events: [
            {
              title: "Something happened",
              description: "",
              occurredAt: "last Tuesday",
              occurredAtEnd: null,
              timePrecision: "minute",
              confidence: 0.9,
              entityRefs: [],
              sourceLocators: [locator("a1")],
            },
          ],
        }),
      ),
    ]);
    expect(result.events[0]!.occurredAt).toBeNull();
    expect(result.events[0]!.timePrecision).toBe("unknown");
  });

  it("flags low-confidence events for review", () => {
    const result = computeCase("c1", [
      artifact(
        "a1",
        analysis({
          events: [
            {
              title: "Blurry event",
              description: "",
              occurredAt: "2026-03-03T11:00:00.000Z",
              occurredAtEnd: null,
              timePrecision: "minute",
              confidence: 0.3,
              entityRefs: [],
              sourceLocators: [locator("a1")],
            },
          ],
        }),
      ),
    ]);
    expect(result.events[0]!.needsReview).toBe(true);
  });

  it("resolves the same account seen in two artifacts into one entity", () => {
    const entity = (temporaryId: string, artifactId: string) => ({
      temporaryId,
      type: "email" as const,
      displayName: "alex@mail.example",
      normalizedName: "alex@mail.example",
      confidence: 0.9,
      sourceLocator: locator(artifactId),
    });
    const result = computeCase("c1", [
      artifact("a1", analysis({ entities: [entity("e1", "a1")] })),
      artifact("a2", analysis({ entities: [entity("e1", "a2")] })),
    ]);
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0]!.mentions).toHaveLength(2);
  });

  it("keeps every source locator attached to its claim", () => {
    const result = computeCase("c1", [
      artifact(
        "a1",
        analysis({
          claims: [
            {
              text: "The payment cleared.",
              speakerOrSource: "Seller",
              confidence: 0.9,
              normalizedSubject: "transfer 1",
              normalizedPredicate: "has status",
              normalizedObject: "cleared",
              sourceLocators: [locator("a1")],
            },
          ],
        }),
      ),
    ]);
    expect(result.claims[0]!.sources[0]!.artifactId).toBe("a1");
    expect(result.claims[0]!.sources[0]!.excerpt).toBe("excerpt");
  });

  it("finds a difference between claims that came from separate artifacts", () => {
    const claim = (object: string, artifactId: string) => ({
      text: object,
      speakerOrSource: artifactId,
      confidence: 0.9,
      normalizedSubject: "transfer 1",
      normalizedPredicate: "has status",
      normalizedObject: object,
      sourceLocators: [locator(artifactId)],
    });
    const result = computeCase("c1", [
      artifact("a1", analysis({ claims: [claim("cleared", "a1")] })),
      artifact("a2", analysis({ claims: [claim("pending", "a2")] })),
    ]);
    const surfaced = result.conflicts.filter((c) => c.classification !== "compatible");
    expect(surfaced).toHaveLength(1);
    expect(surfaced[0]!.classification).toBe("potentially-inconsistent");
  });

  it("runs pattern detection over text artifacts as well as model suggestions", () => {
    const result = computeCase("c1", [
      artifact(
        "a1",
        analysis({
          sensitiveDataCandidates: [
            { category: "face", preview: "person in frame", confidence: 0.6, sourceLocator: locator("a1") },
          ],
        }),
        "Reach me at dana.okafor@student.example any time.",
      ),
    ]);
    expect(result.redactions.some((r) => r.detector === "pattern" && r.category === "email")).toBe(true);
    expect(result.redactions.some((r) => r.detector === "model" && r.category === "face")).toBe(true);
    expect(result.redactions.every((r) => r.decision === "pending")).toBe(true);
  });
});
