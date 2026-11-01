import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { escapeHtml, resend } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_PER_HOUR = 10;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@voicebillpro.com";
const MOOD_LABEL = { happy: "😀 Happy", meh: "😐 Okay", unhappy: "😞 Unhappy" } as const;

const body = z.object({
  message: z.string().trim().min(1).max(2000),
  mood: z.enum(["happy", "meh", "unhappy"]).nullable().default(null),
  page: z.string().max(200).default(""),
});

/** Saves feedback from a signed-in contractor and emails it to support. */
export async function POST(request: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const input = body.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Write a short message first." }, { status: 400 });

  const admin = createAdminClient();
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from("feedback").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) {
    return NextResponse.json({ error: "Thanks! You've sent a lot already. Try again in a little while." }, { status: 429 });
  }

  const { message, mood, page } = input.data;
  const { error } = await admin.from("feedback").insert({ user_id: user.id, email: user.email ?? "", page, mood, message });
  if (error) {
    console.error("feedback insert failed", error);
    return NextResponse.json({ error: "Couldn't send feedback right now. Email support@voicebillpro.com instead." }, { status: 500 });
  }

  // Best effort: the feedback is already saved even if the email fails.
  try {
    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
      await resend().emails.send({
        from: process.env.EMAIL_FROM,
        to: SUPPORT_EMAIL,
        replyTo: user.email || undefined,
        subject: `Feedback${mood ? ` ${MOOD_LABEL[mood]}` : ""} from ${user.email}`,
        text: `${message}\n\nFrom: ${user.email}\nPage: ${page}\nMood: ${mood ? MOOD_LABEL[mood] : "-"}`,
        html: `<p style="white-space:pre-wrap;font:16px/1.5 system-ui,sans-serif">${escapeHtml(message)}</p><p style="color:#6b6a64;font:13px system-ui,sans-serif">From: ${escapeHtml(user.email ?? "")}<br>Page: ${escapeHtml(page)}<br>Mood: ${mood ? MOOD_LABEL[mood] : "-"}</p>`,
      });
    }
  } catch (err) {
    console.error("feedback email failed", err);
  }

  return NextResponse.json({ ok: true });
}
