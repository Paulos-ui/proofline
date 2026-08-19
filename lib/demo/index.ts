import bundle from "@/fixtures/demo-case/bundle.json";
import { CaseBundleSchema, type CaseBundle } from "@/lib/schemas/case";

/**
 * The demo case is deterministic. It is parsed through the same schema as a live
 * case, so a fixture that drifts out of shape fails loudly rather than rendering
 * something the live product could not produce.
 */
let cached: CaseBundle | null = null;

export function getDemoCase(): CaseBundle {
  if (!cached) cached = CaseBundleSchema.parse(bundle);
  return cached;
}

export const DEMO_CASE_ID = "demo-marketplace-dispute";

export function isDemoCaseId(id: string): boolean {
  return id === DEMO_CASE_ID;
}
