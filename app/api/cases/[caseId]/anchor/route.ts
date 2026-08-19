import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { anchorMerkleRoot, isAnchorEnabled } from "@/lib/solana/anchor";

export const maxDuration = 120;

/**
 * Publishes the case's Merkle root as a public memo. Optional everywhere: the product
 * is fully usable with ENABLE_SOLANA_ANCHOR unset.
 */
export async function POST(_request: Request, context: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await context.params;

  if (!isAnchorEnabled()) {
    return NextResponse.json({ error: "Public anchoring is turned off on this deployment." }, { status: 501 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to anchor a case." }, { status: 401 });

  const { data: caseRow } = await supabase.from("cases").select("id, merkle_root").eq("id", caseId).maybeSingle();
  if (!caseRow) return NextResponse.json({ error: "That case does not exist, or is not yours." }, { status: 404 });
  if (!caseRow.merkle_root) {
    return NextResponse.json({ error: "Process the case first — there is no manifest to anchor yet." }, { status: 400 });
  }

  try {
    const anchor = await anchorMerkleRoot(caseRow.merkle_root);
    await supabase
      .from("cases")
      .update({
        anchor_signature: anchor.signature,
        anchor_network: anchor.cluster,
        anchored_at: anchor.anchoredAt,
      })
      .eq("id", caseId);
    await supabase.from("audit_events").insert({
      case_id: caseId,
      actor_id: user.id,
      action: "case.anchored",
      detail: { signature: anchor.signature, cluster: anchor.cluster },
    });
    return NextResponse.json({ anchor });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The anchor could not be submitted." },
      { status: 502 },
    );
  }
}
