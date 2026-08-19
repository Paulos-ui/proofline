import type { SensitiveCategory } from "@/lib/schemas/extraction";
import type { SourceLocator } from "@/lib/schemas/locator";
import type { RedactionSuggestion } from "@/lib/schemas/case";

/**
 * Deterministic detection runs first. Patterns are cheap, auditable and do not vary
 * between runs, which matters for a feature that decides what leaves the product.
 * The model only supplements this for context-dependent cases (e.g. an address
 * written in prose) — it never replaces it.
 */

export type PatternHit = {
  category: SensitiveCategory;
  match: string;
  start: number;
  end: number;
  confidence: number;
};

type Detector = {
  category: SensitiveCategory;
  regex: RegExp;
  confidence: number;
  /** Optional second gate for patterns that need arithmetic, not just shape. */
  validate?: (match: string) => boolean;
};

/** Luhn check keeps ordinary 16-digit strings (order numbers, IDs) out of the results. */
export function passesLuhn(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

const DETECTORS: Detector[] = [
  {
    category: "email",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    confidence: 0.96,
  },
  {
    category: "phone",
    regex: /(?:\+\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?)?\d{3,4}[\s-]?\d{3,4}[\s-]?\d{0,4}/g,
    confidence: 0.6,
    validate: (m) => {
      const digits = m.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15 && /[\s\-()+]/.test(m);
    },
  },
  {
    category: "financial-account",
    regex: /\b(?:\d[ -]?){12,19}\b/g,
    confidence: 0.9,
    validate: passesLuhn,
  },
  {
    category: "financial-account",
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g,
    confidence: 0.72,
    validate: (m) => /\d/.test(m.slice(4)),
  },
  {
    category: "wallet-address",
    regex: /\b0x[a-fA-F0-9]{40}\b/g,
    confidence: 0.97,
  },
  {
    category: "wallet-address",
    regex: /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g,
    confidence: 0.5,
    // Base58 is easy to over-match; require mixed case and no long word-like runs.
    validate: (m) => /[A-Z]/.test(m) && /[a-z]/.test(m) && /\d/.test(m) && !/(.)\1{4,}/.test(m),
  },
  {
    category: "username",
    regex: /(?:^|\s)@[A-Za-z0-9_]{3,30}\b/g,
    confidence: 0.8,
  },
  {
    category: "address",
    regex:
      /\b\d{1,5}\s+[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,3}\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Close|Crescent|Drive|Dr|Way|Boulevard|Blvd)\b\.?/g,
    confidence: 0.7,
  },
  {
    category: "government-id",
    regex: /\b(?:[A-Z]{1,3}[- ]?\d{6,10}|\d{3}-\d{2}-\d{4})\b/g,
    confidence: 0.45,
    validate: (m) => /\d{6,}/.test(m.replace(/\D/g, "")),
  },
];

/** Overlapping hits are resolved in favour of the more confident, then longer, match. */
function dedupe(hits: PatternHit[]): PatternHit[] {
  const ordered = [...hits].sort(
    (a, b) => b.confidence - a.confidence || b.end - b.start - (a.end - a.start) || a.start - b.start,
  );
  const kept: PatternHit[] = [];
  for (const hit of ordered) {
    if (kept.some((k) => hit.start < k.end && k.start < hit.end)) continue;
    kept.push(hit);
  }
  return kept.sort((a, b) => a.start - b.start);
}

export function detectSensitiveText(text: string): PatternHit[] {
  const hits: PatternHit[] = [];
  for (const detector of DETECTORS) {
    const regex = new RegExp(detector.regex.source, detector.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const raw = match[0];
      const leading = raw.length - raw.trimStart().length;
      const value = raw.trim();
      if (value.length === 0) continue;
      if (detector.validate && !detector.validate(value)) continue;
      hits.push({
        category: detector.category,
        match: value,
        start: match.index + leading,
        end: match.index + leading + value.length,
        confidence: detector.confidence,
      });
      if (match.index === regex.lastIndex) regex.lastIndex += 1;
    }
  }
  return dedupe(hits);
}

/** Keeps enough of a value to be recognisable without reprinting it in full. */
export function maskPreview(value: string, category: SensitiveCategory): string {
  if (category === "email") {
    const [local = "", domain = ""] = value.split("@");
    return `${local.slice(0, 2)}${"•".repeat(Math.max(1, local.length - 2))}@${domain}`;
  }
  if (value.length <= 6) return `${value.slice(0, 1)}${"•".repeat(value.length - 1)}`;
  return `${value.slice(0, 3)}${"•".repeat(Math.min(8, value.length - 6))}${value.slice(-3)}`;
}

export function hitsToSuggestions(
  artifactId: string,
  hits: PatternHit[],
  makeLocator: (hit: PatternHit) => SourceLocator,
  idPrefix = "rs",
): RedactionSuggestion[] {
  return hits.map((hit, index) => ({
    id: `${idPrefix}-${artifactId}-${index}`,
    artifactId,
    category: hit.category,
    locator: makeLocator(hit),
    preview: maskPreview(hit.match, hit.category),
    confidence: hit.confidence,
    detector: "pattern" as const,
    decision: "pending" as const,
  }));
}

/** Applies accepted redactions to a text derivative. Originals are never modified. */
export function redactText(text: string, suggestions: RedactionSuggestion[]): string {
  const ranges = suggestions
    .filter((s) => s.decision === "redact" && s.locator.type === "text-range")
    .map((s) => s.locator as Extract<SourceLocator, { type: "text-range" }>)
    .sort((a, b) => b.startOffset - a.startOffset);
  let out = text;
  for (const range of ranges) {
    out = out.slice(0, range.startOffset) + "[redacted]" + out.slice(range.endOffset);
  }
  return out;
}
