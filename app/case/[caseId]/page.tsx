import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { CaseWorkspace } from "@/components/workspace/CaseWorkspace";
import { GuidedCaseFlow } from "@/components/workspace/GuidedCaseFlow";
import { EvidenceIntake } from "@/components/evidence/EvidenceIntake";
import { createServerSupabase } from "@/lib/supabase/server";
import { loadCaseBundle } from "@/lib/cases/load";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAnalysisConfigured } from "@/lib/ai/config";
import { getDemoCase, isDemoCaseId } from "@/lib/demo";
import { DemoBanner } from "@/components/workspace/DemoBanner";
import { suggestNextSteps } from "@/lib/cases/next-steps";

export const metadata: Metadata = { title: "Case" };
export const dynamic = "force-dynamic";

export default async function CasePage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { caseId } = await params;
  const { view } = await searchParams;

  // The demonstration case is reachable by id as well as at /demo. It is already
  // processed, so it always shows the full workspace.
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
  const isReady = bundle.case.status === "ready" && bundle.artifacts.length > 0;
  const wantsWorkspace = view === "workspace";
  const wantsSummary = view === "summary";

  // Routing between the two views:
  //  - An unprocessed case defaults to the guided on-ramp (collect → context → analyze).
  //  - A processed case defaults to the full workspace.
  //  - ?view=summary always shows the guided summary + next steps (reachable from the
  //    workspace header), and ?view=workspace always shows the workspace.
  // The user is never trapped in one view.
  const showGuided = wantsSummary || (!isReady && !wantsWorkspace);

  if (showGuided) {
    return (
      <GuidedCaseFlow
        bundle={bundle}
        canProcess={analysisReady}
        processDisabledReason={
          !analysisReady
            ? "Extraction needs ANTHROPIC_API_KEY on the server. Uploading and fingerprinting still work without it."
            : undefined
        }
        nextSteps={suggestNextSteps(bundle)}
      />
    );
  }

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
