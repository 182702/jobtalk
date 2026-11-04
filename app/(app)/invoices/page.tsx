import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { formatDate, invoiceLabel } from "@/lib/invoice";
import { formatCents } from "@/lib/money";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

export const metadata = { title: "Invoices" };

type Row = { id: string; number: number; customer_name: string; issued_on: string; status: "paid" | "unpaid"; total_cents: number; line_items: { rate_cents: number }[] };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const filter = show === "unpaid" || show === "paid" ? show : "all";
  const { supabase, profile } = await requireProfile();
  const lang = await getUiLang();
  const T = translator(lang);
  const tabLabel = { all: T("All"), unpaid: T("Unpaid"), paid: T("Paid") };

  // Totals always cover every invoice; the filter only changes the list.
  const { data } = await supabase
    .from("invoices")
    .select("id, number, customer_name, issued_on, status, total_cents, line_items(rate_cents)")
    .order("number", { ascending: false })
    .limit(500);
  const all = (data ?? []) as Row[];
  const unpaid = all.filter((i) => i.status === "unpaid");
  const outstanding = unpaid.reduce((s, i) => s + i.total_cents, 0);
  const list = filter === "all" ? all : all.filter((i) => i.status === filter);

  return (
    <main>
      <h1>{T("Invoices")}</h1>
      {!profile.business_name && (
        <div className="card">
          <b>{T("Finish setting up (1 minute)")}</b>
          <p className="muted" style={{ margin: "4px 0 10px" }}>{T("Add your business name and rates so your invoices come out right.")}</p>
          <Link className="btn small" href="/start">{T("Start setup")}</Link>
        </div>
      )}
      <div className="stats">
        <div className="stat">
          <span className="muted small">{T("Outstanding")}</span>
          <b>{formatCents(outstanding)}</b>
        </div>
        <div className="stat">
          <span className="muted small">{T("Unpaid invoices")}</span>
          <b>{unpaid.length}</b>
        </div>
      </div>

      {all.length === 0 ? (
        <div className="card">
          <h2>{T("No invoices yet")}</h2>
          <ol className="steps">
            <li className={profile.business_name ? "done" : ""}>
              {profile.business_name ? "✓ " : ""}
              <Link href="/start">{T("Set up your business")}</Link>
            </li>
            <li>{T("Finish a job, tap + New, and say what you did.")}</li>
            <li>{T("Check the invoice and email it to your customer.")}</li>
          </ol>
          <Link className="btn" href="/new">{T("Make your first invoice")}</Link>
        </div>
      ) : (
        <>
          <div className="tabs">
            {(["all", "unpaid", "paid"] as const).map((f) => (
              <Link key={f} href={f === "all" ? "/invoices" : `/invoices?show=${f}`} className={filter === f ? "on" : ""}>
                {tabLabel[f]}
              </Link>
            ))}
          </div>
          <div className="list">
            {list.map((i) => (
              <Link key={i.id} className="item" href={`/invoices/${i.id}`}>
                <span>
                  {i.customer_name || T("Customer")}
                  <small>
                    {invoiceLabel(i.number)} · {formatDate(i.issued_on, lang === "es" ? "es-US" : "en-US")}
                  </small>
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  {(i.line_items ?? []).some((l) => !(l.rate_cents > 0)) ? (
                    <span className="pill missing">{T("Price missing")}</span>
                  ) : (
                    formatCents(i.total_cents)
                  )}
                  <span className={`pill ${i.status}`}>{i.status === "paid" ? T("Paid") : T("Unpaid")}</span>
                </span>
              </Link>
            ))}
            {list.length === 0 && <p className="muted">{T("Nothing here.")}</p>}
          </div>
        </>
      )}
    </main>
  );
}
