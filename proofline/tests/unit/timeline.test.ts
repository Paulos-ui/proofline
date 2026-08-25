import { describe, expect, it } from "vitest";
import { buildTimeline, compareEvents, formatEventTime, isDated } from "@/lib/timeline/engine";
import type { TimelineEvent } from "@/lib/schemas/case";

const event = (overrides: Partial<TimelineEvent> & { id: string }): TimelineEvent => ({
  caseId: "c1",
  title: overrides.id,
  description: "",
  occurredAt: null,
  occurredAtEnd: null,
  timePrecision: "unknown",
  confidence: 0.8,
  entityIds: [],
  sources: [{ artifactId: "a1", locator: { artifactId: "a1", type: "text-range", startOffset: 0, endOffset: 5 }, excerpt: "x" }],
  needsReview: false,
  ...overrides,
});

describe("timeline ordering", () => {
  it("orders dated events chronologically regardless of input order", () => {
    const events = [
      event({ id: "third", occurredAt: "2026-03-05T09:00:00.000Z", timePrecision: "minute" }),
      event({ id: "first", occurredAt: "2026-03-03T11:38:00.000Z", timePrecision: "minute" }),
      event({ id: "second", occurredAt: "2026-03-03T11:47:00.000Z", timePrecision: "minute" }),
    ];
    expect(buildTimeline(events).dated.map((e) => e.id)).toEqual(["first", "second", "third"]);
  });

  it("keeps events with no established time out of the chronology", () => {
    const events = [
      event({ id: "known", occurredAt: "2026-03-03T11:38:00.000Z", timePrecision: "minute" }),
      event({ id: "unknown" }),
    ];
    const timeline = buildTimeline(events);
    expect(timeline.dated.map((e) => e.id)).toEqual(["known"]);
    expect(timeline.unresolved.map((e) => e.id)).toEqual(["unknown"]);
    expect(timeline.bands.at(-1)?.label).toBe("Time not established");
  });

  it("treats a timestamp with unknown precision as undated", () => {
    const e = event({ id: "x", occurredAt: "2026-03-03T11:38:00.000Z", timePrecision: "unknown" });
    expect(isDated(e)).toBe(false);
  });

  it("treats an unparseable timestamp as undated rather than throwing", () => {
    const e = event({ id: "x", occurredAt: "not-a-date", timePrecision: "minute" });
    expect(isDated(e)).toBe(false);
    expect(buildTimeline([e]).unresolved).toHaveLength(1);
  });

  it("breaks ties on precision so the more precise event comes first", () => {
    const a = event({ id: "precise", occurredAt: "2026-03-03T00:00:00.000Z", timePrecision: "minute" });
    const b = event({ id: "vague", occurredAt: "2026-03-03T00:00:00.000Z", timePrecision: "day" });
    expect(compareEvents(a, b)).toBeLessThan(0);
  });

  it("groups events into day bands", () => {
    const timeline = buildTimeline([
      event({ id: "a", occurredAt: "2026-03-03T11:38:00.000Z", timePrecision: "minute" }),
      event({ id: "b", occurredAt: "2026-03-03T11:47:00.000Z", timePrecision: "minute" }),
      event({ id: "c", occurredAt: "2026-03-04T08:05:00.000Z", timePrecision: "minute" }),
    ]);
    expect(timeline.bands.map((band) => band.events.length)).toEqual([2, 1]);
    expect(timeline.span).toEqual({ start: "2026-03-03T11:38:00.000Z", end: "2026-03-04T08:05:00.000Z" });
  });

  it("counts events flagged for review", () => {
    const timeline = buildTimeline([
      event({ id: "a", occurredAt: "2026-03-03T11:38:00.000Z", timePrecision: "minute", needsReview: true }),
      event({ id: "b", occurredAt: "2026-03-03T11:47:00.000Z", timePrecision: "minute" }),
    ]);
    expect(timeline.reviewCount).toBe(1);
  });
});

describe("time formatting never overstates precision", () => {
  it("shows a clock time only when the source stated one", () => {
    expect(formatEventTime(event({ id: "a", occurredAt: "2026-03-03T11:47:00.000Z", timePrecision: "minute" }))).toBe("11:47");
  });

  it("shows date-only evidence without a fabricated time", () => {
    expect(formatEventTime(event({ id: "a", occurredAt: "2026-03-03T00:00:00.000Z", timePrecision: "day" }))).toBe("Date only");
  });

  it("marks inferred positions as inferred", () => {
    expect(formatEventTime(event({ id: "a", occurredAt: "2026-03-03T11:00:00.000Z", timePrecision: "inferred" }))).toMatch(/inferred/);
  });

  it("says so plainly when there is no time", () => {
    expect(formatEventTime(event({ id: "a" }))).toBe("Time not established");
  });
});
