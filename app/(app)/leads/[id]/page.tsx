import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadDetail } from "@/components/LeadDetail";
import { requireProfile } from "@/lib/auth";
import type { Lead } from "@/lib/leads";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

export const metadata = { title: "Lead" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, profile } = await requireProfile();
  const lang = await getUiLang();
  const T = translator(lang);
  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (!lead) notFound();
  return (
    <main>
      <p className="small" style={{ margin: "0 0 10px" }}>
        <Link href="/leads">← {T("Leads")}</Link>
      </p>
      <LeadDetail lead={lead as Lead} business={profile.business_name} uiLang={lang} />
    </main>
  );
}
