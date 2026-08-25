import { NextResponse } from "next/server";
import { capabilityReport } from "@/lib/ai";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAnchorEnabled } from "@/lib/solana/anchor";

/** What this deployment can actually do. Used by the UI to avoid offering dead controls. */
export function GET() {
  const ai = capabilityReport();
  return NextResponse.json({
    ok: true,
    capabilities: {
      demo: true,
      verification: true,
      storage: isSupabaseConfigured(),
      liveAnalysis: ai.analysis,
      transcription: ai.transcription,
      solanaAnchor: isAnchorEnabled(),
    },
  });
}
