import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { toLineItems } = await import("@/lib/parse-note");

const saved = [
  { name: "Expansion tank", rate_cents: 6500 },
  { name: "Shutoff valve", rate_cents: 1200 },
];
const item = (o: Partial<{ description: string; kind: "labor_hours" | "part" | "fee" | "other"; quantity: number; rate_dollars: number | null; saved_item: string | null }>) => ({
  description: "Thing",
  kind: "part" as const,
  quantity: 1,
  rate_dollars: null,
  saved_item: null,
  ...o,
});

describe("toLineItems with saved prices", () => {
  it("fills a missing price from a matching saved item and marks it", () => {
    const [line] = toLineItems([item({ description: "Expansion tank", saved_item: "Expansion tank" })], 0, saved);
    expect(line).toEqual({ description: "Expansion tank", quantity: 1, rate_cents: 6500, price_from: "saved" });
  });

  it("keeps a price said in the note over the saved one", () => {
    const [line] = toLineItems([item({ description: "Expansion tank", rate_dollars: 70, saved_item: "Expansion tank" })], 0, saved);
    expect(line.rate_cents).toBe(7000);
    expect(line.price_from).toBeUndefined();
  });

  it("never uses a name that isn't in the saved list", () => {
    const [line] = toLineItems([item({ description: "Water heater", saved_item: "Water heater" })], 0, saved);
    expect(line.rate_cents).toBe(0);
    expect(line.price_from).toBeUndefined();
  });

  it("uses the default hourly rate for labor before any saved price", () => {
    const [line] = toLineItems([item({ description: "Labor", kind: "labor_hours", quantity: 2, saved_item: "Shutoff valve" })], 8500, saved);
    expect(line.rate_cents).toBe(8500);
    expect(line.price_from).toBeUndefined();
  });

  it("leaves unpriced items at $0 when nothing is saved", () => {
    const [line] = toLineItems([item({ description: "Expansion tank", saved_item: "Expansion tank" })], 0, []);
    expect(line.rate_cents).toBe(0);
  });
});
