import type { CaseBundle } from "@/lib/schemas/case";
import { caseSummary } from "@/lib/utils/case-derived";
import { buildTimeline } from "@/lib/timeline/engine";

/**
 * Suggested next steps.
 *
 * These are deliberately framed as *general options a person in this situation might
 * consider*, never as instructions and never as legal advice. Proofline organises
 * evidence; it does not tell anyone what to do about it. Each suggestion is derived
 * deterministically from what the case actually contains, so it can never invent a
 * concern the evidence does not support.
 *
 * The tone rule: describe what someone *could* do and why it is commonly useful, not
 * what they *should* do. Every list this produces is prefaced in the UI with a line
 * making clear it is general information, not advice about this specific matter.
 */

export type NextStep = {
  id: string;
  title: string;
  body: string;
  /** Which part of the case prompted this, shown as a quiet source tag. */
  because: string;
};

export function suggestNextSteps(bundle: CaseBundle): NextStep[] {
  const summary = caseSummary(bundle);
  const timeline = buildTimeline(bundle.events, bundle.case.incidentTimezone);
  const steps: NextStep[] = [];

  // Always useful: keep the originals and the manifest together.
  steps.push({
    id: "preserve",
    title: "Keep the original files and the manifest together",
    body: "People handling a dispute often keep untouched copies of every original file alongside the manifest, so the fingerprints can be checked later. Working from copies leaves the originals unchanged.",
    because: "applies to every case",
  });

  if (summary.inconsistencyCount > 0) {
    steps.push({
      id: "review-differences",
      title: `Look closely at the ${summary.inconsistencyCount} flagged difference${summary.inconsistencyCount === 1 ? "" : "s"}`,
      body: "Where two sources describe the same thing differently, it is worth opening both and reading them in context before drawing any conclusion. A difference can have an innocent explanation — a later update, a timing gap, a misunderstanding — as easily as not.",
      because: "the case contains flagged differences",
    });
  }

  if (timeline.unresolved.length > 0) {
    steps.push({
      id: "fill-gaps",
      title: "See whether the undated moments can be pinned down",
      body: `${timeline.unresolved.length} event${timeline.unresolved.length === 1 ? "" : "s"} could not be placed in time from the evidence given. If you have anything with a clear timestamp for those moments, adding it would make the chronology more complete.`,
      because: "some events have no established time",
    });
  }

  if (summary.redactionCount > 0) {
    steps.push({
      id: "review-sensitive",
      title: "Decide what to hide before sharing anything",
      body: `Proofline flagged ${summary.redactionCount} value${summary.redactionCount === 1 ? "" : "s"} that look sensitive — things like account numbers or contact details. Reviewing these before you export a copy for anyone else is a common precaution.`,
      because: "sensitive values were detected",
    });
  }

  if (bundle.manifest) {
    steps.push({
      id: "share-verifiable",
      title: "Share in a way the other side can check",
      body: "When a record is shared, giving the recipient the manifest lets them confirm for themselves that the files have not changed since you registered them. It moves the conversation from “trust me” to “check it yourself.”",
      because: "the case has a manifest",
    });
  }

  // Only ever a pointer to real help, never a substitute for it.
  steps.push({
    id: "seek-guidance",
    title: "Consider whether this needs a professional",
    body: "For anything with legal or financial weight, an organised evidence pack is a starting point, not a resolution. A relevant professional — a platform's dispute team, a consumer body, or a lawyer — can advise on the specifics that software cannot.",
    because: "general information, not advice",
  });

  return steps;
}
