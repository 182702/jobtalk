import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { formatDate, invoiceLabel } from "@/lib/invoice";
import { formatCents } from "@/lib/money";

export const metadata = { title: "Invoices" };

type Row = { id: string; number: number; customer_name: string; issued_on: string; status: "paid" | "unpaid"; total_cents: number };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { show } = await searchParams;
  const filter = show === "unpaid" || show === "paid" ? show : "all";
  const { supabase } = await requireProfile();

  // Totals always cover every invoice; the filter only changes the list.
  const { data } = await supabase
    .from("invoices")
    .select("id, number, customer_name, issued_on, status, total_cents")
    .order("number", { ascending: false })
    .limit(500);
  const all = (data ?? []) as Row[];
  const unpaid = all.filter((i) => i.status === "unpaid");
  const outstanding = unpaid.reduce((s, i) => s + i.total_cents, 0);
  const list = filter === "all" ? all : all.filter((i) => i.status === filter);

  return (
    <main>
      <h1>Invoices</h1>
      <div className="stats">
        <div className="stat">
          <span className="muted small">Outstanding</span>
          <b>{formatCents(outstanding)}</b>
        </div>
        <div className="stat">
          <span className="muted small">Unpaid invoices</span>
          <b>{unpaid.length}</b>
        </div>
      </div>

      {all.length === 0 ? (
        <div className="card">
          <h2>No invoices yet</h2>
          <p className="muted">Finish a job, tap New, and say what you did.</p>
          <Link className="btn" href="/new">Make your first invoice</Link>
        </div>
      ) : (
        <>
          <div className="tabs">
            {(["all", "unpaid", "paid"] as const).map((f) => (
              <Link key={f} href={f === "all" ? "/invoices" : `/invoices?show=${f}`} className={filter === f ? "on" : ""}>
                {f[0].toUpperCase() + f.slice(1)}
              </Link>
            ))}
          </div>
          <div className="list">
            {list.map((i) => (
              <Link key={i.id} className="item" href={`/invoices/${i.id}`}>
                <span>
                  {i.customer_name || "Customer"}
                  <small>
                    {invoiceLabel(i.number)} · {formatDate(i.issued_on)}
                  </small>
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  {formatCents(i.total_cents)}
                  <span className={`pill ${i.status}`}>{i.status === "paid" ? "Paid" : "Unpaid"}</span>
                </span>
              </Link>
            ))}
            {list.length === 0 && <p className="muted">Nothing here.</p>}
          </div>
        </>
      )}
    </main>
  );
}
