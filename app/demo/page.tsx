import type { Metadata } from "next";
import { getDemoCase } from "@/lib/demo";
import { CaseWorkspace } from "@/components/workspace/CaseWorkspace";
import { DemoBanner } from "@/components/workspace/DemoBanner";

export const metadata: Metadata = {
  title: "Demonstration case",
  description:
    "A fully synthetic marketplace dispute, processed and ready to explore. No account and no API key required.",
};

export default function DemoPage() {
  const bundle = getDemoCase();
  return <CaseWorkspace bundle={bundle} banner={<DemoBanner />} />;
}
