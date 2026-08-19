import { describe, expect, it } from "vitest";
import { classifyCandidate, detectConflicts, generateCandidates, statusBucket } from "@/lib/conflicts/engine";
import type { Claim } from "@/lib/schemas/case";

const claim = (id: string, subject: string, predicate: string, object: string, text: string, speaker: string, artifactId = "a1"): Claim => ({
  id,
  caseId: "c1",
  eventId: null,
  text,
  speakerOrSource: speaker,
  normalized: { subject, predicate, object },
  confidence: 0.85,
  sources: [{ artifactId, locator: { artifactId, type: "text-range", startOffset: 0, endOffset: 10 }, excerpt: text }],
});

describe("status reading", () => {
  it("recognises settled and pending vocabularies", () => {
    expect(statusBucket("cleared")?.bucket).toBe("settled");
    expect(statusBucket("still pending review")?.bucket).toBe("pending");
  });

  it("prefers the more specific phrase", () => {
    expect(statusBucket("label created, not yet collected")?.bucket).toBe("not-dispatched");
  });

  it("keeps payment and dispatch vocabularies in separate groups", () => {
    expect(statusBucket("cleared")?.group).toBe("payment");
    expect(statusBucket("shipped")?.group).toBe("dispatch");
  });
});

describe("candidate generation", () => {
  it("pairs claims about the same subject", () => {
    const claims = [
      claim("c1", "transfer PL-1", "has status", "cleared", "It cleared", "Seller"),
      claim("c2", "transfer PL-1", "has status", "pending", "Shows pending", "Receipt", "a2"),
    ];
    expect(generateCandidates(claims)).toHaveLength(1);
  });

  it("ignores claims about unrelated subjects", () => {
    const claims = [
      claim("c1", "transfer PL-1", "has status", "cleared", "It cleared", "Seller"),
      claim("c2", "weather in Lagos", "was", "rainy", "It rained", "Notes", "a2"),
    ];
    expect(generateCandidates(claims)).toHaveLength(0);
  });

  it("does not compare a claim with itself via an identical locator", () => {
    const a = claim("c1", "transfer PL-1", "has status", "cleared", "It cleared", "Seller");
    const b = { ...a, id: "c2" };
    expect(generateCandidates([a, b])).toHaveLength(0);
  });
});

describe("classification", () => {
  it("flags opposing payment statuses as a potential inconsistency, not a lie", () => {
    const candidates = generateCandidates([
      claim("c1", "transfer PL-1", "has status", "cleared", "The payment has cleared", "M. Reyes"),
      claim("c2", "transfer PL-1", "has status", "pending", "Status: Pending", "Receipt", "a2"),
    ]);
    const result = classifyCandidate(candidates[0]!);
    expect(result.classification).toBe("potentially-inconsistent");
    expect(result.dimension).toBe("status");
    expect(result.explanation).toMatch(/has not established which is correct/i);
    expect(result.explanation).not.toMatch(/lie|lied|fraud|fake|guilty/i);
  });

  it("treats agreeing statuses as compatible", () => {
    const candidates = generateCandidates([
      claim("c1", "transfer PL-1", "has status", "pending", "Still pending", "Receipt"),
      claim("c2", "transfer PL-1", "has status", "pending until 4 march", "Not released yet", "Support", "a2"),
    ]);
    expect(classifyCandidate(candidates[0]!).classification).toBe("compatible");
  });

  it("does not treat a payment status and a dispatch status as a disagreement", () => {
    const candidates = generateCandidates([
      claim("c1", "order 88", "has status", "cleared", "Payment cleared", "Seller"),
      claim("c2", "order 88", "has status", "shipped", "Parcel shipped", "Courier", "a2"),
    ]);
    expect(classifyCandidate(candidates[0]!).dimension).not.toBe("status");
  });

  it("flags differing amounts for the same subject", () => {
    const candidates = generateCandidates([
      claim("c1", "transfer PL-1", "has amount", "$560.00 all in", "$560 all in", "Chat"),
      claim("c2", "transfer PL-1", "has amount", "$575.00 including courier", "settled at $575.00", "Email", "a2"),
    ]);
    const result = classifyCandidate(candidates[0]!);
    expect(result.classification).toBe("potentially-inconsistent");
    expect(result.dimension).toBe("amount");
  });

  it("downgrades to unresolved when both claims are weakly supported", () => {
    const weak = (id: string, object: string, artifactId: string) => ({
      ...claim(id, "transfer PL-1", "has status", object, object, "Source", artifactId),
      confidence: 0.2,
    });
    const candidates = generateCandidates([weak("c1", "cleared", "a1"), weak("c2", "pending", "a2")]);
    expect(classifyCandidate(candidates[0]!).classification).toBe("unresolved");
  });
});

describe("detectConflicts", () => {
  it("surfaces potential inconsistencies before weaker findings", () => {
    const conflicts = detectConflicts("c1", [
      claim("c1", "transfer PL-1", "has status", "pending", "Pending", "Receipt"),
      claim("c2", "transfer PL-1", "has status", "pending", "Also pending", "Support", "a2"),
      claim("c3", "transfer PL-1", "has status", "cleared", "Cleared", "Seller", "a3"),
    ]);
    expect(conflicts[0]!.classification).toBe("potentially-inconsistent");
    expect(conflicts.at(-1)!.classification).toBe("compatible");
  });

  it("carries the sources of both sides so the user can compare them", () => {
    const conflicts = detectConflicts("c1", [
      claim("c1", "transfer PL-1", "has status", "cleared", "Cleared", "Seller", "a1"),
      claim("c2", "transfer PL-1", "has status", "pending", "Pending", "Receipt", "a2"),
    ]);
    expect(conflicts[0]!.supportingSources.map((s) => s.artifactId)).toEqual(["a1", "a2"]);
  });
});
