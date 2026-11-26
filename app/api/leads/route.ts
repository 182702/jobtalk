import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { newLead } from "@/lib/lead-input";
import { uiT } from "@/lib/ui-server";

/** Add a lead. */
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });
  const input = newLead.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: await uiT("Check the name, phone and email, then try again.") }, { status: 400 });

  const now = new Date().toISOString();
  const stage = input.data.stage ?? "new";
  const { data, error } = await supabase
    .from("leads")
    .insert({ ...input.data, user_id: user.id, stage, won_at: stage === "won" ? now : null, last_contacted_at: stage === "new" ? null : now })
    .select("id")
    .single();
  if (error || !data) {
    console.error("lead insert failed", error?.message);
    return NextResponse.json({ error: await uiT("Couldn't save the lead. Try again.") }, { status: 500 });
  }
  return NextResponse.json({ id: data.id });
}
