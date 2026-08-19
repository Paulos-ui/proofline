/**
 * Seeded content for Proofline's demonstration case.
 *
 * Every person, company, account and transaction below is fictional. The evidence
 * files in public/demo/artifacts are generated, not collected.
 *
 * This file holds only what an analyser would return per artifact. Entity
 * resolution, conflict detection, sensitive-data detection and the manifest are all
 * produced by the shipped engines at build time (scripts/build-demo-fixtures.ts),
 * so the demo exercises the same code paths as a live case.
 */
import type { SourceLocator } from "@/lib/schemas/locator";
import type { EntityType, TimePrecision } from "@/lib/schemas/extraction";

export const DEMO_CASE = {
  id: "demo-marketplace-dispute",
  ref: "PL-84F2",
  title: "Marketplace laptop purchase — payment and delivery dispute",
  description:
    "A used laptop bought through a marketplace listing. The seller states the payment cleared and the parcel was sent; the buyer's receipt and the courier record show something different.",
  incidentTimezone: "UTC",
  createdAt: "2026-03-06T11:00:00.000Z",
  lastProcessedAt: "2026-03-06T11:04:22.000Z",
};

export type DemoArtifact = {
  id: string;
  filename: string;
  mimeType: string;
  kind:
    | "screenshot"
    | "chat-log"
    | "email"
    | "receipt"
    | "invoice"
    | "document"
    | "photo"
    | "audio"
    | "shipping-record"
    | "other";
  summary: string;
  dimensions?: { width: number; height: number };
  transcriptFile?: string;
  /** Text artifacts are read from disk so pattern detection runs on real content. */
  isText?: boolean;
};

export const DEMO_ARTIFACTS: DemoArtifact[] = [
  {
    id: "art-01",
    filename: "chat-01-agreement.png",
    mimeType: "image/png",
    kind: "chat-log",
    summary:
      "Marketplace chat from 2 March. The seller lists the machine at $560 and states that the price includes courier delivery. The buyer says they will transfer the next morning.",
    dimensions: { width: 720, height: 1280 },
  },
  {
    id: "art-02",
    filename: "chat-02-payment-claim.png",
    mimeType: "image/png",
    kind: "chat-log",
    summary:
      "Marketplace chat from 3 March containing the seller's account details, the buyer's transfer reference, and the seller's statement at 11:41 that the payment had cleared.",
    dimensions: { width: 720, height: 1280 },
  },
  {
    id: "art-03",
    filename: "receipt-original.png",
    mimeType: "image/png",
    kind: "receipt",
    summary:
      "Transfer receipt captured by the buyer on 3 March at 11:47. Amount $560.00, reference PL-TRF-4471-9082, status shown as Pending.",
    dimensions: { width: 800, height: 1120 },
  },
  {
    id: "art-04",
    filename: "email-seller-confirmation.eml",
    mimeType: "message/rfc822",
    kind: "email",
    summary:
      "Email from the seller timestamped 3 March 11:41 stating the payment cleared and describing the order total as $575.00 including a courier fee.",
    isText: true,
  },
  {
    id: "art-05",
    filename: "shipping-notice.pdf",
    mimeType: "application/pdf",
    kind: "shipping-record",
    summary:
      "Courier consignment note created 5 March at 16:20. Tracking NL8842190334, declared value $560.00, status at print: label created, not yet collected.",
  },
  {
    id: "art-06",
    filename: "voice-note-seller.wav",
    mimeType: "audio/wav",
    kind: "audio",
    summary:
      "Voice note from the seller on 5 March at 18:40 saying the laptop is boxed and will be taken to the courier the following morning.",
    transcriptFile: "voice-note-seller.transcript.txt",
  },
  {
    id: "art-07",
    filename: "support-transcript.txt",
    mimeType: "text/plain",
    kind: "document",
    summary:
      "Payment provider support conversation from 6 March. The agent states the transfer was held in a review queue from 3 March 11:23 and released on 4 March at 08:05.",
    isText: true,
  },
  {
    id: "art-08",
    filename: "chat-03-followup.png",
    mimeType: "image/png",
    kind: "chat-log",
    summary:
      "Marketplace chat from 5 March. The seller says the parcel went out that morning; the buyer points to a later voice note saying it goes out the next day.",
    dimensions: { width: 720, height: 1280 },
  },
];

