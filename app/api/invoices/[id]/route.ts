import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { draftSchema, draftToRpcPayload } from "@/lib/invoice";

type Ctx = { params: Promise<{ id: string }> };

/** Replace the invoice's fields and line items. */
export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const draft = draftSchema.safeParse(await request.json().catch(() => null));
  if (!draft.success) return NextResponse.json({ error: "Check the invoice fields and try again." }, { status: 400 });

  const { invoice, items } = draftToRpcPayload(draft.data);
  const { error } = await supabase.rpc("update_invoice", { p_id: id, p_invoice: invoice, p_items: items });
  if (error) return NextResponse.json({ error: "Couldn't save the invoice." }, { status: 404 });
  return NextResponse.json({ id });
}

const statusBody = z.object({ status: z.enum(["paid", "unpaid"]) });

/** Mark paid or unpaid. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const input = statusBody.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: input.data.status, paid_at: input.data.status === "paid" ? now : null, updated_at: now })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Couldn't delete." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
