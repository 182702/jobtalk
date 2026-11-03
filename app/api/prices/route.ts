import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { uiT } from "@/lib/ui-server";

const body = z.object({ id: z.number().int().positive() });

/** Removes one of the signed-in contractor's saved prices (RLS limits it to their own). */
export async function DELETE(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: await uiT("Please sign in.") }, { status: 401 });
  const input = body.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: await uiT("Invalid request.") }, { status: 400 });
  const { error } = await supabase.from("price_list").delete().eq("id", input.data.id);
  if (error) return NextResponse.json({ error: await uiT("Couldn't remove it. Try again.") }, { status: 500 });
  return NextResponse.json({ ok: true });
}