const img = (artifactId: string, x: number, y: number, w: number, h: number, excerpt: string): SourceLocator => ({
  artifactId,
  type: "image-region",
  bbox: { x, y, width: w, height: h },
  excerpt,
  recognizedText: excerpt,
});

const email = (field: "from" | "to" | "subject" | "date" | "body", excerpt: string): SourceLocator => ({
  artifactId: "art-04",
  type: "email-field",
  field,
  excerpt,
});

const text = (artifactId: string, start: number, end: number, excerpt: string): SourceLocator => ({
  artifactId,
  type: "text-range",
  startOffset: start,
  endOffset: end,
  excerpt,
});

const audio = (start: number, end: number, transcript: string): SourceLocator => ({
  artifactId: "art-06",
  type: "audio-range",
  startMs: start,
  endMs: end,
  transcript,
  excerpt: transcript,
});

const pdf = (page: number, excerpt: string, bbox?: { x: number; y: number; width: number; height: number }): SourceLocator => ({
  artifactId: "art-05",
  type: "pdf-page",
  page,
  excerpt,
  ...(bbox ? { bbox } : {}),
});

export type DemoEntityCandidate = {
  temporaryId: string;
  type: EntityType;
  displayName: string;
  confidence: number;
  surfaceText: string;
  locator: SourceLocator;
};

export const DEMO_ENTITY_CANDIDATES: DemoEntityCandidate[] = [
  { temporaryId: "e-reyes-1", type: "person", displayName: "M. Reyes", confidence: 0.88, surfaceText: "M. Reyes", locator: img("art-01", 0.1, 0.04, 0.35, 0.03, "M. Reyes") },
  { temporaryId: "e-reyes-2", type: "person", displayName: "M. Reyes", confidence: 0.9, surfaceText: "M. Reyes", locator: img("art-02", 0.1, 0.04, 0.35, 0.03, "M. Reyes") },
  { temporaryId: "e-reyes-3", type: "person", displayName: "M. Reyes", confidence: 0.82, surfaceText: "M. Reyes · Kestrel Supply Co", locator: img("art-03", 0.4, 0.53, 0.45, 0.03, "M. Reyes · Kestrel Supply Co") },
  { temporaryId: "e-reyes-email", type: "email", displayName: "m.reyes@kestrelsupply.example", confidence: 0.97, surfaceText: "M. Reyes <m.reyes@kestrelsupply.example>", locator: email("from", "M. Reyes <m.reyes@kestrelsupply.example>") },
  { temporaryId: "e-dana-1", type: "person", displayName: "Dana Okafor", confidence: 0.86, surfaceText: "Dana Okafor · ****4417", locator: img("art-03", 0.4, 0.46, 0.45, 0.03, "Dana Okafor · ****4417") },
  { temporaryId: "e-dana-email", type: "email", displayName: "dana.okafor@student.example", confidence: 0.96, surfaceText: "Dana Okafor <dana.okafor@student.example>", locator: email("to", "Dana Okafor <dana.okafor@student.example>") },
  { temporaryId: "e-kestrel-1", type: "organization", displayName: "Kestrel Supply Co", confidence: 0.9, surfaceText: "Kestrel Supply Co", locator: img("art-02", 0.06, 0.16, 0.55, 0.04, "Account is Kestrel Supply Co") },
  { temporaryId: "e-kestrel-2", type: "organization", displayName: "Kestrel Supply Co", confidence: 0.84, surfaceText: "Sender: Kestrel Supply Co", locator: pdf(1, "Sender: Kestrel Supply Co") },
  { temporaryId: "e-payloop", type: "platform", displayName: "PayLoop", confidence: 0.93, surfaceText: "PayLoop", locator: img("art-03", 0.06, 0.03, 0.3, 0.05, "PayLoop — Transfer receipt") },
  { temporaryId: "e-northline", type: "organization", displayName: "Northline Courier", confidence: 0.91, surfaceText: "NORTHLINE COURIER", locator: pdf(1, "NORTHLINE COURIER") },
  { temporaryId: "e-txn", type: "transaction", displayName: "PL-TRF-4471-9082", confidence: 0.96, surfaceText: "Reference PL-TRF-4471-9082", locator: img("art-03", 0.4, 0.39, 0.35, 0.03, "PL-TRF-4471-9082") },
  { temporaryId: "e-txn-2", type: "transaction", displayName: "PL-TRF-4471-9082", confidence: 0.92, surfaceText: "Sent. Reference PL-TRF-4471-9082.", locator: img("art-02", 0.38, 0.25, 0.57, 0.04, "Sent. Reference PL-TRF-4471-9082.") },
  { temporaryId: "e-tracking", type: "other", displayName: "NL8842190334", confidence: 0.94, surfaceText: "Tracking number NL8842190334", locator: pdf(1, "Tracking number NL8842190334") },
  { temporaryId: "e-laptop", type: "product", displayName: "14 inch laptop", confidence: 0.79, surfaceText: "the 14 inch model", locator: img("art-01", 0.06, 0.155, 0.58, 0.045, "the 14 inch model is still available") },
  { temporaryId: "e-agent", type: "person", displayName: "K. Aduba", confidence: 0.71, surfaceText: "PayLoop Support (agent K. Aduba)", locator: text("art-07", 232, 268, "PayLoop Support (agent K. Aduba)") },
];

