import { describe, expect, it } from "vitest";
import { nextReminderAt, reminderDue } from "@/lib/reminders";

const DAY = 24 * 3600 * 1000;
const sent = "2026-11-01T15:00:00.000Z";
const at = (days: number) => Date.parse(sent) + days * DAY;

describe("payment reminders", () => {
  it("schedules 3, 7 and 14 days after sending", () => {
    expect(nextReminderAt(sent, 0)?.getTime()).toBe(at(3));
    expect(nextReminderAt(sent, 1)?.getTime()).toBe(at(7));
    expect(nextReminderAt(sent, 2)?.getTime()).toBe(at(14));
    expect(nextReminderAt(sent, 3)).toBeNull();
    expect(nextReminderAt(null, 0)).toBeNull();
  });

  it("is due only once the day arrives", () => {
    expect(reminderDue(sent, 0, null, at(2.9))).toBe(false);
    expect(reminderDue(sent, 0, null, at(3))).toBe(true);
    expect(reminderDue(sent, 1, new Date(at(3)).toISOString(), at(7))).toBe(true);
    expect(reminderDue(sent, 3, new Date(at(14)).toISOString(), at(30))).toBe(false);
  });

  it("never sends two in one day, even if runs were missed", () => {
    // Cron was down for two weeks: the first reminder goes out, the second waits a day.
    expect(reminderDue(sent, 0, null, at(15))).toBe(true);
    expect(reminderDue(sent, 1, new Date(at(15)).toISOString(), at(15.2))).toBe(false);
    expect(reminderDue(sent, 1, new Date(at(15)).toISOString(), at(16))).toBe(true);
  });
});
