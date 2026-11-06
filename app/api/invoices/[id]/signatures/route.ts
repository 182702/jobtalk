import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { missingPriceCount } from "@/lib/invoice";
import { loadInvoice } from "@/lib/load-invoice";
import { uiT } from "@/lib/ui-server";

type Ctx = { params: Promise<{ id: string }> };

const MAX_IMAGE_CHARS = 300_000;
const kind = z.enum(["approve", "complete"]);
const body = z.object({
  kind,
  signer_name: z.string().trim().min(1).max(120),
  image: z
    .string()
    .max(MAX_IMAGE_CHARS)
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/),
  signed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/** The signer's local date, accepted only within a day of the server's date. */
function plausibleDate(ymd: string): boolean {
  const t = Date.parse(`${ymd}T12:00:00Z`);
  return Number.isFinite(t) && Math.abs(t - Date.now()) < 36 * 3600 * 1000;
}

/** Save the customer's signature (replaces an earlier one of the same kind). */
export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });

  const input = body.safeParse(await request.json().catch(() => null));
  if (!input.success || !plausibleDate(input.data.signed_on)) {
    return NextResponse.json({ error: await uiT("Couldn't save the signature. Try again.") }, { status: 400 });
  }

  const invoice = await loadInvoice(supabase, id);
  if (!invoice) return NextResponse.json({ error: await uiT("Invoice not found.") }, { status: 404 });
  if (missingPriceCount(invoice.line_items) > 0) {
    return NextResponse.json({ error: await uiT("Add all prices before your customer signs.") }, { status: 409 });
  }

  await supabase.from("invoice_signatures").delete().eq("invoice_id", id).eq("kind", input.data.kind);
  const { error } = await supabase.from("invoice_signatures").insert({
    invoice_id: id,
    user_id: user.id,
    kind: input.data.kind,
    signer_name: input.data.signer_name,
    image: input.data.image,
    total_cents: invoice.total_cents,
    signed_on: input.data.signed_on,
  });
  if (error) {
    console.error("signature insert failed", error);
    return NextResponse.json({ error: await uiT("Couldn't save the signature. Try again.") }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Remove one signature: DELETE /api/invoices/:id/signatures?kind=approve */
export async function DELETE(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });
  const k = kind.safeParse(new URL(request.url).searchParams.get("kind"));
  if (!k.success) return NextResponse.json({ error: await uiT("Invalid request.") }, { status: 400 });
  const { error } = await supabase.from("invoice_signatures").delete().eq("invoice_id", id).eq("kind", k.data);
  if (error) return NextResponse.json({ error: await uiT("Something went wrong. Try again.") }, { status: 500 });
  return NextResponse.json({ ok: true });
}