export type DemoEvent = {
  id: string;
  title: string;
  description: string;
  occurredAt: string | null;
  timePrecision: TimePrecision;
  confidence: number;
  entityRefs: string[];
  needsReview?: boolean;
  sources: Array<{ locator: SourceLocator; excerpt: string }>;
};

export const DEMO_EVENTS: DemoEvent[] = [
  {
    id: "ev-01",
    title: "Price agreed at $560 including delivery",
    description: "The seller quotes $560 for the 14 inch model and states that courier delivery is included in that figure.",
    occurredAt: "2026-03-02T16:09:00.000Z",
    timePrecision: "minute",
    confidence: 0.88,
    entityRefs: ["e-reyes-1", "e-laptop"],
    sources: [{ locator: img("art-01", 0.04, 0.29, 0.62, 0.05, "Yes, $560 all in. Courier is on me."), excerpt: "Yes, $560 all in. Courier is on me." }],
  },
  {
    id: "ev-02",
    title: "Seller sends account details",
    description: "The seller provides a bank account in the name of Kestrel Supply Co for the transfer.",
    occurredAt: "2026-03-03T11:22:00.000Z",
    timePrecision: "minute",
    confidence: 0.91,
    entityRefs: ["e-reyes-2", "e-kestrel-1"],
    sources: [{ locator: img("art-02", 0.04, 0.145, 0.58, 0.075, "Account is Kestrel Supply Co, sort 04-00-72, acct 41827735."), excerpt: "Account is Kestrel Supply Co, sort 04-00-72, acct 41827735." }],
  },
  {
    id: "ev-03",
    title: "Buyer sends transfer of $560.00",
    description: "The buyer reports sending the transfer and gives the reference PL-TRF-4471-9082.",
    occurredAt: "2026-03-03T11:38:00.000Z",
    timePrecision: "minute",
    confidence: 0.93,
    entityRefs: ["e-dana-1", "e-txn"],
    sources: [{ locator: img("art-02", 0.38, 0.245, 0.58, 0.05, "Sent. Reference PL-TRF-4471-9082."), excerpt: "Sent. Reference PL-TRF-4471-9082." }],
  },
  {
    id: "ev-04",
    title: "Seller states the payment has cleared",
    description: "The seller states in chat, and again by email at the same minute, that the payment cleared on their side.",
    occurredAt: "2026-03-03T11:41:00.000Z",
    timePrecision: "minute",
    confidence: 0.9,
    entityRefs: ["e-reyes-2", "e-txn"],
    needsReview: true,
    sources: [
      { locator: img("art-02", 0.04, 0.315, 0.63, 0.075, "The payment has cleared on my end. Posting it out shortly."), excerpt: "The payment has cleared on my end. Posting it out shortly." },
      { locator: email("body", "the payment has cleared on my end and the order is now settled at $575.00"), excerpt: "the payment has cleared on my end and the order is now settled at $575.00" },
    ],
  },
  {
    id: "ev-05",
    title: "Receipt captured showing status Pending",
    description: "The buyer's receipt for the same reference, captured six minutes after the seller's message, shows the transfer as pending.",
    occurredAt: "2026-03-03T11:47:00.000Z",
    timePrecision: "minute",
    confidence: 0.94,
    entityRefs: ["e-txn", "e-payloop"],
    needsReview: true,
    sources: [
      { locator: img("art-03", 0.39, 0.318, 0.16, 0.035, "Status: Pending"), excerpt: "Status: Pending" },
      { locator: img("art-03", 0.39, 0.595, 0.42, 0.032, "Initiated 3 March 2026, 11:47"), excerpt: "Initiated 3 March 2026, 11:47" },
    ],
  },
  {
    id: "ev-06",
    title: "Payment provider releases the funds",
    description: "Support states the transfer sat in a review queue from 3 March 11:23 and was released to the recipient on 4 March at 08:05.",
    occurredAt: "2026-03-04T08:05:00.000Z",
    timePrecision: "minute",
    confidence: 0.87,
    entityRefs: ["e-payloop", "e-txn", "e-agent"],
    sources: [{ locator: text("art-07", 330, 470, "the transfer was placed in a pending review queue on 3 March at 11:23 and released to the recipient on 4 March at 08:05"), excerpt: "placed in a pending review queue on 3 March at 11:23 and released to the recipient on 4 March at 08:05" }],
  },
  {
    id: "ev-07",
    title: "Seller states the parcel went out that morning",
    description: "In response to a request for tracking, the seller says the parcel was sent that morning.",
    occurredAt: "2026-03-05T14:52:00.000Z",
    timePrecision: "minute",
    confidence: 0.89,
    entityRefs: ["e-reyes-2"],
    needsReview: true,
    sources: [{ locator: img("art-08", 0.04, 0.235, 0.6, 0.05, "It went out this morning, tracking to follow."), excerpt: "It went out this morning, tracking to follow." }],
  },
  {
    id: "ev-08",
    title: "Courier label created, parcel not yet collected",
    description: "The consignment note is created at 16:20 on 5 March and records the status as label created, not yet collected.",
    occurredAt: "2026-03-05T16:20:00.000Z",
    timePrecision: "minute",
    confidence: 0.92,
    entityRefs: ["e-northline", "e-tracking"],
    sources: [
      { locator: pdf(1, "Created 5 March 2026, 16:20", { x: 0.07, y: 0.25, width: 0.4, height: 0.04 }), excerpt: "Created 5 March 2026, 16:20" },
      { locator: pdf(1, "Status at print: Label created — not yet collected", { x: 0.07, y: 0.3, width: 0.45, height: 0.04 }), excerpt: "Status at print: Label created — not yet collected" },
    ],
  },
  {
    id: "ev-09",
    title: "Voice note: parcel will go to the courier tomorrow",
    description: "The seller leaves a voice note saying the laptop is boxed and will be dropped at the courier the following morning.",
    occurredAt: "2026-03-05T18:40:00.000Z",
    timePrecision: "minute",
    confidence: 0.76,
    entityRefs: ["e-reyes-2"],
    needsReview: true,
    sources: [{ locator: audio(10000, 14000, "I will drop it at the courier tomorrow morning, first thing."), excerpt: "I will drop it at the courier tomorrow morning, first thing." }],
  },
  {
    id: "ev-10",
    title: "Buyer opens a support ticket",
    description: "The buyer contacts the payment provider about the difference between the seller's statement and the receipt.",
    occurredAt: "2026-03-06T10:02:00.000Z",
    timePrecision: "minute",
    confidence: 0.9,
    entityRefs: ["e-dana-1", "e-payloop"],
    sources: [{ locator: text("art-07", 60, 200, "I sent a transfer on 3 March for $560.00, reference PL-TRF-4471-9082."), excerpt: "I sent a transfer on 3 March for $560.00, reference PL-TRF-4471-9082." }],
  },
  {
    id: "ev-11",
    title: "Parcel handed to the courier",
    description:
      "No artifact in this case establishes when, or whether, the parcel was given to the courier. The consignment note records only that a label was created.",
    occurredAt: null,
    timePrecision: "unknown",
    confidence: 0.34,
    entityRefs: ["e-northline"],
    needsReview: true,
    sources: [{ locator: pdf(1, "A label created record confirms that shipping documentation was generated."), excerpt: "A label created record confirms that shipping documentation was generated. It does not confirm that the parcel has been handed to the courier." }],
  },
];

