"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { InvoiceEditor } from "@/components/InvoiceEditor";
import { InvoiceView } from "@/components/InvoiceView";
import { LocalTime } from "@/components/LocalTime";
import { invoiceLang } from "@/lib/i18n";
import { missingPriceCount } from "@/lib/invoice";
import type { Draft, InvoiceWithItems, Profile } from "@/lib/types";
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
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const missing = missingPriceCount(invoice.line_items);

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

  async function send() {
    if (!invoice.customer_email) {
      setEditing(true);
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
    if (!window.confirm(T("Delete this invoice? This can't be undone."))) return;
    const { res, data } = await call("delete", `/api/invoices/${invoice.id}`, { method: "DELETE" });
    if (!res.ok) return setMsg({ err: data.error || T("Something went wrong. Try again.") });
    router.push("/invoices");
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
          <a href="#" onClick={(e) => (e.preventDefault(), setEditing(true))}>
            {T("Fix it before sending.")}
          </a>
        </div>
      )}
      <div className="card noprint">
        <div className="btns" style={{ marginTop: 0 }}>
          <button type="button" onClick={send} disabled={!!busy}>
            {busy === "send" ? T("Sending…") : invoice.sent_at ? T("Send again") : T("Email to customer")}
          </button>
          <button type="button" className="alt" onClick={togglePaid} disabled={!!busy}>
            {invoice.status === "paid" ? T("Paid ✓ (undo)") : T("Mark paid")}
          </button>
        </div>
        <div className="btns">
          <button type="button" className="alt small" onClick={() => copy(text, T("Invoice text copied."))}>{T("Copy text")}</button>
          <button type="button" className="alt small" onClick={() => copy(link, T("Link copied."))}>{T("Copy link")}</button>
          <a className="btn alt small" href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener">PDF</a>
          <button type="button" className="alt small" onClick={() => setEditing(true)}>{T("Edit")}</button>
        </div>
        {invoice.sent_at && <p className="muted small" style={{ marginBottom: 0 }}>{T("Last sent")} <LocalTime iso={invoice.sent_at} lang={uiLang} /></p>}
        {msg.err && <div className="err" role="alert">{msg.err}</div>}
        {msg.ok && <div className="okmsg">{msg.ok}</div>}
      </div>
      <InvoiceView invoice={invoice} profile={profile} holdTotal uiLang={uiLang} />
      {invoice.original_note && (
        <details className="card noprint">
          <summary className="muted">{T("Original job note")}</summary>
          <p className="pre">{invoice.original_note}</p>
        </details>
      )}
      <button type="button" className="danger noprint" style={{ width: "100%" }} onClick={remove} disabled={!!busy}>
        {T("Delete invoice")}
      </button>
    </>
  );
}
