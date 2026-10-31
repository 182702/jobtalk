import { notFound } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Owner dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;

type Row = {
  id: string;
  email: string;
  business: string;
  plan: "free" | "solo";
  signedUp: Date;
  lastLogin: Date | null;
  invoices: number;
  thisWeek: number;
  emailed: number;
  lastInvoice: Date | null;
};

function ago(d: Date | null): string {
  if (!d) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

function status(r: Row): { label: string; cls: string } {
  if (r.thisWeek > 0) return { label: "Active", cls: "ok" };
  if (r.invoices > 0) return { label: "Tried it", cls: "warm" };
  return { label: "No invoices yet", cls: "cold" };
}

/** Owner-only overview of who signed up and who is actually using the app. */
export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) notFound();

  const admin = createAdminClient();
  const [usersRes, profilesRes, subsRes, invoicesRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("profiles").select("id, business_name"),
    admin.from("subscriptions").select("user_id, plan"),
    admin.from("invoices").select("user_id, created_at, sent_at").limit(50000),
  ]);

  const business = new Map((profilesRes.data ?? []).map((p) => [p.id as string, (p.business_name as string) || ""]));
  const plans = new Map((subsRes.data ?? []).map((s) => [s.user_id as string, s.plan === "solo" ? "solo" : "free"] as const));
  const weekAgo = Date.now() - 7 * DAY;

  const rows: Row[] = (usersRes.data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    business: business.get(u.id) ?? "",
    plan: plans.get(u.id) ?? "free",
    signedUp: new Date(u.created_at),
    lastLogin: u.last_sign_in_at ? new Date(u.last_sign_in_at) : null,
    invoices: 0,
    thisWeek: 0,
    emailed: 0,
    lastInvoice: null,
  }));
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const inv of invoicesRes.data ?? []) {
    const r = byId.get(inv.user_id as string);
    if (!r) continue;
    const created = new Date(inv.created_at as string);
    r.invoices++;
    if (created.getTime() > weekAgo) r.thisWeek++;
    if (inv.sent_at) r.emailed++;
    if (!r.lastInvoice || created > r.lastInvoice) r.lastInvoice = created;
  }
  rows.sort((a, b) => (b.lastInvoice?.getTime() ?? 0) - (a.lastInvoice?.getTime() ?? 0) || b.signedUp.getTime() - a.signedUp.getTime());

  const stats = [
    { label: "Sign-ups", value: rows.length },
    { label: "New this week", value: rows.filter((r) => r.signedUp.getTime() > weekAgo).length },
    { label: "Active this week", value: rows.filter((r) => r.thisWeek > 0).length },
    { label: "Paying (Solo)", value: rows.filter((r) => r.plan === "solo").length },
    { label: "Invoices made", value: rows.reduce((s, r) => s + r.invoices, 0) },
    { label: "Emailed to customers", value: rows.reduce((s, r) => s + r.emailed, 0) },
  ];
  const nudge = rows.filter((r) => r.invoices === 0);

  return (
    <main className="wide">
      <h1>Owner dashboard</h1>
      <p className="sub">Only you can see this page. Your own test accounts are included.</p>

      <div className="stats">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <span className="muted small">{s.label}</span>
            <b>{s.value}</b>
          </div>
        ))}
      </div>

      {nudge.length > 0 && (
        <div className="card">
          <h2>Needs a nudge ({nudge.length})</h2>
          <p className="muted small" style={{ marginTop: 0 }}>Signed up but haven&apos;t made an invoice. Text them and offer to help set up.</p>
          <div className="list">
            {nudge.map((r) => (
              <div key={r.id} className="item">
                <span>
                  {r.business || r.email}
                  <small>{r.business ? r.email : ""} Joined {ago(r.signedUp)}</small>
                </span>
                <a className="btn alt small" href={`mailto:${r.email}?subject=${encodeURIComponent("Need a hand getting set up on VoiceBill Pro?")}`}>
                  Email
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>All contractors</h2>
        <div className="list">
          {rows.map((r) => {
            const st = status(r);
            return (
              <div key={r.id} className="item adminRow">
                <span>
                  {r.business || r.email}
                  <small>
                    {r.business ? `${r.email} · ` : ""}joined {ago(r.signedUp)} · last login {ago(r.lastLogin)}
                  </small>
                  <small>
                    {r.invoices} invoice{r.invoices === 1 ? "" : "s"} · {r.thisWeek} this week · {r.emailed} emailed · last {ago(r.lastInvoice)}
                  </small>
                </span>
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span className={`pill tag-${st.cls}`}>{st.label}</span>
                  {r.plan === "solo" && <span className="pill tag-paid">Solo</span>}
                </span>
              </div>
            );
          })}
          {rows.length === 0 && <p className="muted">No sign-ups yet.</p>}
        </div>
      </div>
    </main>
  );
}