export type DemoClaim = {
  id: string;
  eventId: string | null;
  text: string;
  speakerOrSource: string;
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  sources: Array<{ locator: SourceLocator; excerpt: string }>;
};

export const DEMO_CLAIMS: DemoClaim[] = [
  {
    id: "cl-01",
    eventId: "ev-04",
    text: "The payment has cleared on my end.",
    speakerOrSource: "M. Reyes (marketplace chat)",
    subject: "transfer PL-TRF-4471-9082",
    predicate: "has status",
    object: "cleared",
    confidence: 0.9,
    sources: [{ locator: img("art-02", 0.04, 0.315, 0.63, 0.075, "The payment has cleared on my end."), excerpt: "The payment has cleared on my end." }],
  },
  {
    id: "cl-02",
    eventId: "ev-05",
    text: "Transfer PL-TRF-4471-9082 is shown with status Pending on the receipt captured at 11:47.",
    speakerOrSource: "PayLoop receipt",
    subject: "transfer PL-TRF-4471-9082",
    predicate: "has status",
    object: "pending",
    confidence: 0.94,
    sources: [{ locator: img("art-03", 0.39, 0.318, 0.16, 0.035, "Status: Pending"), excerpt: "Status: Pending" }],
  },
  {
    id: "cl-03",
    eventId: "ev-04",
    text: "The order is now settled at $575.00 including the courier fee we agreed.",
    speakerOrSource: "M. Reyes (email)",
    subject: "transfer PL-TRF-4471-9082",
    predicate: "has amount",
    object: "$575.00 including courier fee",
    confidence: 0.86,
    sources: [{ locator: email("body", "the order is now settled at $575.00 including the courier fee we agreed"), excerpt: "the order is now settled at $575.00 including the courier fee we agreed" }],
  },
  {
    id: "cl-04",
    eventId: "ev-01",
    text: "Yes, $560 all in. Courier is on me.",
    speakerOrSource: "M. Reyes (marketplace chat)",
    subject: "transfer PL-TRF-4471-9082",
    predicate: "has amount",
    object: "$560.00 all in",
    confidence: 0.88,
    sources: [{ locator: img("art-01", 0.04, 0.29, 0.62, 0.05, "Yes, $560 all in. Courier is on me."), excerpt: "Yes, $560 all in. Courier is on me." }],
  },
  {
    id: "cl-05",
    eventId: "ev-06",
    text: "The funds were not released until 4 March at 08:05.",
    speakerOrSource: "PayLoop support (agent K. Aduba)",
    subject: "transfer PL-TRF-4471-9082",
    predicate: "has status",
    object: "pending until 4 march 08:05",
    confidence: 0.87,
    sources: [{ locator: text("art-07", 330, 470, "The funds were not released until 4 March at 08:05."), excerpt: "The funds were not released until 4 March at 08:05." }],
  },
  {
    id: "cl-06",
    eventId: "ev-07",
    text: "It went out this morning, tracking to follow.",
    speakerOrSource: "M. Reyes (marketplace chat)",
    subject: "parcel NL8842190334",
    predicate: "has status",
    object: "went out this morning",
    confidence: 0.89,
    sources: [{ locator: img("art-08", 0.04, 0.235, 0.6, 0.05, "It went out this morning, tracking to follow."), excerpt: "It went out this morning, tracking to follow." }],
  },
  {
    id: "cl-07",
    eventId: "ev-08",
    text: "Status at print: label created — not yet collected.",
    speakerOrSource: "Northline Courier consignment note",
    subject: "parcel NL8842190334",
    predicate: "has status",
    object: "label created, not yet collected",
    confidence: 0.92,
    sources: [{ locator: pdf(1, "Status at print: Label created — not yet collected", { x: 0.07, y: 0.3, width: 0.45, height: 0.04 }), excerpt: "Status at print: Label created — not yet collected" }],
  },
  {
    id: "cl-08",
    eventId: "ev-09",
    text: "I will drop it at the courier tomorrow morning, first thing.",
    speakerOrSource: "M. Reyes (voice note)",
    subject: "parcel NL8842190334",
    predicate: "has status",
    object: "will drop at courier tomorrow",
    confidence: 0.76,
    sources: [{ locator: audio(10000, 14000, "I will drop it at the courier tomorrow morning, first thing."), excerpt: "I will drop it at the courier tomorrow morning, first thing." }],
  },
];

