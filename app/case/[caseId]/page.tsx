import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { CaseWorkspace } from "@/components/workspace/CaseWorkspace";
import { EvidenceIntake } from "@/components/evidence/EvidenceIntake";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadCaseBundle } from "@/lib/cases/load";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAnalysisConfigured } from "@/lib/ai/config";
import { getDemoCase, isDemoCaseId } from "@/lib/demo";
import { DemoBanner } from "@/components/workspace/DemoBanner";

export const metadata: Metadata = { title: "Case" };
export const dynamic = "force-dynamic";

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  // The demonstration case is reachable by id as well as at /demo.
  if (isDemoCaseId(caseId)) {
    return <CaseWorkspace bundle={getDemoCase()} banner={<DemoBanner />} />;
  }

  if (!isSupabaseConfigured()) redirect("/demo");

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/case/${caseId}`);

  const bundle = await loadCaseBundle(supabase, caseId);
  if (!bundle) notFound();

  const analysisReady = isAnalysisConfigured();

  return (
    <CaseWorkspace
      bundle={bundle}
      intake={
        <EvidenceIntake
          caseId={caseId}
          canProcess={analysisReady && bundle.artifacts.length > 0}
          processDisabledReason={
            !analysisReady
              ? "Extraction needs ANTHROPIC_API_KEY on the server. Uploading and fingerprinting still work."
              : bundle.artifacts.length === 0
                ? "Add at least one artifact first."
                : undefined
          }
        />
      }
    />
  );
}
