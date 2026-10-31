import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlan, getUser } from "@/lib/auth";
import { parseJobNote, ParseError } from "@/lib/parse-note";
import { AI_LIMIT_PER_DAY, AI_LIMIT_PER_MINUTE, FREE_NOTES_PER_MONTH, MAX_NOTE_CHARS } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const body = z.object({
  note: z.string().trim().min(1).max(MAX_NOTE_CHARS),
  language: z.enum(["en", "es"]).default("en"),
});

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const input = body.safeParse(await request.json().catch(() => null));
  if (!input.success) {
    return NextResponse.json({ error: `Add a job note (up to ${MAX_NOTE_CHARS} characters).` }, { status: 400 });
  }

  const admin = createAdminClient();

  // Rate limit first, so a blocked request never touches the monthly quota.
  const { data: allowed, error: limitError } = await admin.rpc("check_rate_limit", {
    p_user: user.id,
    p_per_minute: AI_LIMIT_PER_MINUTE,
    p_per_day: AI_LIMIT_PER_DAY,
  });
  if (limitError) return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  if (!allowed) return NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });

  // Free plan limit, enforced here on the server.
  const plan = await getPlan(supabase, user.id);
  const { data: used, error: usageError } = await admin.rpc("consume_note", {
    p_user: user.id,
    p_limit: plan === "solo" ? null : FREE_NOTES_PER_MONTH,
  });
  if (usageError) return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  if (used === null) {
    return NextResponse.json(
      { error: `You've used all ${FREE_NOTES_PER_MONTH} free notes this month. Upgrade to Solo for unlimited notes.`, upgrade: true },
      { status: 402 },
    );
  }

  const { data: profile } = await supabase.from("profiles").select("hourly_rate_cents").eq("id", user.id).single();

  try {
    const result = await parseJobNote(input.data.note, profile?.hourly_rate_cents ?? 0, input.data.language);
    if (!result.items.length) throw new ParseError("No line items found.");
    return NextResponse.json({ ...result, notes_used: used, plan });
  } catch (err) {
    // Don't charge a note for a failed parse.
    await admin.rpc("refund_note", { p_user: user.id });
    console.error("parse failed", err);
    const message =
      err instanceof ParseError
        ? "Couldn't build the invoice from that note. Try saying what you did and what it cost."
        : "The invoice service is busy. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
