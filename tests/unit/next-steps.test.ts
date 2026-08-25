import { describe, expect, it } from "vitest";
import { suggestNextSteps } from "@/lib/cases/next-steps";
import { getDemoCase } from "@/lib/demo";
import type { CaseBundle } from "@/lib/schemas/case";

const demo = getDemoCase();

describe("suggested next steps", () => {
  it("always includes preservation and a pointer to professional help", () => {
    const steps = suggestNextSteps(demo);
    const ids = steps.map((s) => s.id);
    expect(ids).toContain("preserve");
    expect(ids).toContain("seek-guidance");
  });

  it("surfaces the difference-review step when the case has flagged inconsistencies", () => {
    const steps = suggestNextSteps(demo);
    // The demo case is built around a payment inconsistency.
    expect(steps.some((s) => s.id === "review-differences")).toBe(true);
  });

  it("never uses conclusive or advice-like language", () => {
    const prose = suggestNextSteps(demo)
      .flatMap((s) => [s.title, s.body])
      .join(" ")
      .toLowerCase();
    // No verdicts.
    expect(prose).not.toMatch(/\b(lied|fraud|guilty|scammed you|proves|you must|you should immediately|definitely)\b/);
    // No legal advice framing.
    expect(prose).not.toMatch(/\b(we advise|our advice|you are entitled|sue|legal action is)\b/);
  });

  it("frames the professional-help step as general information, not advice", () => {
    const step = suggestNextSteps(demo).find((s) => s.id === "seek-guidance");
    expect(step).toBeDefined();
    expect(step!.because).toMatch(/general information, not advice/i);
  });

  it("omits difference and sensitive steps when the case has neither", () => {
    const empty: CaseBundle = {
      ...demo,
      conflicts: [],
      redactions: [],
      events: demo.events.map((e) => ({ ...e, occurredAt: e.occurredAt ?? "2026-03-03T10:00:00.000Z", timePrecision: "minute" })),
    };
    const ids = suggestNextSteps(empty).map((s) => s.id);
    expect(ids).not.toContain("review-differences");
    expect(ids).not.toContain("review-sensitive");
    expect(ids).not.toContain("fill-gaps");
    // But the always-on ones remain.
    expect(ids).toContain("preserve");
    expect(ids).toContain("seek-guidance");
  });

  it("suggests filling gaps only when an event has no established time", () => {
    const steps = suggestNextSteps(demo);
    const hasUndated = demo.events.some((e) => !e.occurredAt);
    expect(steps.some((s) => s.id === "fill-gaps")).toBe(hasUndated);
  });
});
