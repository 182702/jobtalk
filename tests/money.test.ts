import { describe, expect, it } from "vitest";
import { computeTotals, formatCents, lineAmountCents, parseDollarsToCents, parsePercentToBps } from "@/lib/money";

describe("money", () => {
  it("parses dollars to cents without float drift", () => {
    expect(parseDollarsToCents("85")).toBe(8500);
    expect(parseDollarsToCents("$1,200.50")).toBe(120050);
    expect(parseDollarsToCents("0.1")).toBe(10);
    expect(parseDollarsToCents("19.995")).toBe(2000);
    expect(parseDollarsToCents("abc")).toBe(0);
    expect(parseDollarsToCents("-5")).toBe(0);
    expect(parseDollarsToCents("")).toBe(0);
  });

  it("parses percent to basis points", () => {
    expect(parsePercentToBps("8.25")).toBe(825);
    expect(parsePercentToBps("7%")).toBe(700);
    expect(parsePercentToBps("")).toBe(0);
  });

  it("computes line amounts with fractional quantities", () => {
    expect(lineAmountCents(2.5, 8500)).toBe(21250);
    expect(lineAmountCents(0.33, 1000)).toBe(330);
    expect(lineAmountCents(1.5, 333)).toBe(500); // 499.5 rounds up
    expect(lineAmountCents(-1, 1000)).toBe(0);
  });

  it("matches the landing page example", () => {
    const t = computeTotals(
      [
        { description: "Labor", quantity: 2.5, rate_cents: 8500 },
        { description: "Heater", quantity: 1, rate_cents: 38000 },
        { description: "Valve", quantity: 2, rate_cents: 1200 },
      ],
      825,
    );
    expect(t.subtotal_cents).toBe(61650);
    expect(t.tax_cents).toBe(5086);
    expect(t.total_cents).toBe(66736);
    expect(formatCents(t.total_cents)).toBe("$667.36");
  });

  it("sums cents exactly where floats would drift", () => {
    const lines = Array.from({ length: 10 }, () => ({ description: "x", quantity: 1, rate_cents: 10 }));
    expect(computeTotals(lines, 0).total_cents).toBe(100);
  });

  it("formats large amounts", () => {
    expect(formatCents(123456789)).toBe("$1,234,567.89");
    expect(formatCents(5)).toBe("$0.05");
  });
});
