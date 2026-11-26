import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { formatDate } from "@/lib/invoice";
import { dueLeads, followUpState, isOpen, LEAD_STAGES, pipelineCents, STAGE_LABEL, wonThisMonthCents, ymd, type Lead, type LeadStage } from "@/lib/leads";
import { formatCents } from "@/lib/money";
import { translator } from "@/lib/ui";
import { getUiLang } from "@/lib/ui-server";

export const metadata = { title: "Leads" };

type Show = "open" | LeadStage | "all";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { supabase } = await requireProfile();
  const lang = await getUiLang();
  const T = translator(lang);
  const locale = lang === "es" ? "es-US" : "en-US";
  const { show: raw } = await searchParams;
  const show: Show = raw === "all" || (LEAD_STAGES as readonly string[]).includes(raw ?? "") ? (raw as Show) : "open";

  const { data, error } = await supabase.from("leads").select("*").order("updated_at", { ascending: false }).limit(1000);
  if (error) {
    return (
      <main>
        <h1>{T("Leads")}</h1>
        <div className="card">
          <p style={{ margin: 0 }}>{T("Lead Tracker is almost ready. Check back soon.")}</p>
        </div>
      </main>
    );
  }
  const leads = (data ?? []) as Lead[];
  // Server time is UTC; a day off near midnight only shifts the "due" list by a few hours.
  const today = ymd();
  const due = dueLeads(leads, today);
  const count = (s: Show) => (s === "all" ? leads.length : s === "open" ? leads.filter(isOpen).length : leads.filter((l) => l.stage === s).length);
  const list = show === "all" ? leads : show === "open" ? leads.filter(isOpen) : leads.filter((l) => l.stage === show);
  const tabs: Show[] = ["open", ...LEAD_STAGES, "all"];
  const tabLabel = (s: Show) => (s === "open" ? T("Open") : s === "all" ? T("All") : T(STAGE_LABEL[s]));

  return (
    <main>
      <div className="leadHead">
        <h1 style={{ margin: 0 }}>{T("Leads")}</h1>
        <Link className="btn small" href="/leads/new">
          {T("+ Add lead")}
        </Link>
      </div>
      <p className="sub">{T("Every lead in one place. Follow up on time and win more jobs.")}</p>

      {leads.length === 0 ? (
        <div className="card">
          <b>{T("Add your first lead")}</b>
          <p className="muted" style={{ margin: "4px 0 10px" }}>
            {T("Someone called, texted or messaged you about a job? Add them here, pick a day to follow up, and send a ready-made text.")}
          </p>
          <Link className="btn" href="/leads/new">
            {T("+ Add lead")}
          </Link>
        </div>
      ) : (
        <>
          <div className="stats three">
            <div className="stat">
              <span className="muted small">{T("Follow-ups due")}</span>
              <b>{due.length}</b>
            </div>
            <div className="stat">
              <span className="muted small">{T("Open jobs value")}</span>
              <b>{formatCents(pipelineCents(leads))}</b>
            </div>
            <div className="stat">
              <span className="muted small">{T("Won this month")}</span>
              <b>{formatCents(wonThisMonthCents(leads))}</b>
            </div>
          </div>

          {due.length > 0 && (
            <div className="card fuToday">
              <b>{T("Follow up today")}</b>
              <div className="list" style={{ marginTop: 8 }}>
                {due.map((l) => (
                  <Link key={l.id} className="item" href={`/leads/${l.id}`}>
                    <span>
                      {l.name}
                      <small>{l.follow_up_note || l.job || T(STAGE_LABEL[l.stage])}</small>
                    </span>
                    {followUpState(l, today) === "overdue" ? <span className="pill missing">{T("Overdue")}</span> : <span className="pill unpaid">{T("Today")}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="tabs scroll">
            {tabs.map((s) => (
              <Link key={s} href={s === "open" ? "/leads" : `/leads?show=${s}`} className={show === s ? "on" : ""}>
                {tabLabel(s)} <span className="tabCount">{count(s)}</span>
              </Link>
            ))}
          </div>
          <div className="list">
            {list.map((l) => (
              <Link key={l.id} className="item" href={`/leads/${l.id}`}>
                <span>
                  {l.name}
                  <small>
                    {[l.job, l.follow_up_on && isOpen(l) ? `${T("Follow up")} ${formatDate(l.follow_up_on, locale)}` : ""].filter(Boolean).join(" · ") || T("No details yet")}
                  </small>
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  {l.value_cents > 0 && formatCents(l.value_cents)}
                  <span className={`pill stage-${l.stage}`}>{T(STAGE_LABEL[l.stage])}</span>
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
