import { describe, expect, it } from "vitest";
import { nameSimilarity, nameTokens, normalizeEmail, normalizePhone, resolveEntities, type ResolutionCandidate } from "@/lib/entities/resolve";
import type { EntityType } from "@/lib/schemas/extraction";

const candidate = (type: EntityType, displayName: string, artifactId = "a1", confidence = 0.8): ResolutionCandidate => ({
  temporaryId: `${displayName}-${artifactId}`,
  type,
  displayName,
  normalizedName: displayName.toLowerCase(),
  confidence,
  mention: {
    id: `m-${displayName}-${artifactId}`,
    entityId: "",
    artifactId,
    locator: { artifactId, type: "text-range", startOffset: 0, endOffset: displayName.length },
    surfaceText: displayName,
    confidence,
  },
});

describe("normalisation", () => {
  it("ignores gmail dots and plus tags", () => {
    expect(normalizeEmail("Alex.M+receipts@gmail.com")).toBe("alexm@gmail.com");
  });

  it("keeps dots meaningful on other domains", () => {
    expect(normalizeEmail("alex.m@work.example")).toBe("alex.m@work.example");
  });

  it("compares phone numbers on their last ten digits", () => {
    expect(normalizePhone("+44 7700 900412")).toBe(normalizePhone("07700900412"));
  });

  it("reads an address by its local part", () => {
    expect(nameTokens("dana.okafor@student.example")).toEqual(["dana", "okafor"]);
  });
});

describe("similarity", () => {
  it("relates a name to its abbreviated form", () => {
    expect(nameSimilarity("Alex", "Alex M.")).toBeGreaterThan(0.55);
  });

  it("does not relate unrelated names", () => {
    expect(nameSimilarity("Dana Okafor", "Kestrel Supply Co")).toBeLessThan(0.3);
  });
});

describe("entity resolution", () => {
  it("merges identical accounts across artifacts", () => {
    const { entities } = resolveEntities("c1", [
      candidate("email", "alex@mail.example", "a1"),
      candidate("email", "ALEX@mail.example", "a2"),
    ]);
    expect(entities).toHaveLength(1);
    expect(entities[0]!.mentions).toHaveLength(2);
    expect(entities[0]!.resolution).toBe("confirmed");
  });

  it("does not silently merge two people with similar names", () => {
    const { entities, possibleMatches } = resolveEntities("c1", [
      candidate("person", "Alex", "a1"),
      candidate("person", "Alex M.", "a2"),
    ]);
    expect(entities).toHaveLength(2);
    expect(possibleMatches).toHaveLength(1);
    expect(entities.every((e) => e.resolution === "possible-match")).toBe(true);
  });

  it("proposes a link between a person and their address without merging them", () => {
    const { entities, possibleMatches } = resolveEntities("c1", [
      candidate("person", "Dana Okafor", "a1"),
      candidate("email", "dana.okafor@student.example", "a2"),
    ]);
    expect(entities).toHaveLength(2);
    expect(possibleMatches[0]!.similarity).toBeLessThan(1);
    expect(possibleMatches[0]!.reason).toMatch(/confirm before/i);
  });

  it("never compares identities against products", () => {
    const { possibleMatches } = resolveEntities("c1", [
      candidate("person", "Kestrel", "a1"),
      candidate("product", "Kestrel", "a2"),
    ]);
    expect(possibleMatches).toHaveLength(0);
  });

  it("keeps confidence below certainty even with many corroborating mentions", () => {
    const { entities } = resolveEntities(
      "c1",
      Array.from({ length: 12 }, (_, i) => candidate("email", "alex@mail.example", `a${i}`, 0.9)),
    );
    expect(entities[0]!.confidence).toBeLessThanOrEqual(0.98);
  });
});
