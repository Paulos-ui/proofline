"use client";

import { useMemo } from "react";
import type { CaseBundle, TimelineEvent } from "@/lib/schemas/case";
import { buildTimeline, formatEventTime, precisionNote } from "@/lib/timeline/engine";
import { ConfidenceTag, RailLabel, StatusPill } from "@/components/ui/atoms";
import { entityById } from "@/lib/utils/case-derived";
import { pluralise } from "@/lib/utils/format";
import type { SourceSelection } from "@/components/workspace/SourcePanel";

/**
 * The chronology. Events are strung on the trace in order; anything the evidence
 * could not place in time sits below it in its own band rather than being guessed
 * into position.
 */
export function TimelineMode({
  bundle,
  onOpenSource,
  activeEventId,
}: {
  bundle: CaseBundle;
  onOpenSource: (selection: SourceSelection) => void;
  activeEventId: string | null;
}) {
  const timeline = useMemo(
    () => buildTimeline(bundle.events, bundle.case.incidentTimezone),
    [bundle.events, bundle.case.incidentTimezone],
  );

  return (
    <div className="pb-16">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
            Chronology
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            {pluralise(timeline.dated.length, "event")} placed in time
            {timeline.unresolved.length > 0 ? `, ${timeline.unresolved.length} without an established time` : ""}.
          </p>
        </div>
        {timeline.reviewCount > 0 ? (
          <StatusPill tone="warning">{timeline.reviewCount} events need review</StatusPill>
        ) : null}
      </header>

      <ol className="m-0 list-none p-0">
        {timeline.bands.map((band, bandIndex) => (
          <li key={band.key} className="mb-2">
            <div className="sticky top-0 z-10 flex items-center gap-3 py-2" style={{ background: "var(--surface-primary)" }}>
              <RailLabel>{band.label}</RailLabel>
              <div className="h-px grow" style={{ background: "var(--border-subtle)" }} />
            </div>
            <ol className="m-0 list-none p-0">
              {band.events.map((event, index) => (
                <EventRow
                  key={event.id}
                  bundle={bundle}
                  event={event}
                  index={bandIndex * 10 + index}
                  isActive={event.id === activeEventId}
                  isUnresolved={band.date === null}
                  onOpenSource={onOpenSource}
                />
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}

function EventRow({
  bundle,
  event,
  index,
  isActive,
  isUnresolved,
  onOpenSource,
}: {
  bundle: CaseBundle;
  event: TimelineEvent;
  index: number;
  isActive: boolean;
  isUnresolved: boolean;
  onOpenSource: (selection: SourceSelection) => void;
}) {
  const entities = event.entityIds.map((id) => entityById(bundle, id)).filter(Boolean);

  return (
    <li
      className="node-settle relative grid grid-cols-[7.5rem_1.25rem_1fr] gap-x-1 pb-6 max-sm:grid-cols-[1.25rem_1fr]"
      style={{ ["--node-delay" as string]: `${Math.min(index * 55, 700)}ms` }}
    >
      <div className="pt-[0.35rem] text-right max-sm:hidden">
        <span className="meta" style={{ color: isUnresolved ? "var(--warning)" : "var(--ink-secondary)" }}>
          {formatEventTime(event, bundle.case.incidentTimezone)}
        </span>
      </div>

      {/* the spine */}
      <div className="relative flex justify-center" aria-hidden="true">
        <div className="absolute inset-y-0 w-px" style={{ background: isUnresolved ? "var(--border-subtle)" : "var(--trace)" }} />
        <span
          className="relative mt-[0.5rem] block h-[9px] w-[9px]"
          style={{
            background: isActive ? "var(--trace-active)" : "var(--surface-primary)",
            border: `1px solid ${isActive ? "var(--trace-active)" : isUnresolved ? "var(--border-strong)" : "var(--trace)"}`,
            borderRadius: isUnresolved ? 0 : 999,
            transform: isUnresolved ? "rotate(45deg)" : "none",
          }}
        />
      </div>

      <div className="pl-3">
        <div className="sm:hidden">
          <span className="meta" style={{ color: isUnresolved ? "var(--warning)" : "var(--ink-secondary)" }}>
            {formatEventTime(event, bundle.case.incidentTimezone)}
          </span>
        </div>
        <h3 className="mt-0.5 text-[0.9375rem] font-medium leading-snug" style={{ fontFamily: "var(--font-sans)" }}>
          {event.title}
        </h3>
        <p className="mt-1 max-w-[64ch] text-sm" style={{ color: "var(--ink-muted)" }}>
          {event.description}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn cursor-pointer !px-2 !py-1 text-xs"
            style={{ border: "1px solid var(--border-subtle)", color: "var(--evidence)" }}
            onClick={() =>
              onOpenSource({
                title: event.title,
                statement: event.description,
                attribution: null,
                sources: event.sources,
                index: 0,
              })
            }
          >
            View {pluralise(event.sources.length, "source")}
          </button>
          {event.needsReview ? <StatusPill tone="warning">Needs review</StatusPill> : null}
          {event.confidence < 0.75 ? <ConfidenceTag value={event.confidence} /> : null}
          {entities.slice(0, 3).map((entity) => (
            <span key={entity!.id} className="meta" style={{ color: "var(--ink-muted)" }}>
              {entity!.canonicalName}
            </span>
          ))}
        </div>

        {event.timePrecision !== "minute" && event.timePrecision !== "exact" ? (
          <p className="meta mt-2" style={{ color: "var(--warning)" }}>
            {precisionNote(event.timePrecision)}
          </p>
        ) : null}
      </div>
    </li>
  );
}
