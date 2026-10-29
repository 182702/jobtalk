import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { draftSchema, draftToRpcPayload } from "@/lib/invoice";

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const draft = draftSchema.safeParse(await request.json().catch(() => null));
  if (!draft.success) return NextResponse.json({ error: "Check the invoice fields and try again." }, { status: 400 });

  const { invoice, items } = draftToRpcPayload(draft.data);
  const { data: id, error } = await supabase.rpc("create_invoice", { p_invoice: invoice, p_items: items });
  if (error) {
    console.error("create_invoice failed", error);
    return NextResponse.json({ error: "Couldn't save the invoice. Try again." }, { status: 500 });
  }
  return NextResponse.json({ id });
}
