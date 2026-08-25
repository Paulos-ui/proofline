import type { TimelineEvent } from "@/lib/schemas/case";
import type { TimePrecision } from "@/lib/schemas/extraction";

/**
 * Chronology rules:
 *  - An event with no stated time never receives one. It goes to the unresolved band.
 *  - A date-only event sorts at the start of its day but is displayed as a date.
 *  - Ties break on precision (more precise first), then title, so ordering is stable.
 */

export type TimelineBand = {
  key: string;
  /** ISO date (YYYY-MM-DD) for dated bands, or null for the unresolved band. */
  date: string | null;
  label: string;
  events: TimelineEvent[];
};

export type OrderedTimeline = {
  bands: TimelineBand[];
  unresolved: TimelineEvent[];
  dated: TimelineEvent[];
  reviewCount: number;
  span: { start: string; end: string } | null;
};

const PRECISION_RANK: Record<TimePrecision, number> = {
  exact: 0,
  minute: 1,
  hour: 2,
  day: 3,
  inferred: 4,
  unknown: 5,
};

export function isDated(event: TimelineEvent): boolean {
  return event.occurredAt !== null && event.timePrecision !== "unknown" && !Number.isNaN(Date.parse(event.occurredAt));
}

export function compareEvents(a: TimelineEvent, b: TimelineEvent): number {
  const aTime = a.occurredAt ? Date.parse(a.occurredAt) : Number.NaN;
  const bTime = b.occurredAt ? Date.parse(b.occurredAt) : Number.NaN;
  const aValid = !Number.isNaN(aTime);
  const bValid = !Number.isNaN(bTime);
  if (aValid && bValid && aTime !== bTime) return aTime - bTime;
  if (aValid !== bValid) return aValid ? -1 : 1;
  const rank = PRECISION_RANK[a.timePrecision] - PRECISION_RANK[b.timePrecision];
  if (rank !== 0) return rank;
  return a.title.localeCompare(b.title);
}

function dayKey(iso: string, timeZone: string): string {
  // en-CA yields YYYY-MM-DD, which is what we want as a stable band key.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(iso),
  );
}

export function buildTimeline(events: TimelineEvent[], timeZone = "UTC"): OrderedTimeline {
  const dated = events.filter(isDated).sort(compareEvents);
  const unresolved = events.filter((e) => !isDated(e)).sort((a, b) => a.title.localeCompare(b.title));

  const bandMap = new Map<string, TimelineBand>();
  for (const event of dated) {
    const key = dayKey(event.occurredAt!, timeZone);
    let band = bandMap.get(key);
    if (!band) {
      band = {
        key,
        date: key,
        label: new Intl.DateTimeFormat("en-GB", {
          timeZone,
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(event.occurredAt!)),
        events: [],
      };
      bandMap.set(key, band);
    }
    band.events.push(event);
  }

  const bands = [...bandMap.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  if (unresolved.length > 0) {
    bands.push({ key: "unresolved", date: null, label: "Time not established", events: unresolved });
  }

  const first = dated[0]?.occurredAt ?? null;
  const last = dated[dated.length - 1]?.occurredAt ?? null;

  return {
    bands,
    unresolved,
    dated,
    reviewCount: events.filter((e) => e.needsReview).length,
    span: first && last ? { start: first, end: last } : null,
  };
}

/** Formats a timestamp at no greater precision than the evidence supports. */
export function formatEventTime(event: TimelineEvent, timeZone = "UTC"): string {
  if (!event.occurredAt || event.timePrecision === "unknown") return "Time not established";
  const date = new Date(event.occurredAt);
  if (Number.isNaN(date.getTime())) return "Time not established";
  const opts: Intl.DateTimeFormatOptions = { timeZone };
  switch (event.timePrecision) {
    case "exact":
    case "minute":
      return new Intl.DateTimeFormat("en-GB", { ...opts, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
    case "hour":
      return `${new Intl.DateTimeFormat("en-GB", { ...opts, hour: "2-digit", hour12: false }).format(date)}:00 (hour)`;
    case "day":
      return "Date only";
    case "inferred":
      return `${new Intl.DateTimeFormat("en-GB", { ...opts, hour: "2-digit", minute: "2-digit", hour12: false }).format(date)} (inferred)`;
    default:
      return "Time not established";
  }
}

export function precisionNote(precision: TimePrecision): string {
  switch (precision) {
    case "exact":
      return "Timestamp stated in the source.";
    case "minute":
      return "Source states the time to the minute.";
    case "hour":
      return "Source establishes the hour only.";
    case "day":
      return "Source establishes the date but not the time.";
    case "inferred":
      return "Position inferred from surrounding evidence, not stated directly.";
    case "unknown":
      return "No time information was found in the supporting evidence.";
  }
}