export type DemoRelationship = {
  source: string;
  target: string;
  type:
    | "communicated-with"
    | "paid"
    | "received-payment-from"
    | "sold-to"
    | "purchased-from"
    | "mentions"
    | "appears-in"
    | "references"
    | "shipped-to"
    | "same-as";
  label: string;
  confidence: number;
};

/** Entity ids here are temporaryIds; the build step maps them to resolved ids. */
export const DEMO_RELATIONSHIPS: DemoRelationship[] = [
  { source: "e-dana-1", target: "e-reyes-1", type: "communicated-with", label: "marketplace chat, 2–5 March", confidence: 0.94 },
  { source: "e-dana-1", target: "e-txn", type: "paid", label: "$560.00 transfer", confidence: 0.93 },
  { source: "e-kestrel-1", target: "e-txn", type: "received-payment-from", label: "recipient account", confidence: 0.88 },
  { source: "e-reyes-1", target: "e-kestrel-1", type: "same-as", label: "trades as", confidence: 0.72 },
  { source: "e-reyes-1", target: "e-laptop", type: "sold-to", label: "14 inch laptop listing", confidence: 0.85 },
  { source: "e-payloop", target: "e-txn", type: "references", label: "processed the transfer", confidence: 0.95 },
  { source: "e-northline", target: "e-tracking", type: "references", label: "consignment NL8842190334", confidence: 0.94 },
  { source: "e-kestrel-1", target: "e-northline", type: "shipped-to", label: "label created 5 March", confidence: 0.8 },
];

/** Sensitive regions inside images, which pattern matching on text cannot reach. */
export const DEMO_IMAGE_REDACTIONS = [
  {
    artifactId: "art-02",
    category: "financial-account" as const,
    preview: "sort 04-••-72, acct 418•••••35",
    confidence: 0.93,
    bbox: { x: 0.04, y: 0.145, width: 0.58, height: 0.075 },
  },
  {
    artifactId: "art-03",
    category: "financial-account" as const,
    preview: "Dana Okafor · ••••4417",
    confidence: 0.81,
    bbox: { x: 0.39, y: 0.455, width: 0.42, height: 0.035 },
  },
  {
    artifactId: "art-03",
    category: "other" as const,
    preview: "PL-TRF-••••-9082",
    confidence: 0.54,
    bbox: { x: 0.39, y: 0.39, width: 0.35, height: 0.035 },
  },
];
