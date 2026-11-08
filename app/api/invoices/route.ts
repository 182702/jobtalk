import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { draftSchema, draftToRpcPayload } from "@/lib/invoice";
import { rememberPrices } from "@/lib/price-list";
import { uiT } from "@/lib/ui-server";

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });

  const draft = draftSchema.safeParse(await request.json().catch(() => null));
  if (!draft.success) return NextResponse.json({ error: await uiT("Check the invoice fields and try again.") }, { status: 400 });

  const { invoice, items } = draftToRpcPayload(draft.data);
  const { data: id, error } = await supabase.rpc("create_invoice", { p_invoice: invoice, p_items: items });
  if (error) {
    console.error("create_invoice failed", error);
    return NextResponse.json({ error: await uiT("Couldn't save the invoice. Try again.") }, { status: 500 });
  }
  if (draft.data.doc_type === "estimate") {
    const { error: typeError } = await supabase.from("invoices").update({ doc_type: "estimate" }).eq("id", id);
    if (typeError) console.error("marking estimate failed (0010 migration not run?)", typeError.message);
  }
  await rememberPrices(supabase, user.id, items);
  return NextResponse.json({ id });
}
