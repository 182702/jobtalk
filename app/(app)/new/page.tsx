import Link from "next/link";
import { NewInvoice } from "@/components/NewInvoice";
import { requireProfile } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getUsage } from "@/lib/usage";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

export const metadata = { title: "New invoice" };

export default async function NewPage() {
  const { supabase, profile } = await requireProfile();
  const usage = await getUsage(supabase, profile.id);
  if (isAdminEmail(profile.email)) usage.plan = "solo"; // owner: unlimited, hide the free-plan counter
  const needsSetup = !profile.business_name;
  const lang = await getUiLang();
  const T = translator(lang);
  const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true });

  return (
    <main>
      <h1>{T("New invoice")}</h1>
      <p className="sub">{T("Say what you did. Mention hours, parts, and prices.")}</p>
      {needsSetup && (
        <div className="card">
          <b>{T("Set up your business first")}</b>
          <p className="muted" style={{ margin: "4px 0 10px" }}>{T("Add your business name, hourly rate, and tax rate so invoices come out right.")}</p>
          <Link className="btn alt small" href="/start">{T("Start the 1-minute setup")}</Link>
        </div>
      )}
      <NewInvoice taxRateBps={profile.tax_rate_bps} usage={usage} uiLang={lang} firstTime={!count} />
    </main>
  );
}
