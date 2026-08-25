"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Artifact } from "@/lib/schemas/case";
import type { SourceLocator } from "@/lib/schemas/locator";
import { describeLocator, formatMs } from "@/lib/schemas/locator";

/**
 * Renders an artifact with the exact region that supports a statement brought
 * forward. This is the answer to "where did that come from" — everything else in the
 * artifact is dimmed rather than hidden, so the region is always seen in context.
 */
export function SourceViewer({
  artifact,
  locator,
  compact = false,
}: {
  artifact: Artifact;
  locator: SourceLocator;
  compact?: boolean;
}) {
  if (locator.type === "image-region" && artifact.previewPath) {
    return <ImageRegionView artifact={artifact} locator={locator} compact={compact} />;
  }
  if (locator.type === "audio-range") {
    return <AudioRangeView artifact={artifact} locator={locator} />;
  }
  if (locator.type === "pdf-page") {
    return <PdfPageView artifact={artifact} locator={locator} compact={compact} />;
  }
  return <TextRangeView artifact={artifact} locator={locator} compact={compact} />;
}

function RegionFrame({ children, caption }: { children: React.ReactNode; caption: string }) {
  return (
    <figure className="m-0">
      <div className="overflow-hidden border" style={{ borderColor: "var(--border-subtle)", borderRadius: 3 }}>
        {children}
      </div>
      <figcaption className="meta mt-2">{caption}</figcaption>
    </figure>
  );
}

function ImageRegionView({
  artifact,
  locator,
  compact,
}: {
  artifact: Artifact;
  locator: Extract<SourceLocator, { type: "image-region" }>;
  compact: boolean;
}) {
  const { bbox } = locator;
  const [zoomed, setZoomed] = useState(false);
  const pct = (n: number) => `${n * 100}%`;

  // Zoom transform that brings the region to the centre of the frame.
  const scale = Math.min(4, 0.8 / Math.max(bbox.width, bbox.height));
  const originX = (bbox.x + bbox.width / 2) * 100;
  const originY = (bbox.y + bbox.height / 2) * 100;

  return (
    <RegionFrame
      caption={`${artifact.filename} · ${describeLocator(locator)} · x ${bbox.x.toFixed(2)} y ${bbox.y.toFixed(2)} w ${bbox.width.toFixed(2)} h ${bbox.height.toFixed(2)}`}
    >
      <div className="relative bg-sunken">
        <div
          className="relative"
          style={{
            transform: zoomed ? `scale(${scale})` : "scale(1)",
            transformOrigin: `${originX}% ${originY}%`,
            transition: "transform 380ms cubic-bezier(0.65,0,0.35,1)",
          }}
        >
            <img
            src={artifact.previewPath ?? ""}
            alt={`${artifact.filename}. ${artifact.summary ?? ""}`}
            className="block w-full"
            style={{ maxHeight: compact ? 320 : 560, objectFit: "contain", objectPosition: "top" }}
          />
          <div className="pointer-events-none absolute inset-0" style={{ background: "rgba(10,11,12,0.55)" }} />
          <div
            className="pointer-events-none absolute"
            style={{
              left: pct(bbox.x),
              top: pct(bbox.y),
              width: pct(bbox.width),
              height: pct(bbox.height),
              boxShadow: "0 0 0 9999px rgba(0,0,0,0)",
              outline: "1.5px solid var(--trace-active)",
              background: "transparent",
              backdropFilter: "brightness(1.9)",
            }}
          />
        </div>
        <button
          type="button"
          onClick={() => setZoomed((value) => !value)}
          className="btn btn-secondary absolute right-2 top-2 cursor-pointer !bg-[var(--surface-elevated)] !px-2 !py-1 text-xs"
        >
          {zoomed ? "Fit artifact" : "Zoom to region"}
        </button>
      </div>
      {locator.excerpt ? (
        <p className="border-t px-3 py-2 text-sm" style={{ borderColor: "var(--border-subtle)", color: "var(--ink-secondary)" }}>
          <span className="rail-label mr-2">Read</span>
          {locator.excerpt}
        </p>
      ) : null}
    </RegionFrame>
  );
}

function PdfPageView({
  artifact,
  locator,
  compact,
}: {
  artifact: Artifact;
  locator: Extract<SourceLocator, { type: "pdf-page" }>;
  compact: boolean;
}) {
  return (
    <RegionFrame caption={`${artifact.filename} · ${describeLocator(locator)}`}>
      <div className="bg-sunken">
        <object
          data={`${artifact.previewPath}#page=${locator.page}&view=FitH`}
          type="application/pdf"
          className="block w-full"
          style={{ height: compact ? 280 : 460 }}
          aria-label={`${artifact.filename}, page ${locator.page}`}
        >
          <p className="p-4 text-sm" style={{ color: "var(--ink-secondary)" }}>
            This browser cannot display the PDF inline.{" "}
            <a href={artifact.previewPath ?? "#"} className="underline" style={{ color: "var(--evidence)" }}>
              Open {artifact.filename}
            </a>
            .
          </p>
        </object>
      </div>
      {locator.excerpt ? (
        <blockquote
          className="m-0 border-t px-3 py-2 text-sm"
          style={{ borderColor: "var(--border-subtle)", color: "var(--ink-secondary)" }}
        >
          <span className="rail-label mr-2">Page {locator.page}</span>
          {locator.excerpt}
        </blockquote>
      ) : null}
    </RegionFrame>
  );
}

