import "server-only";
import { cookies, headers } from "next/headers";
import { tr, UI_COOKIE, type UiLang } from "@/lib/ui";

/** The app's menu language: the saved choice, else the phone's language, else English. */
export async function getUiLang(): Promise<UiLang> {
  const saved = (await cookies()).get(UI_COOKIE)?.value;
  if (saved === "en" || saved === "es") return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  return accept.trim().toLowerCase().startsWith("es") ? "es" : "en";
}

/** Translates a message into the signed-in contractor's menu language (for API errors). */
export async function uiT(en: string, vars?: Record<string, string | number>): Promise<string> {
  return tr(await getUiLang(), en, vars);
}
