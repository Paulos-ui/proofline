"use client";

import { useMemo, useRef, useState } from "react";
import type { CaseBundle, Entity, Relationship } from "@/lib/schemas/case";
import { ConfidenceTag, EmptyState, RailLabel, StatusPill } from "@/components/ui/atoms";
import { entityById } from "@/lib/utils/case-derived";
import type { SourceSelection } from "@/components/workspace/SourcePanel";

/**
 * A constrained relationship graph, laid out deterministically rather than by force
 * simulation. Parties sit on a central ring; the things they act on (transactions,
 * products, records) sit outside it. The same case always produces the same picture,
 * which matters when a graph is used as evidence of how things connect.
 */

const TYPE_TONE: Record<string, string> = {
  person: "var(--ink-primary)",
  organization: "var(--analysis)",
  platform: "var(--analysis)",
  email: "var(--ink-muted)",
  phone: "var(--ink-muted)",
  account: "var(--ink-muted)",
  transaction: "var(--evidence)",
  product: "var(--verified)",
  other: "var(--ink-muted)",
};

type Node = { entity: Entity; x: number; y: number; ring: "inner" | "outer" };

const WIDTH = 900;
const HEIGHT = 540;

export function ConnectionsMode({
  bundle,
  onOpenSource,
}: {
  bundle: CaseBundle;
  onOpenSource: (selection: SourceSelection) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "parties" | "objects">("all");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number } | null>(null);

  const { nodes, edges } = useMemo(() => layout(bundle, filter), [bundle, filter]);
  const selected = selectedId ? entityById(bundle, selectedId) : null;
  const selectedEdges = selectedId
    ? bundle.relationships.filter((r) => r.sourceEntityId === selectedId || r.targetEntityId === selectedId)
    : [];

  if (bundle.entities.length === 0) {
    return <EmptyState title="No parties identified yet" body="Once evidence has been processed, the people, organisations and records it mentions appear here with the relationships between them." />;
  }

  return (
    <div className="pb-16">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
            How things connect
          </h2>
          <p className="mt-1 max-w-[60ch] text-sm" style={{ color: "var(--ink-muted)" }}>
            {bundle.entities.length} parties and records, {bundle.relationships.length} relationships. Dashed links are
            possible matches Proofline did not merge.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "parties", "objects"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className="btn cursor-pointer !px-2.5 !py-1 text-xs"
              style={{
                border: `1px solid ${filter === value ? "var(--ink-primary)" : "var(--border-subtle)"}`,
                color: filter === value ? "var(--ink-primary)" : "var(--ink-muted)",
              }}
            >
              {value === "all" ? "Everything" : value === "parties" ? "Parties only" : "Records only"}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="panel relative overflow-hidden" style={{ background: "var(--surface-elevated)" }}>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="block w-full cursor-grab touch-none active:cursor-grabbing"
            style={{ height: 540 }}
            role="img"
            aria-label={`Relationship graph with ${nodes.length} nodes and ${edges.length} connections`}
            onPointerDown={(event) => {
              dragging.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
              (event.target as Element).setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!dragging.current) return;
              setPan({ x: event.clientX - dragging.current.x, y: event.clientY - dragging.current.y });
            }}
            onPointerUp={() => {
              dragging.current = null;
            }}
          >
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`} style={{ transformOrigin: "center" }}>
              {edges.map((edge) => (
                <EdgeLine
                  key={edge.relationship.id}
                  edge={edge}
                  dimmed={Boolean(selectedId) && edge.relationship.sourceEntityId !== selectedId && edge.relationship.targetEntityId !== selectedId}
                />
              ))}
              {nodes.map((node) => (
                <NodeMark
                  key={node.entity.id}
                  node={node}
                  selected={node.entity.id === selectedId}
                  dimmed={
                    Boolean(selectedId) &&
                    node.entity.id !== selectedId &&
                    !selectedEdges.some(
                      (r) => r.sourceEntityId === node.entity.id || r.targetEntityId === node.entity.id,
                    )
                  }
                  onSelect={() => setSelectedId(node.entity.id === selectedId ? null : node.entity.id)}
                />
              ))}
            </g>
          </svg>

          <div className="absolute bottom-3 right-3 flex gap-1">
            <button type="button" className="btn btn-secondary cursor-pointer !px-2 !py-1 text-xs" onClick={() => setZoom((z) => Math.min(2.4, z + 0.2))} aria-label="Zoom in">
              +
            </button>
            <button type="button" className="btn btn-secondary cursor-pointer !px-2 !py-1 text-xs" onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))} aria-label="Zoom out">
              −
            </button>
            <button type="button" className="btn btn-secondary cursor-pointer !px-2 !py-1 text-xs" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
              Reset
            </button>
          </div>
        </div>

        <aside className="panel p-4">
          {selected ? (
            <>
              <RailLabel>{selected.type}</RailLabel>
              <h3 className="mt-1 text-lg" style={{ fontFamily: "var(--font-display)" }}>
                {selected.canonicalName}
              </h3>
              {selected.aliases.length > 0 ? (
                <p className="meta mt-1">also seen as {selected.aliases.join(", ")}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <ConfidenceTag value={selected.confidence} showValue />
                {selected.resolution === "possible-match" ? <StatusPill tone="warning">Possible match</StatusPill> : null}
              </div>

              <RailLabel className="mt-5">Appears in</RailLabel>
              <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
                {selected.mentions.map((mention) => (
                  <li key={mention.id}>
                    <button
                      type="button"
                      className="cursor-pointer text-left text-sm underline decoration-dotted underline-offset-4"
                      style={{ color: "var(--evidence)" }}
                      onClick={() =>
                        onOpenSource({
                          title: selected.canonicalName,
                          statement: mention.surfaceText,
                          attribution: `Mention in ${mention.artifactId}`,
                          sources: [{ artifactId: mention.artifactId, locator: mention.locator, excerpt: mention.surfaceText }],
                          index: 0,
                        })
                      }
                    >
                      {mention.surfaceText}
                    </button>
                  </li>
                ))}
              </ul>

              <RailLabel className="mt-5">Relationships</RailLabel>
              <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
                {selectedEdges.map((relationship) => {
                  const other = entityById(
                    bundle,
                    relationship.sourceEntityId === selected.id ? relationship.targetEntityId : relationship.sourceEntityId,
                  );
                  return (
                    <li key={relationship.id} className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                      <span className="meta">{relationship.type.replace(/-/g, " ")}</span>
                      <br />
                      {other?.canonicalName ?? "unknown"}
                      {relationship.label ? <span className="meta"> · {relationship.label}</span> : null}
                    </li>
                  );
                })}
                {selectedEdges.length === 0 ? (
                  <li className="text-sm" style={{ color: "var(--ink-muted)" }}>
                    No relationships recorded for this party.
                  </li>
                ) : null}
              </ul>
            </>
          ) : (
            <div>
              <RailLabel>Select a node</RailLabel>
              <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                Choose any party or record to see where it appears in the evidence and what it is connected to.
              </p>
              <ul className="m-0 mt-4 flex list-none flex-col gap-1.5 p-0">
                {bundle.entities.map((entity) => (
                  <li key={entity.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(entity.id)}
                      className="flex w-full cursor-pointer items-center gap-2 py-0.5 text-left text-sm"
                      style={{ color: "var(--ink-secondary)" }}
                    >
                      <span style={{ width: 7, height: 7, background: TYPE_TONE[entity.type] ?? "var(--ink-muted)", borderRadius: entity.type === "person" ? 999 : 1 }} />
                      {entity.canonicalName}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

type Edge = { relationship: Relationship; from: Node; to: Node };

function layout(bundle: CaseBundle, filter: "all" | "parties" | "objects"): { nodes: Node[]; edges: Edge[] } {
  const isParty = (entity: Entity) => ["person", "organization", "platform", "email", "phone", "account"].includes(entity.type);
  const visible = bundle.entities.filter((entity) =>
    filter === "all" ? true : filter === "parties" ? isParty(entity) : !isParty(entity),
  );

  const inner = visible.filter(isParty);
  const outer = visible.filter((entity) => !isParty(entity));

  const place = (list: Entity[], radiusX: number, radiusY: number, offset: number): Node[] =>
    list.map((entity, index) => {
      const angle = (index / Math.max(list.length, 1)) * Math.PI * 2 + offset;
      return {
        entity,
        x: WIDTH / 2 + Math.cos(angle) * radiusX,
        y: HEIGHT / 2 + Math.sin(angle) * radiusY,
        ring: isParty(entity) ? ("inner" as const) : ("outer" as const),
      };
    });

  const nodes = [...place(inner, 175, 110, -Math.PI / 2), ...place(outer, 350, 210, -Math.PI / 2 + 0.4)];
  const byId = new Map(nodes.map((node) => [node.entity.id, node]));

  const edges = bundle.relationships.flatMap((relationship) => {
    const from = byId.get(relationship.sourceEntityId);
    const to = byId.get(relationship.targetEntityId);
    return from && to ? [{ relationship, from, to }] : [];
  });

  return { nodes, edges };
}

function EdgeLine({ edge, dimmed }: { edge: Edge; dimmed: boolean }) {
  const { from, to, relationship } = edge;
  const isPossible = relationship.type === "same-as" && (relationship.label ?? "").startsWith("Possible match");
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2 - 18;
  return (
    <g opacity={dimmed ? 0.15 : 1} style={{ transition: "opacity 200ms" }}>
      <path
        d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
        fill="none"
        stroke={isPossible ? "var(--warning)" : "var(--trace)"}
        strokeWidth="1"
        strokeDasharray={isPossible ? "4 4" : undefined}
      />
      <text x={midX} y={midY} textAnchor="middle" style={{ fontFamily: "var(--font-mono)", fontSize: 9, fill: "var(--ink-muted)" }}>
        {relationship.type.replace(/-/g, " ")}
      </text>
    </g>
  );
}

function NodeMark({
  node,
  selected,
  dimmed,
  onSelect,
}: {
  node: Node;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const color = TYPE_TONE[node.entity.type] ?? "var(--ink-muted)";
  const isPerson = node.entity.type === "person";
  const size = node.ring === "inner" ? 9 : 7;

  return (
    <g
      opacity={dimmed ? 0.2 : 1}
      style={{ transition: "opacity 200ms", cursor: "pointer" }}
      onClick={onSelect}
      tabIndex={0}
      role="button"
      aria-label={`${node.entity.canonicalName}, ${node.entity.type}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="node-settle"
    >
      {selected ? <circle cx={node.x} cy={node.y} r={size + 7} fill="none" stroke="var(--trace-active)" strokeWidth="1" /> : null}
      {isPerson ? (
        <circle cx={node.x} cy={node.y} r={size} fill="var(--surface-elevated)" stroke={color} strokeWidth="1.6" />
      ) : (
        <rect x={node.x - size} y={node.y - size} width={size * 2} height={size * 2} fill="var(--surface-elevated)" stroke={color} strokeWidth="1.6" />
      )}
      <text
        x={node.x}
        y={node.y + size + 14}
        textAnchor="middle"
        style={{ fontFamily: "var(--font-sans)", fontSize: 11, fill: "var(--ink-secondary)" }}
      >
        {node.entity.canonicalName.length > 24 ? `${node.entity.canonicalName.slice(0, 22)}…` : node.entity.canonicalName}
      </text>
    </g>
  );
}
