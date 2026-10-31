export const FREE_NOTES_PER_MONTH = 5;
export const SOLO_PRICE_LABEL = "$24/month";
// Free trial on a contractor's first Solo subscription only.
export const SOLO_TRIAL_DAYS = 7;

// AI endpoint rate limits, per account. Applies to every plan.
export const AI_LIMIT_PER_MINUTE = 6;
export const AI_LIMIT_PER_DAY = 100;
// Longest job note we send to the model (about 10 minutes of talking).
export const MAX_NOTE_CHARS = 6000;

export type Plan = "free" | "solo";
