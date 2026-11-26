import { describe, expect, it } from "vitest";
import { dueLeads, firstName, followUpState, goalForStage, phoneHref, pipelineCents, wonThisMonthCents, writeMessage, ymd } from "@/lib/leads";

describe("follow-ups", () => {
  const today = "2026-11-26";
  it("knows overdue, today, upcoming and none", () => {
    expect(followUpState({ stage: "new", follow_up_on: "2026-11-25" }, today)).toBe("overdue");
    expect(followUpState({ stage: "quoted", follow_up_on: today }, today)).toBe("today");
    expect(followUpState({ stage: "contacted", follow_up_on: "2026-12-01" }, today)).toBe("upcoming");
    expect(followUpState({ stage: "new", follow_up_on: null }, today)).toBe("none");
    expect(followUpState({ stage: "won", follow_up_on: "2026-11-01" }, today)).toBe("none");
  });
  it("lists due leads, most overdue first", () => {
    const leads = [
      { id: "a", stage: "new" as const, follow_up_on: today },
      { id: "b", stage: "contacted" as const, follow_up_on: "2026-11-20" },
      { id: "c", stage: "lost" as const, follow_up_on: "2026-11-01" },
      { id: "d", stage: "quoted" as const, follow_up_on: "2026-12-02" },
    ];
    expect(dueLeads(leads, today).map((l) => l.id)).toEqual(["b", "a"]);
  });
  it("adds days in local time across months", () => {
    expect(ymd(new Date(2026, 10, 30), 1)).toBe("2026-12-01");
  });
});

describe("money", () => {
  it("sums open pipeline and wins this month", () => {
    const leads = [
      { stage: "new" as const, value_cents: 10000, won_at: null },
      { stage: "scheduled" as const, value_cents: 25000, won_at: null },
      { stage: "won" as const, value_cents: 50000, won_at: "2026-11-03T15:00:00Z" },
      { stage: "won" as const, value_cents: 70000, won_at: "2026-10-03T15:00:00Z" },
      { stage: "lost" as const, value_cents: 90000, won_at: null },
    ];
    expect(pipelineCents(leads)).toBe(35000);
    expect(wonThisMonthCents(leads, new Date(2026, 10, 26))).toBe(50000);
  });
});

describe("message writer", () => {
  it("writes a text with the first name, business and job", () => {
    const m = writeMessage({ lead: { name: "Maria Lopez", job: "water heater replacement" }, business: "Lanzo Plumbing", goal: "intro", channel: "text", lang: "en" });
    expect(m.text).toBe("Hi Maria, this is Lanzo Plumbing. Thanks for reaching out about water heater replacement. I'd be glad to take a look and give you a price. What day works best for you this week?");
    expect(m.subject).toBe("");
  });
  it("writes an email with a subject and sign-off, in Spanish", () => {
    const m = writeMessage({ lead: { name: "Luis Romero", job: "" }, business: "Lanzo Plumbing", goal: "quote", channel: "email", lang: "es" });
    expect(m.subject).toBe("Su presupuesto");
    expect(m.text.startsWith("Hola Luis,\n\n")).toBe(true);
    expect(m.text).toContain("el trabajo");
    expect(m.text.endsWith("Gracias,\nLanzo Plumbing")).toBe(true);
  });
  it("works without a business name", () => {
    const m = writeMessage({ lead: { name: "", job: "a leak" }, business: "", goal: "followup", channel: "text", lang: "en" });
    expect(m.text).toBe("Hi, just checking back about a leak. Is this still something you'd like help with? Happy to answer any questions.");
  });
  it("keeps business names whole and picks goals by stage", () => {
    expect(firstName("Maple Street Cafe")).toBe("Maple Street Cafe");
    expect(firstName("  Tom Becker ")).toBe("Tom");
    expect(goalForStage("quoted")).toBe("quote");
    expect(goalForStage("won")).toBe("thanks");
    expect(phoneHref("(479) 555-0101")).toBe("4795550101");
  });
});
