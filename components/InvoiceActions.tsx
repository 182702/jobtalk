"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { InvoiceEditor } from "@/components/InvoiceEditor";
import { InvoiceView } from "@/components/InvoiceView";
import { LocalTime } from "@/components/LocalTime";
import { SignSheet } from "@/components/SignSheet";
import { invoiceLang } from "@/lib/i18n";
import { isEstimate, missingPriceCount } from "@/lib/invoice";
import { MAX_REMINDERS, nextReminderAt } from "@/lib/reminders";
import type { Draft, InvoiceWithItems, Profile, SignatureKind } from "@/lib/types";
import { translator, type UiLang } from "@/lib/ui";

export function InvoiceActions({
  invoice,
  profile,
  link,
  text,
  uiLang,
}: {
  invoice: InvoiceWithItems;
  profile: Profile;
  link: string;
  text: string;
  uiLang: UiLang;
}) {
  const T = translator(uiLang);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [signing, setSigning] = useState<SignatureKind | null>(null);
  const signatures = invoice.signatures ?? [];
  const signed = (k: SignatureKind) => signatures.some((s) => s.kind === k);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const missing = missingPriceCount(invoice.line_items);
  const est = isEstimate(invoice);

  async function call(name: string, url: string, init: RequestInit) {
    setBusy(name);
    setMsg({});
    try {
      const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
      const data = await res.json().catch(() => ({}));
      return { res, data };
    } finally {
      setBusy("");
    }
  }

  async function togglePaid() {
    const status = invoice.status === "paid" ? "unpaid" : "paid";
    const { res, data } = await call("paid", `/api/invoices/${invoice.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    if (!res.ok) return setMsg({ err: data.error || T("Something went wrong. Try again.") });
    router.refresh();
  }

  async function convertToInvoice() {
    if (!window.confirm(T("Turn this estimate into an invoice? It keeps the same number and lines, and is dated today."))) return;
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const { res, data } = await call("convert", `/api/invoices/${invoice.id}`, { method: "PATCH", body: JSON.stringify({ convert: "invoice", issued_on: today }) });
    if (!res.ok) return setMsg({ err: data.error || T("Something went wrong. Try again.") });
    setMsg({ ok: T("It's an invoice now. Email it to your customer when the job is done.") });
    router.refresh();
  }

  async function toggleReminders() {
    const { res, data } = await call("remind", `/api/invoices/${invoice.id}`, { method: "PATCH", body: JSON.stringify({ reminders_off: !invoice.reminders_off }) });
    if (!res.ok) return setMsg({ err: data.error || T("Something went wrong. Try again.") });
    router.refresh();
  }

  async function send() {
    if (!invoice.customer_email) {
      startEdit();
      return setMsg({ err: T("Add the customer's email, save, then send.") });
    }
    let confirmMissingPrices = false;
    if (missing > 0) {
      confirmMissingPrices = window.confirm(
        missing === 1
          ? T("1 line has no price, so the total isn't final yet. Your customer will see $0.00 for it. Send anyway?")
          : T("{n} lines have no price, so the total isn't final yet. Your customer will see $0.00 for them. Send anyway?", { n: missing }),
      );
      if (!confirmMissingPrices) return;
    }
    const { res, data } = await call("send", `/api/invoices/${invoice.id}/send`, { method: "POST", body: JSON.stringify({ confirmMissingPrices }) });
    if (!res.ok) return setMsg({ err: data.error || T("Something went wrong. Try again.") });
    setMsg({ ok: T("Sent to {email}.", { email: invoice.customer_email }) });
    router.refresh();
  }

  async function copy(value: string, done: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMsg({ ok: done });
    } catch {
      setMsg({ err: T("Copy is blocked in this browser.") });
    }
  }

  async function remove() {
    if (!window.confirm(est ? T("Delete this estimate? This can't be undone.") : T("Delete this invoice? This can't be undone."))) return;
    const { res, data } = await call("delete", `/api/invoices/${invoice.id}`, { method: "DELETE" });
    if (!res.ok) return setMsg({ err: data.error || T("Something went wrong. Try again.") });
    router.push("/invoices");
    router.refresh();
  }

  function startEdit() {
    if (signatures.length && !window.confirm(T("Editing will remove your customer's signatures. They'll need to sign again. Continue?"))) return;
    setEditing(true);
  }

  function startSigning(k: SignatureKind) {
    setMsg({});
    if (missing > 0) return setMsg({ err: T("Add all prices before your customer signs.") });
    setSigning(k);
  }

  async function removeSignature(k: SignatureKind) {
    if (!window.confirm(T("Remove this signature?"))) return;
    const { res, data } = await call("unsign", `/api/invoices/${invoice.id}/signatures?kind=${k}`, { method: "DELETE" });
    if (!res.ok) return setMsg({ err: data.error || T("Something went wrong. Try again.") });
    router.refresh();
  }

  async function save(d: Draft) {
    const res = await fetch(`/api/invoices/${invoice.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return data.error || T("Couldn't save.");
    setEditing(false);
    setMsg({ ok: T("Saved.") });
    router.refresh();
  }

  if (signing) {
    return (
      <SignSheet
        invoice={invoice}
        kind={signing}
        uiLang={uiLang}
        onCancel={() => setSigning(null)}
        onDone={() => {
          setSigning(null);
          setMsg({ ok: T("Signature saved.") });
          router.refresh();
        }}
      />
    );
  }

  if (editing) {
    return (
      <>
        {msg.err && <div className="warn">{msg.err}</div>}
        <InvoiceEditor
          initial={{ ...invoice, language: invoiceLang(invoice.language), items: invoice.line_items }}
          saveLabel={T("Save changes")}
          uiLang={uiLang}
          onSave={save}
          onCancel={() => {
            setEditing(false);
            setMsg({});
          }}
        />
      </>
    );
  }

  return (
    <>
      {missing > 0 && (
        <div className="warn noprint">
          ⚠ {missing === 1 ? T("1 line has no price.") : T("{n} lines have no price.", { n: missing })}{" "}
          <a href="#" onClick={(e) => (e.preventDefault(), startEdit())}>
            {T("Fix it before sending.")}
          </a>
        </div>
      )}
      <div className="card noprint">
        <div className="btns" style={{ marginTop: 0 }}>
          <button type="button" onClick={send} disabled={!!busy}>
            {busy === "send" ? T("Sending…") : invoice.sent_at ? T("Send again") : est ? T("Email estimate") : T("Email to customer")}
          </button>
          {est ? (
            <button type="button" className="alt" onClick={convertToInvoice} disabled={!!busy}>
              {busy === "convert" ? T("One moment…") : T("Turn into invoice")}
            </button>
          ) : (
            <button type="button" className="alt" onClick={togglePaid} disabled={!!busy}>
              {invoice.status === "paid" ? T("Paid ✓ (undo)") : T("Mark paid")}
            </button>
          )}
        </div>
        <div className="btns">
          <button type="button" className="alt small" onClick={() => copy(text, est ? T("Estimate text copied.") : T("Invoice text copied."))}>{T("Copy text")}</button>
          <button type="button" className="alt small" onClick={() => copy(link, T("Link copied."))}>{T("Copy link")}</button>
          <a className="btn alt small" href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener">PDF</a>
          <button type="button" className="alt small" onClick={startEdit}>{T("Edit")}</button>
        </div>
        {invoice.sent_at && <p className="muted small" style={{ marginBottom: 0 }}>{T("Last sent")} <LocalTime iso={invoice.sent_at} lang={uiLang} /></p>}
        {invoice.sent_at && !est && invoice.status === "unpaid" && invoice.reminders_sent !== undefined && (
          <div className="remindLine">
            {!profile.reminders_enabled ? (
              <span className="muted">
                {T("Payment reminders are off.")} <a href="/settings">{T("Turn them on in Settings")}</a>
              </span>
            ) : invoice.reminders_off ? (
              <>
                <span className="muted">{T("Reminders stopped for this invoice.")}</span>
                <button type="button" className="alt small" onClick={toggleReminders} disabled={!!busy}>
                  {T("Restart reminders")}
                </button>
              </>
            ) : (
              <>
                <span className="muted">
                  {T("Reminders sent: {n} of {max}.", { n: invoice.reminders_sent ?? 0, max: MAX_REMINDERS })}{" "}
                  {missing > 0 ? (
                    T("Paused until every price is filled in.")
                  ) : nextReminderAt(invoice.sent_at, invoice.reminders_sent ?? 0) ? (
                    <>
                      {T("Next:")} <LocalTime iso={nextReminderAt(invoice.sent_at, invoice.reminders_sent ?? 0)!.toISOString()} dateOnly lang={uiLang} />
                    </>
                  ) : null}
                </span>
                {(invoice.reminders_sent ?? 0) < MAX_REMINDERS && (
                  <button type="button" className="alt small" onClick={toggleReminders} disabled={!!busy}>
                    {T("Stop reminders")}
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {msg.err && <div className="err" role="alert">{msg.err}</div>}
        {msg.ok && <div className="okmsg">{msg.ok}</div>}
      </div>
      <div className="card noprint">
        <h2 style={{ marginTop: 0 }}>{T("Customer signature")}</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          {T("Hand your phone to the customer: before the job to approve the price, after the job to confirm the work is done.")}
        </p>
        <div className="sigActions">
          {(est ? (["approve"] as const) : (["approve", "complete"] as const)).map((k) =>
            signed(k) ? (
              <div key={k} className="sigDone">
                <span>{k === "approve" ? T("Approved ✓") : T("Work complete ✓")}</span>
                <button type="button" className="alt small" onClick={() => removeSignature(k)} disabled={!!busy}>
                  {T("Remove")}
                </button>
              </div>
            ) : (
              <button key={k} type="button" className={k === "approve" ? "alt" : ""} onClick={() => startSigning(k)} disabled={!!busy}>
                {k === "approve" ? T("✍️ Approve (before the job)") : T("✍️ Work complete (after the job)")}
              </button>
            ),
          )}
        </div>
      </div>
      <InvoiceView invoice={invoice} profile={profile} holdTotal uiLang={uiLang} />
      {invoice.original_note && (
        <details className="card noprint">
          <summary className="muted">{T("Original job note")}</summary>
          <p className="pre">{invoice.original_note}</p>
        </details>
      )}
      <button type="button" className="danger noprint" style={{ width: "100%" }} onClick={remove} disabled={!!busy}>
        {est ? T("Delete estimate") : T("Delete invoice")}
      </button>
    </>
  );
}
