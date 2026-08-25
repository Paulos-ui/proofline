import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { MarketingHeader, MarketingFooter } from "@/components/marketing/Chrome";
import { EmptyState, RailLabel, StatusPill } from "@/components/ui/atoms";
import { NewCaseForm } from "@/components/workspace/NewCaseForm";
import { formatDateTime } from "@/lib/utils/format";
import { shortHash } from "@/lib/integrity/hash";

export const metadata: Metadata = { title: "Your cases" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return (
      <>
        <MarketingHeader />
        <main id="main" className="mx-auto w-full max-w-[64rem] px-4 py-16 md:px-6">
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            Your cases
          </h1>
          <div className="mt-6">
            <EmptyState
              title="This deployment is running in demonstration mode"
              body="No Supabase project is configured, so cases cannot be created or stored here. The demonstration case and file verification both work without one. START-HERE.md explains how to connect a project."
              action={
                <Link href="/demo" className="btn btn-primary cursor-pointer">
                  Open the demonstration case
                </Link>
              }
            />
          </div>
        </main>
        <MarketingFooter />
      </>
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/dashboard");

  const { data: cases } = await supabase
    .from("cases")
    .select("id, ref, title, status, updated_at, last_processed_at, merkle_root")
    .order("updated_at", { ascending: false });

  const { data: counts } = await supabase.from("artifacts").select("case_id");
  const artifactCount = (caseId: string) => (counts ?? []).filter((row) => row.case_id === caseId).length;

  return (
    <>
      <MarketingHeader />
      <main id="main" className="mx-auto w-full max-w-[64rem] px-4 py-14 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <RailLabel>Signed in as {user.email}</RailLabel>
            <h1 className="mt-2 text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Your cases
            </h1>
          </div>
          <Link href="/demo" className="btn btn-secondary cursor-pointer">
            Explore the demo case
          </Link>
        </div>

        <div className="mt-8">
          <NewCaseForm />
        </div>

        <section className="mt-10">
          <RailLabel>{cases?.length ?? 0} cases</RailLabel>
          {cases && cases.length > 0 ? (
            <ul className="m-0 mt-3 flex list-none flex-col gap-px p-0" style={{ background: "var(--border-subtle)" }}>
              {cases.map((item) => (
                <li key={item.id} style={{ background: "var(--surface-elevated)" }}>
                  <Link href={`/case/${item.id}`} className="flex cursor-pointer flex-wrap items-center gap-x-5 gap-y-2 p-4">
                    <span className="meta shrink-0">{item.ref}</span>
                    <span className="min-w-0 grow truncate text-sm font-medium">{item.title}</span>
                    <StatusPill tone={item.status === "ready" ? "verified" : "neutral"}>{item.status}</StatusPill>
                    <span className="meta shrink-0">{artifactCount(item.id)} artifacts</span>
                    <span className="meta shrink-0">
                      {item.last_processed_at ? formatDateTime(item.last_processed_at) : "not processed"}
                    </span>
                    <span className="meta shrink-0">{item.merkle_root ? shortHash(item.merkle_root) : "no manifest"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              <EmptyState
                title="Nothing here yet"
                body="A case is a container for one incident: the files, the chronology built from them, and the fingerprints that let you check later whether anything changed."
              />
            </div>
          )}
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
