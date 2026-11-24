import { describe, expect, it } from "vitest";
import { balanceCents, paidCents, statusFromPayments } from "@/lib/payments";

describe("payments and balance", () => {
  it("adds up payments", () => {
    expect(paidCents([{ amount_cents: 10000 }, { amount_cents: 2550 }])).toBe(12550);
    expect(paidCents(undefined)).toBe(0);
  });
  it("shows what is still owed", () => {
    expect(balanceCents({ status: "unpaid", total_cents: 30000, payments: [{ amount_cents: 10000 }] })).toBe(20000);
    expect(balanceCents({ status: "unpaid", total_cents: 30000 })).toBe(30000);
    expect(balanceCents({ status: "unpaid", total_cents: 30000, payments: [{ amount_cents: 35000 }] })).toBe(0);
  });
  it("a paid invoice owes nothing", () => {
    expect(balanceCents({ status: "paid", total_cents: 30000, payments: [] })).toBe(0);
  });
  it("becomes paid only when payments cover the total", () => {
    expect(statusFromPayments(30000, [{ amount_cents: 10000 }])).toBe("unpaid");
    expect(statusFromPayments(30000, [{ amount_cents: 10000 }, { amount_cents: 20000 }])).toBe("paid");
    expect(statusFromPayments(30000, [])).toBe("unpaid");
  });
});
