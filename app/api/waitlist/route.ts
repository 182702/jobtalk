import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const body = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  trade: z.string().trim().max(100).default(""),
  website: z.string().max(0).optional(), // honeypot: bots fill it, people never see it
});

export async function POST(request: Request) {
  const input = body.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  const { error } = await createAdminClient()
    .from("waitlist")
    .upsert({ email: input.data.email, trade: input.data.trade }, { onConflict: "email", ignoreDuplicates: true });
  if (error) {
    console.error("waitlist insert failed", error);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
