// When automatic payment reminders go out, counted in days after the invoice was last sent.
export const REMINDER_DAYS = [3, 7, 14] as const;
export const MAX_REMINDERS = REMINDER_DAYS.length;
const DAY = 24 * 3600 * 1000;

/** When the next reminder is due, or null if none are left. */
export function nextReminderAt(sentAt: string | null, remindersSent: number): Date | null {
  if (!sentAt || remindersSent >= MAX_REMINDERS) return null;
  return new Date(Date.parse(sentAt) + REMINDER_DAYS[remindersSent] * DAY);
}

/** True when a reminder is due now. Never more than one per day, even after a late run. */
export function reminderDue(sentAt: string | null, remindersSent: number, lastReminderAt: string | null, now = Date.now()): boolean {
  const next = nextReminderAt(sentAt, remindersSent);
  if (!next || next.getTime() > now) return false;
  return !lastReminderAt || now - Date.parse(lastReminderAt) >= DAY - 3600 * 1000;
}
