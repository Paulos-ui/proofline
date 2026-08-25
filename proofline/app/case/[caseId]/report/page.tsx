import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDemoCase, isDemoCaseId } from "@/lib/demo";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadCaseBundle } from "@/lib/cases/load";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ProofPack } from "@/components/workspace/ProofPack";

export const metadata: Metadata = { title: "Proof pack", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ redact?: string }>;
}) {
  const { caseId } = await params;
  const { redact } = await searchParams;
  const redacted = new Set((redact ?? "").split(",").filter(Boolean));

  if (isDemoCaseId(caseId)) return <ProofPack bundle={getDemoCase()} redactedIds={redacted} />;
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createServerSupabase();
  const bundle = await loadCaseBundle(supabase, caseId);
  if (!bundle) notFound();

  return <ProofPack bundle={bundle} redactedIds={redacted} />;
}