function AudioRangeView({
  artifact,
  locator,
}: {
  artifact: Artifact;
  locator: Extract<SourceLocator, { type: "audio-range" }>;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  const startFraction = duration > 0 ? locator.startMs / 1000 / duration : 0;
  const widthFraction = duration > 0 ? (locator.endMs - locator.startMs) / 1000 / duration : 0;

  const playRange = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = locator.startMs / 1000;
    void audio.play();
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setPosition(audio.currentTime);
      if (audio.currentTime * 1000 >= locator.endMs) audio.pause();
    };
    const onMeta = () => setDuration(audio.duration || 0);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
    };
  }, [locator.endMs]);

  return (
    <RegionFrame caption={`${artifact.filename} · ${describeLocator(locator)}`}>
      <div className="p-3">
        <div className="relative h-14 overflow-hidden" style={{ background: "var(--surface-sunken)", borderRadius: 2 }}>
          <Waveform />
          <div
            className="absolute inset-y-0"
            style={{
              left: `${startFraction * 100}%`,
              width: `${Math.max(widthFraction, 0.02) * 100}%`,
              background: "color-mix(in srgb, var(--trace-active) 22%, transparent)",
              borderLeft: "1.5px solid var(--trace-active)",
              borderRight: "1.5px solid var(--trace-active)",
            }}
          />
          {duration > 0 ? (
            <div
              className="absolute inset-y-0 w-px"
              style={{ left: `${(position / duration) * 100}%`, background: "var(--ink-primary)" }}
            />
          ) : null}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button type="button" onClick={playRange} className="btn btn-secondary cursor-pointer !py-1.5 text-xs">
            Play {formatMs(locator.startMs)} – {formatMs(locator.endMs)}
          </button>
          <audio ref={audioRef} src={artifact.previewPath ?? ""} controls className="h-8 grow" preload="metadata" />
        </div>
        {locator.transcript ? (
          <p className="mt-3 text-sm" style={{ color: "var(--ink-secondary)" }}>
            <span className="rail-label mr-2">Transcript</span>
            {locator.transcript}
          </p>
        ) : null}
        {artifact.transcript ? (
          <p className="meta mt-2" style={{ color: "var(--warning)" }}>
            Seeded transcript — the audio in this demonstration case is synthetic and was not produced by a
            transcription service.
          </p>
        ) : null}
      </div>
    </RegionFrame>
  );
}

/** Deterministic pseudo-waveform. It represents position in the file, not amplitude. */
function Waveform() {
  const bars = useMemo(
    () =>
      Array.from({ length: 96 }, (_, i) => {
        const value = Math.abs(Math.sin(i * 0.7) * 0.6 + Math.sin(i * 0.23) * 0.4);
        return 18 + value * 60;
      }),
    [],
  );
  return (
    <div className="absolute inset-0 flex items-center gap-px px-1" aria-hidden="true">
      {bars.map((height, i) => (
        <span key={i} className="grow" style={{ height: `${height}%`, background: "var(--trace)", opacity: 0.55 }} />
      ))}
    </div>
  );
}

function TextRangeView({
  artifact,
  locator,
  compact,
}: {
  artifact: Artifact;
  locator: SourceLocator;
  compact: boolean;
}) {
  const content = artifact.textContent ?? artifact.transcript ?? "";
  const range = locator.type === "text-range" ? locator : null;

  const [before, highlighted, after] = useMemo(() => {
    if (!range || !content) return ["", locator.excerpt ?? "", ""];
    const start = Math.min(range.startOffset, content.length);
    const end = Math.min(range.endOffset, content.length);
    return [content.slice(0, start), content.slice(start, end), content.slice(end)];
  }, [content, range, locator.excerpt]);

  if (!content) {
    return (
      <RegionFrame caption={`${artifact.filename} · ${describeLocator(locator)}`}>
        <blockquote className="m-0 p-3 text-sm" style={{ color: "var(--ink-secondary)" }}>
          {locator.excerpt ?? "No excerpt was stored for this source."}
        </blockquote>
      </RegionFrame>
    );
  }

  return (
    <RegionFrame caption={`${artifact.filename} · ${describeLocator(locator)}`}>
      <pre
        className="m-0 overflow-auto whitespace-pre-wrap p-3 text-[0.8125rem] leading-relaxed"
        style={{
          fontFamily: "var(--font-mono)",
          maxHeight: compact ? 260 : 420,
          color: "var(--ink-muted)",
          background: "var(--surface-sunken)",
        }}
      >
        {before}
        <mark
          style={{
            background: "color-mix(in srgb, var(--trace-active) 24%, transparent)",
            color: "var(--ink-primary)",
            outline: "1px solid var(--trace-active)",
            padding: "1px 2px",
          }}
        >
          {highlighted}
        </mark>
        {after}
      </pre>
    </RegionFrame>
  );
}
