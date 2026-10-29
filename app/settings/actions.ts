"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { parseDollarsToCents, parsePercentToBps } from "@/lib/money";

export type SettingsState = { ok?: boolean; error?: string };

const schema = z.object({
  business_name: z.string().trim().max(120),
  hourly_rate: z.string().max(20),
  tax_rate: z.string().max(10),
  payment_instructions: z.string().trim().max(2000),
});

const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg" };
const MAX_LOGO_BYTES = 1024 * 1024;

export async function saveSettings(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  const input = schema.safeParse(Object.fromEntries(["business_name", "hourly_rate", "tax_rate", "payment_instructions"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!input.success) return { error: "Check the fields and try again." };

  const tax = parsePercentToBps(input.data.tax_rate);
  if (tax > 5000) return { error: "Tax rate looks too high. Enter it as a percent, like 8.25." };

  const update: Record<string, unknown> = {
    business_name: input.data.business_name,
    hourly_rate_cents: parseDollarsToCents(input.data.hourly_rate),
    tax_rate_bps: tax,
    payment_instructions: input.data.payment_instructions,
    updated_at: new Date().toISOString(),
  };

  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const ext = LOGO_TYPES[logo.type];
    if (!ext) return { error: "Logo must be a PNG or JPG." };
    if (logo.size > MAX_LOGO_BYTES) return { error: "Logo must be under 1 MB." };
    // New file name each time so cached old logos don't linger.
    const path = `${user.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(path, logo, { contentType: logo.type });
    if (error) {
      console.error("logo upload failed", error);
      return { error: "Couldn't upload the logo." };
    }
    update.logo_path = path;
  } else if (form.get("remove_logo") === "on") {
    update.logo_path = null;
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) return { error: "Couldn't save settings." };

  revalidatePath("/", "layout");
  return { ok: true };
}
