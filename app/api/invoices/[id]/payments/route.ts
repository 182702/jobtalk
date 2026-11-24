import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { isEstimate } from "@/lib/invoice";
import { PAYMENT_METHODS } from "@/lib/payments";
import { syncStatusFromPayments } from "@/lib/payments-server";
import { uiT } from "@/lib/ui-server";

type Ctx = { params: Promise<{ id: string }> };

const body = z.object({
  amount_cents: z.number().int().min(1).max(100_000_000),
  method: z.enum(PAYMENT_METHODS),
  paid_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(200).default(""),
});

/** Record a payment (deposit, partial, cash, Zelle, check...). Card payments come from Stripe instead. */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });
  const input = body.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: await uiT("Check the amount and try again.") }, { status: 400 });

  const { data: inv } = await supabase.from("invoices").select("id, doc_type").eq("id", id).maybeSingle();
  if (!inv) return NextResponse.json({ error: await uiT("Invoice not found.") }, { status: 404 });
  if (isEstimate(inv)) return NextResponse.json({ error: await uiT("Turn the estimate into an invoice first.") }, { status: 409 });

  const { error } = await supabase.from("invoice_payments").insert({ invoice_id: id, user_id: user.id, ...input.data });
  if (error) {
    console.error("payment insert failed", error.message);
    return NextResponse.json({ error: await uiT("Couldn't save the payment. Try again.") }, { status: 500 });
  }
  const status = await syncStatusFromPayments(supabase, id);
  return NextResponse.json({ ok: true, status });
}

/** Remove a recorded payment: DELETE /api/invoices/:id/payments?pid=123 */
export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });
  const pid = Number(new URL(request.url).searchParams.get("pid"));
  if (!Number.isInteger(pid) || pid <= 0) return NextResponse.json({ error: await uiT("Invalid request.") }, { status: 400 });
  const { data, error } = await supabase.from("invoice_payments").delete().eq("id", pid).eq("invoice_id", id).select("id");
  if (error || !data?.length) return NextResponse.json({ error: await uiT("Something went wrong. Try again.") }, { status: 404 });
  const status = await syncStatusFromPayments(supabase, id);
  return NextResponse.json({ ok: true, status });
}
