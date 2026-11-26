"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LeadForm } from "@/components/LeadForm";
import { formatDate } from "@/lib/invoice";
import {
  followUpState,
  GOAL_LABEL,
  goalForStage,
  LEAD_STAGES,
  MESSAGE_GOALS,
  phoneHref,
  STAGE_LABEL,
  writeMessage,
  ymd,
  type Lead,
  type MessageChannel,
  type MessageGoal,
  type MessageLang,
} from "@/lib/leads";
import { formatCents } from "@/lib/money";
import { translator, type UiLang } from "@/lib/ui";

type Props = { lead: Lead; business: string; uiLang: UiLang };

export function LeadDetail({ lead, business, uiLang }: Props) {
  const T = translator(uiLang);
  const router = useRouter();
  const locale = uiLang === "es" ? "es-US" : "en-US";
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [today, setToday] = useState("");
  useEffect(() => setToday(ymd()), []);

  async function patch(body: Record<string, unknown>) {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || T("Something went wrong. Try again."));
    router.refresh();
  }

  async function remove() {
    if (!confirm(T("Delete this lead? This can't be undone."))) return;
    setBusy(true);
    const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setError(T("Something went wrong. Try again."));
    router.push("/leads");
    router.refresh();
  }

  if (editing) return <LeadForm uiLang={uiLang} lead={lead} onDone={() => setEditing(false)} />;

  const fu = today ? followUpState(lead, today) : "none";
  // Starts the New invoice note with what we already know; the contractor adds hours and prices.
  const jobNote = [lead.name, lead.email, lead.address].filter(Boolean).join(", ") + (lead.job ? `. ${lead.job}.` : ".");

  return (
    <>
      <div className="card">
        <div className="leadHead">
          <div>
            <h2 style={{ margin: 0 }}>{lead.name}</h2>
            {lead.job && <p className="muted" style={{ margin: "2px 0 0" }}>{lead.job}</p>}
          </div>
          <span className={`pill stage-${lead.stage}`}>{T(STAGE_LABEL[lead.stage])}</span>
        </div>
        <p className="muted small" style={{ margin: "8px 0 0" }}>
          {[lead.value_cents > 0 ? formatCents(lead.value_cents) : "", lead.source ? T(lead.source) : "", lead.address].filter(Boolean).join(" · ")}
        </p>
        <div className="contactRow">
          {lead.phone && (
            <>
              <a className="btn alt small" href={`tel:${phoneHref(lead.phone)}`}>
                📞 {T("Call")}
              </a>
              <a className="btn alt small" href={`sms:${phoneHref(lead.phone)}`}>
                💬 {T("Text")}
              </a>
            </>
          )}
          {lead.email && (
            <a className="btn alt small" href={`mailto:${lead.email}`}>
              ✉️ {T("Email")}
            </a>
          )}
          <button type="button" className="alt small" onClick={() => setEditing(true)}>
            ✏️ {T("Edit")}
          </button>
        </div>
      </div>

      <div className="card">
        <b>{T("Stage")}</b>
        <div className="stageRow" role="group" aria-label={T("Stage")}>
          {LEAD_STAGES.map((s) => (
            <button key={s} type="button" className={s === lead.stage ? "on" : "alt"} disabled={busy} aria-pressed={s === lead.stage} onClick={() => s !== lead.stage && patch({ stage: s })}>
              {T(STAGE_LABEL[s])}
            </button>
          ))}
        </div>
        {lead.stage !== "lost" && (
          <p className="small" style={{ margin: "10px 0 0" }}>
            <Link href={`/new?note=${encodeURIComponent(jobNote)}`}>
              {lead.stage === "won" ? T("Make the invoice for this job →") : T("Make an estimate for this job →")}
            </Link>
          </p>
        )}
      </div>

      <FollowUp lead={lead} state={fu} busy={busy} today={today} locale={locale} T={T} patch={patch} />

      <MessageWriter lead={lead} business={business} uiLang={uiLang} />

      {lead.notes && (
        <div className="card">
          <b>{T("Notes")}</b>
          <p className="pre" style={{ margin: "6px 0 0" }}>{lead.notes}</p>
        </div>
      )}

      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}
      <p style={{ marginTop: 18 }}>
        <button type="button" className="danger small" onClick={remove} disabled={busy}>
          {T("Delete lead")}
        </button>
      </p>
    </>
  );
}

