import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { leadUpdate } from "@/lib/lead-input";
import { uiT } from "@/lib/ui-server";

type Ctx = { params: Promise<{ id: string }> };

/** Edit a lead, move it to another stage, or mark its follow-up done ({ follow_up_done: true }). */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });
  const input = leadUpdate.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: await uiT("Check the name, phone and email, then try again.") }, { status: 400 });

  const { data: lead } = await supabase.from("leads").select("stage").eq("id", id).maybeSingle();
  if (!lead) return NextResponse.json({ error: await uiT("Lead not found.") }, { status: 404 });

  const now = new Date().toISOString();
  const { follow_up_done, ...fields } = input.data;
  const patch: Record<string, unknown> = { ...fields, updated_at: now };
  if (fields.stage && fields.stage !== lead.stage) {
    patch.won_at = fields.stage === "won" ? now : null;
    if (fields.stage !== "new" && fields.stage !== "lost") patch.last_contacted_at = now;
  }
  if (follow_up_done) Object.assign(patch, { follow_up_on: null, follow_up_note: "", last_contacted_at: now });

  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) {
    console.error("lead update failed", error.message);
    return NextResponse.json({ error: await uiT("Couldn't save the lead. Try again.") }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });
  const { data, error } = await supabase.from("leads").delete().eq("id", id).select("id");
  if (error || !data?.length) return NextResponse.json({ error: await uiT("Lead not found.") }, { status: 404 });
  return NextResponse.json({ ok: true });
}
