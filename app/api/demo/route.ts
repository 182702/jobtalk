import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ParseError, parseJobNote } from "@/lib/parse-note";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/** Labor rate the demo uses when the note gives hours without a rate. */
const DEMO_HOURLY_CENTS = 8500;
const PER_VISITOR_PER_DAY = 5;
const ALL_VISITORS_PER_DAY = 200;
const MAX_CHARS = 600;

const body = z.object({ note: z.string().trim().min(3).max(MAX_CHARS), language: z.enum(["en", "es"]).default("en") });

function visitorKey(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  // Only a hash is stored, never the address itself.
  return createHash("sha256").update(`voicebill-demo:${ip}`).digest("hex").slice(0, 32);
}

const MSG = {
  en: {
    invalid: "Write a short job note first (up to 600 characters).",
    down: "The demo isn't available right now. Sign up free to try it with your own account.",
    limit: "You've used today's free demo tries. Sign up free (no card) to keep going.",
    parse: "Couldn't make an invoice from that. Try saying what you did and what it cost, like the examples.",
    busy: "The demo is busy. Try again in a moment.",
  },
  es: {
    invalid: "Escriba primero una nota corta del trabajo (hasta 600 caracteres).",
    down: "El demo no está disponible ahora. Regístrese gratis para probarlo con su propia cuenta.",
    limit: "Ya usó sus pruebas gratis de hoy. Regístrese gratis (sin tarjeta) para seguir.",
    parse: "No se pudo hacer la factura con eso. Diga qué hizo y cuánto costó, como en los ejemplos.",
    busy: "El demo está ocupado. Intente de nuevo en un momento.",
  },
};

/** Home page "Try it now": turns a job note into invoice lines. Nothing is saved. */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const M = MSG[(json as { language?: string } | null)?.language === "es" ? "es" : "en"];
  const input = body.safeParse(json);
  if (!input.success) return NextResponse.json({ error: M.invalid }, { status: 400 });

  const { data: allowed, error } = await createAdminClient().rpc("check_demo_limit", {
    p_ip: visitorKey(request),
    p_per_ip_day: PER_VISITOR_PER_DAY,
    p_global_day: ALL_VISITORS_PER_DAY,
  });
  if (error) {
    console.error("demo: limit check failed", error.message); // e.g. the 0009 migration hasn't run
    return NextResponse.json({ error: M.down }, { status: 503 });
  }
  if (!allowed) {
    return NextResponse.json({ error: M.limit, limit: true }, { status: 429 });
  }

  try {
    const result = await parseJobNote(input.data.note, DEMO_HOURLY_CENTS, input.data.language, []);
    if (!result.items.length) throw new ParseError("No line items found.");
    return NextResponse.json({ customer_name: result.customer_name, items: result.items, notes: result.notes });
  } catch (err) {
    console.error("demo: parse failed", err);
    return NextResponse.json({ error: err instanceof ParseError ? M.parse : M.busy }, { status: 502 });
  }
}
