import { describe, expect, it } from "vitest";
import { detectSensitiveText, maskPreview, passesLuhn, redactText, hitsToSuggestions } from "@/lib/privacy/patterns";

describe("pattern detection", () => {
  it("finds email addresses", () => {
    const hits = detectSensitiveText("Contact m.reyes@kestrelsupply.example about the order.");
    expect(hits.some((h) => h.category === "email" && h.match === "m.reyes@kestrelsupply.example")).toBe(true);
  });

  it("finds international phone numbers", () => {
    const hits = detectSensitiveText("Call +44 7700 900412 after five.");
    expect(hits.some((h) => h.category === "phone")).toBe(true);
  });

  it("finds wallet addresses", () => {
    const hits = detectSensitiveText("Send to 0x88C8f8EdeC412ac8387d36efA990F817f4A41E6c please.");
    expect(hits.some((h) => h.category === "wallet-address")).toBe(true);
  });

  it("finds usernames", () => {
    expect(detectSensitiveText("ping @alex21 about it").some((h) => h.category === "username")).toBe(true);
  });

  it("uses a checksum so ordinary long numbers are not called account numbers", () => {
    expect(passesLuhn("4111111111111111")).toBe(true);
    expect(passesLuhn("1234567812345678")).toBe(false);
    expect(detectSensitiveText("Order number 1234567812345678").some((h) => h.category === "financial-account")).toBe(false);
  });

  it("does not report overlapping hits twice", () => {
    const hits = detectSensitiveText("email dana.okafor@student.example now");
    const overlapping = hits.filter((h, i) => hits.some((o, j) => i !== j && h.start < o.end && o.start < h.end));
    expect(overlapping).toHaveLength(0);
  });

  it("returns nothing for text with no sensitive values", () => {
    expect(detectSensitiveText("The parcel was collected on Thursday morning.")).toHaveLength(0);
  });

  it("is deterministic across runs", () => {
    const text = "Reach me on dana.okafor@student.example or +44 7700 900412.";
    expect(detectSensitiveText(text)).toEqual(detectSensitiveText(text));
  });
});

describe("previews and redaction", () => {
  it("masks an address without hiding which one it is", () => {
    const preview = maskPreview("dana.okafor@student.example", "email");
    expect(preview.startsWith("da")).toBe(true);
    expect(preview).toContain("@student.example");
    expect(preview).not.toContain("okafor");
  });

  it("only redacts items the user accepted", () => {
    const text = "Reach me on dana.okafor@student.example or ignore this.";
    const hits = detectSensitiveText(text);
    const suggestions = hitsToSuggestions("a1", hits, (hit) => ({
      artifactId: "a1",
      type: "text-range",
      startOffset: hit.start,
      endOffset: hit.end,
    }));
    expect(redactText(text, suggestions)).toBe(text);
    const accepted = suggestions.map((s) => ({ ...s, decision: "redact" as const }));
    const output = redactText(text, accepted);
    expect(output).toContain("[redacted]");
    expect(output).not.toContain("dana.okafor@student.example");
  });

  it("redacts multiple ranges without corrupting offsets", () => {
    const text = "a@b.example and c@d.example";
    const hits = detectSensitiveText(text);
    const accepted = hitsToSuggestions("a1", hits, (hit) => ({
      artifactId: "a1",
      type: "text-range",
      startOffset: hit.start,
      endOffset: hit.end,
    })).map((s) => ({ ...s, decision: "redact" as const }));
    expect(redactText(text, accepted)).toBe("[redacted] and [redacted]");
  });
});
