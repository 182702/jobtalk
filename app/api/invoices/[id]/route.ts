import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { draftSchema, draftToRpcPayload } from "@/lib/invoice";
import { rememberPrices } from "@/lib/price-list";
import { createAdminClient } from "@/lib/supabase/admin";
import { uiT } from "@/lib/ui-server";

type Ctx = { params: Promise<{ id: string }> };

/** Replace the invoice's fields and line items. */
export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });

  const draft = draftSchema.safeParse(await request.json().catch(() => null));
  if (!draft.success) return NextResponse.json({ error: await uiT("Check the invoice fields and try again.") }, { status: 400 });

  const { invoice, items } = draftToRpcPayload(draft.data);
  const { error } = await supabase.rpc("update_invoice", { p_id: id, p_invoice: invoice, p_items: items });
  if (error) return NextResponse.json({ error: await uiT("Couldn't save the invoice.") }, { status: 404 });
  // A signature covers the invoice as it was signed, so edits clear it. (No-op before the 0006 migration.)
  await supabase.from("invoice_signatures").delete().eq("invoice_id", id);
  // A checkout page made for the old total shouldn't be reused. (No-op before the 0008 migration.)
  await createAdminClient().from("invoices").update({ stripe_checkout_session_id: null }).eq("id", id).eq("user_id", user.id);
  await rememberPrices(supabase, user.id, items);
  return NextResponse.json({ id });
}

const statusBody = z.object({ status: z.enum(["paid", "unpaid"]) });
const remindersBody = z.object({ reminders_off: z.boolean() });
const convertBody = z.object({ convert: z.literal("invoice"), issued_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

/** Mark paid or unpaid, or stop / restart payment reminders for this invoice. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });

  const json = await request.json().catch(() => null);

  // Turn an estimate into an invoice: same number and lines, dated today, not sent yet.
  const convert = convertBody.safeParse(json);
  if (convert.success) {
    const { data, error } = await supabase
      .from("invoices")
      .update({ doc_type: "invoice", issued_on: convert.data.issued_on, sent_at: null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("doc_type", "estimate")
      .select("id");
    if (error || !data?.length) return NextResponse.json({ error: await uiT("Something went wrong. Try again.") }, { status: 404 });
    // Server-only fields: start reminders fresh and drop any old checkout.
    await createAdminClient()
      .from("invoices")
      .update({ reminders_sent: 0, last_reminder_at: null, stripe_checkout_session_id: null })
      .eq("id", id)
      .eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  }

  const reminders = remindersBody.safeParse(json);
  if (reminders.success) {
    const { data, error } = await supabase.from("invoices").update({ reminders_off: reminders.data.reminders_off }).eq("id", id).select("id");
    if (error || !data?.length) return NextResponse.json({ error: await uiT("Something went wrong. Try again.") }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  const input = statusBody.safeParse(json);
  if (!input.success) return NextResponse.json({ error: await uiT("Invalid status.") }, { status: 400 });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: input.data.status, paid_at: input.data.status === "paid" ? now : null, updated_at: now })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return NextResponse.json({ error: await uiT("Invoice not found.") }, { status: 404 });
  // Marked by hand, so it's no longer "paid by card". (No-op before the 0008 migration.)
  await createAdminClient().from("invoices").update({ paid_via: null }).eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) return NextResponse.json({ error: await uiT("Couldn't delete.") }, { status: 500 });
  return NextResponse.json({ ok: true });
}