function FollowUp({
  lead,
  state,
  busy,
  today,
  locale,
  T,
  patch,
}: {
  lead: Lead;
  state: ReturnType<typeof followUpState>;
  busy: boolean;
  today: string;
  locale: string;
  T: ReturnType<typeof translator>;
  patch: (b: Record<string, unknown>) => void;
}) {
  const [note, setNote] = useState(lead.follow_up_note);
  useEffect(() => setNote(lead.follow_up_note), [lead.follow_up_note]);
  const closed = lead.stage === "won" || lead.stage === "lost";
  const picks: [string, number][] = [
    [T("Today"), 0],
    [T("Tomorrow"), 1],
    [T("In 3 days"), 3],
    [T("Next week"), 7],
  ];
  const when = lead.follow_up_on ? formatDate(lead.follow_up_on, locale) : "";

  return (
    <div className={`card ${state === "overdue" ? "fuLate" : state === "today" ? "fuToday" : ""}`}>
      <b>{T("Follow-up")}</b>
      {closed ? (
        <p className="muted small" style={{ margin: "6px 0 0" }}>
          {T("No follow-up needed. This lead is closed.")}
        </p>
      ) : (
        <>
          <p style={{ margin: "6px 0 8px" }}>
            {state === "overdue" && <span className="pill missing">{T("Overdue")}</span>}
            {state === "today" && <span className="pill unpaid" style={{ marginLeft: 0 }}>{T("Today")}</span>}{" "}
            {lead.follow_up_on ? when : <span className="muted">{T("No follow-up set. Pick a day so you don't forget.")}</span>}
            {lead.follow_up_note && <span className="muted"> · {lead.follow_up_note}</span>}
          </p>
          {lead.follow_up_on && (state === "overdue" || state === "today") && (
            <button type="button" className="small" disabled={busy} onClick={() => patch({ follow_up_done: true })}>
              ✓ {T("Done, I reached out")}
            </button>
          )}
          <div className="field" style={{ marginTop: 10, marginBottom: 6 }}>
            <label htmlFor="funote">{T("What to do")}</label>
            <input id="funote" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder={T("e.g. Call about the estimate")} />
          </div>
          <div className="quickPicks">
            {picks.map(([label, days]) => (
              <button key={days} type="button" className="alt small" disabled={busy || !today} onClick={() => patch({ follow_up_on: ymd(new Date(), days), follow_up_note: note })}>
                {label}
              </button>
            ))}
            {lead.follow_up_on && (
              <button type="button" className="linkish small" disabled={busy} onClick={() => patch({ follow_up_on: null, follow_up_note: "" })}>
                {T("Clear")}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MessageWriter({ lead, business, uiLang }: { lead: Lead; business: string; uiLang: UiLang }) {
  const T = translator(uiLang);
  const [goal, setGoal] = useState<MessageGoal>(goalForStage(lead.stage));
  const [channel, setChannel] = useState<MessageChannel>(lead.phone || !lead.email ? "text" : "email");
  const [lang, setLang] = useState<MessageLang>(uiLang);
  const msg = useMemo(() => writeMessage({ lead, business, goal, channel, lang }), [lead, business, goal, channel, lang]);
  const [text, setText] = useState(msg.text);
  const [copied, setCopied] = useState(false);
  useEffect(() => setText(msg.text), [msg.text]);
  useEffect(() => setGoal(goalForStage(lead.stage)), [lead.stage]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(channel === "email" && msg.subject ? `${msg.subject}\n\n${text}` : text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const sendHref =
    channel === "text"
      ? lead.phone
        ? `sms:${phoneHref(lead.phone)}?&body=${encodeURIComponent(text)}`
        : ""
      : lead.email
        ? `mailto:${lead.email}?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(text)}`
        : "";

  return (
    <div className="card">
      <b>{T("Message writer")}</b>
      <p className="muted small" style={{ margin: "2px 0 10px" }}>
        {T("Pick what you need. Change any words before you send.")}
      </p>
      <div className="field">
        <label htmlFor="mgoal">{T("Message")}</label>
        <select id="mgoal" value={goal} onChange={(e) => setGoal(e.target.value as MessageGoal)}>
          {MESSAGE_GOALS.map((g) => (
            <option key={g} value={g}>
              {T(GOAL_LABEL[g])}
            </option>
          ))}
        </select>
      </div>
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="seg" role="group" aria-label={T("Send as")}>
          <button type="button" className={channel === "text" ? "on" : ""} onClick={() => setChannel("text")}>
            {T("Text")}
          </button>
          <button type="button" className={channel === "email" ? "on" : ""} onClick={() => setChannel("email")}>
            {T("Email")}
          </button>
        </div>
        <div className="seg" role="group" aria-label={T("Customer's language")}>
          <button type="button" className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
            English
          </button>
          <button type="button" className={lang === "es" ? "on" : ""} onClick={() => setLang("es")}>
            Español
          </button>
        </div>
      </div>
      {channel === "email" && msg.subject && (
        <p className="small" style={{ margin: "0 0 6px" }}>
          <span className="muted">{T("Subject:")}</span> {msg.subject}
        </p>
      )}
      <textarea aria-label={T("Message")} value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: channel === "email" ? 170 : 110 }} />
      <div className="row" style={{ marginTop: 10 }}>
        {sendHref && (
          <a className="btn" href={sendHref}>
            {channel === "text" ? T("Open in Messages") : T("Open in email")}
          </a>
        )}
        <button type="button" className="alt" onClick={copy}>
          {copied ? T("Copied ✓") : T("Copy")}
        </button>
      </div>
      {!sendHref && (
        <p className="muted small" style={{ margin: "8px 0 0" }}>
          {channel === "text" ? T("Add a phone number to send this as a text.") : T("Add an email address to send this as an email.")}
        </p>
      )}
    </div>
  );
}

