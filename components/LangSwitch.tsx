"use client";

import { useRouter } from "next/navigation";
import { UI_COOKIE, type UiLang } from "@/lib/ui";

/** Saves the menu language for this device. Also sets the default voice-note language. */
export function setUiLang(lang: UiLang) {
  document.cookie = `${UI_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  try {
    localStorage.setItem("voicebill:lang", lang);
  } catch {}
}

export function LangSwitch({ lang, className = "" }: { lang: UiLang; className?: string }) {
  const router = useRouter();
  function choose(l: UiLang) {
    if (l === lang) return;
    setUiLang(l);
    router.refresh();
  }
  return (
    <div className={`seg ${className}`} role="group" aria-label={lang === "es" ? "Idioma" : "Language"}>
      <button type="button" className={lang === "en" ? "on" : ""} aria-pressed={lang === "en"} onClick={() => choose("en")}>
        EN
      </button>
      <button type="button" className={lang === "es" ? "on" : ""} aria-pressed={lang === "es"} onClick={() => choose("es")}>
        ES
      </button>
    </div>
  );
}
