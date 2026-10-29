import Link from "next/link";
import { NewInvoice } from "@/components/NewInvoice";
import { requireProfile } from "@/lib/auth";
import { getUsage } from "@/lib/usage";

export const metadata = { title: "New invoice" };

export default async function NewPage() {
  const { supabase, profile } = await requireProfile();
  const usage = await getUsage(supabase, profile.id);
  const needsSetup = !profile.business_name;

  return (
    <main>
      <h1>New invoice</h1>
      <p className="sub">Say what you did. Mention hours, parts, and prices.</p>
      {needsSetup && (
        <div className="card">
          <b>Set up your business first</b>
          <p className="muted" style={{ margin: "4px 0 10px" }}>Add your business name, hourly rate, and tax rate so invoices come out right.</p>
          <Link className="btn alt small" href="/settings">Open settings</Link>
        </div>
      )}
      <NewInvoice taxRateBps={profile.tax_rate_bps} usage={usage} />
    </main>
  );
}
