"use client";

import { useEffect, useState } from "react";

/**
 * Shows a date/time in the viewer's own time zone. The server renders in UTC,
 * so formatting waits until the page is in the browser.
 */
export function LocalTime({ iso, dateOnly = false }: { iso: string; dateOnly?: boolean }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const d = new Date(iso);
    setText(dateOnly ? d.toLocaleDateString() : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }));
  }, [iso, dateOnly]);
  return <span suppressHydrationWarning>{text}</span>;
}
