import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ES, tr } from "@/lib/ui";

// Every English string passed to T(), tr() or uiT() must have a Spanish entry.
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

export function uiStrings(): string[] {
  const found = new Set<string>();
  const re = /\b(?:T|uiT|tr\(\s*[\w.]+\s*,)\(?\s*"((?:[^"\\]|\\.)*)"/g;
  for (const f of [...files("app"), ...files("components")]) {
    for (const m of readFileSync(f, "utf8").matchAll(re)) found.add(JSON.parse(`"${m[1]}"`));
  }
  return [...found].sort();
}

describe("Spanish menus", () => {
  it("translates every UI string", () => {
    const strings = uiStrings();
    expect(strings.length).toBeGreaterThan(100);
    expect(strings.filter((s) => !(s in ES))).toEqual([]);
  });

  it("keeps the same {placeholders}", () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    expect(Object.entries(ES).filter(([en, es]) => vars(en) !== vars(es))).toEqual([]);
  });

  it("fills in values", () => {
    expect(tr("es", "Sent to {email}.", { email: "a@b.co" })).toBe("Enviada a a@b.co.");
    expect(tr("en", "Sent to {email}.", { email: "a@b.co" })).toBe("Sent to a@b.co.");
  });
});
