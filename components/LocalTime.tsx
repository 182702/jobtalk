"use client";

import { useEffect, useState } from "react";
import type { UiLang } from "@/lib/ui";

/**
 * Shows a date/time in the viewer's own time zone. The server renders in UTC,
 * so formatting waits until the page is in the browser.
 */
export function LocalTime({ iso, dateOnly = false, lang }: { iso: string; dateOnly?: boolean; lang?: UiLang }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const d = new Date(iso);
    const locale = lang === "es" ? "es-US" : lang === "en" ? "en-US" : [];
    setText(dateOnly ? d.toLocaleDateString(locale, { dateStyle: "medium" }) : d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }));
  }, [iso, dateOnly, lang]);
  return <span suppressHydrationWarning>{text}</span>;
}
