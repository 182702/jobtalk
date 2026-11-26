// Lead Tracker: stages, follow-up dates and the message writer. Pure functions (used on server and client).

export const LEAD_STAGES = ["new", "contacted", "quoted", "scheduled", "won", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];
export const OPEN_STAGES: LeadStage[] = ["new", "contacted", "quoted", "scheduled"];

export const STAGE_LABEL: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  scheduled: "Scheduled",
  won: "Won",
  lost: "Lost",
};

export const LEAD_SOURCES = ["Facebook", "Google", "Referral", "Nextdoor", "Website", "Repeat customer", "Phone call", "Other"] as const;

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  job: string;
  source: string;
  value_cents: number;
  stage: LeadStage;
  follow_up_on: string | null; // YYYY-MM-DD
  follow_up_note: string;
  notes: string;
  last_contacted_at: string | null;
  won_at: string | null;
  created_at: string;
  updated_at: string;
};

export const isOpen = (l: Pick<Lead, "stage">) => OPEN_STAGES.includes(l.stage);

/** YYYY-MM-DD for a date in local time, optionally shifted by whole days. */
export function ymd(d: Date = new Date(), addDays = 0): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + addDays);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export type FollowUpState = "overdue" | "today" | "upcoming" | "none";

/** Where a lead's follow-up stands. Closed leads (won/lost) never need one. */
export function followUpState(l: Pick<Lead, "stage" | "follow_up_on">, today: string): FollowUpState {
  if (!l.follow_up_on || !isOpen(l)) return "none";
  if (l.follow_up_on < today) return "overdue";
  return l.follow_up_on === today ? "today" : "upcoming";
}

/** Open leads whose follow-up is today or late, most overdue first. */
export function dueLeads<T extends Pick<Lead, "stage" | "follow_up_on">>(leads: T[], today: string): T[] {
  return leads
    .filter((l) => ["overdue", "today"].includes(followUpState(l, today)))
    .sort((a, b) => (a.follow_up_on ?? "").localeCompare(b.follow_up_on ?? ""));
}

export function pipelineCents(leads: Pick<Lead, "stage" | "value_cents">[]): number {
  return leads.filter(isOpen).reduce((s, l) => s + (l.value_cents || 0), 0);
}

/** Value of jobs won in the same calendar month as `now`. */
export function wonThisMonthCents(leads: Pick<Lead, "stage" | "value_cents" | "won_at">[], now: Date = new Date()): number {
  return leads
    .filter((l) => {
      if (l.stage !== "won" || !l.won_at) return false;
      const d = new Date(l.won_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((s, l) => s + (l.value_cents || 0), 0);
}

/* ---------------- Message writer (written templates, filled in with the lead's details) ---------------- */

export const MESSAGE_GOALS = ["intro", "followup", "quote", "visit", "thanks"] as const;
export type MessageGoal = (typeof MESSAGE_GOALS)[number];
export type MessageChannel = "text" | "email";
export type MessageLang = "en" | "es";

export const GOAL_LABEL: Record<MessageGoal, string> = {
  intro: "First reply",
  followup: "No reply yet",
  quote: "Follow up on estimate",
  visit: "Confirm the visit",
  thanks: "Thank you + review",
};

export function goalForStage(stage: LeadStage): MessageGoal {
  return ({ new: "intro", contacted: "followup", quoted: "quote", scheduled: "visit", won: "thanks", lost: "followup" } as const)[stage];
}

export function firstName(name: string): string {
  const n = name.trim();
  if (!n) return "";
  // Businesses keep their full name ("Maple Street Cafe", "Ozark Homes LLC").
  if (/\b(inc|llc|co|corp|company|group|cafe|church|school|homes|properties|apartments|realty|services|hoa)\b\.?/i.test(n)) return n;
  return n.split(/\s+/)[0];
}

type Words = { greet: (n: string) => string; me: (co: string) => string; job: (j: string) => string };
const WORDS: Record<MessageLang, Words> = {
  en: {
    greet: (n) => (n ? `Hi ${n},` : "Hi,"),
    me: (co) => (co ? `this is ${co}.` : ""),
    job: (j) => (j ? j.replace(/[.\s]+$/, "") : "the job"),
  },
  es: {
    greet: (n) => (n ? `Hola ${n},` : "Hola,"),
    me: (co) => (co ? `le escribe ${co}.` : ""),
    job: (j) => (j ? j.replace(/[.\s]+$/, "") : "el trabajo"),
  },
};

const BODY: Record<MessageLang, Record<MessageGoal, (job: string) => string>> = {
  en: {
    intro: (j) => `Thanks for reaching out about ${j}. I'd be glad to take a look and give you a price. What day works best for you this week?`,
    followup: (j) => `Just checking back about ${j}. Is this still something you'd like help with? Happy to answer any questions.`,
    quote: (j) => `Following up on the estimate for ${j}. Any questions? I can go over it with you or adjust it if needed.`,
    visit: (j) => `Confirming our visit for ${j}. Please reply if you need to change the time. See you then!`,
    thanks: (j) => `Thank you for choosing us for ${j}. If you're happy with the work, a quick online review would mean a lot to us.`,
  },
  es: {
    intro: (j) => `Gracias por contactarnos sobre ${j}. Con gusto paso a verlo y le doy un precio. ¿Qué día le queda mejor esta semana?`,
    followup: (j) => `Solo quería darle seguimiento sobre ${j}. ¿Todavía necesita ayuda con esto? Con gusto respondo cualquier pregunta.`,
    quote: (j) => `Le doy seguimiento al presupuesto para ${j}. ¿Tiene alguna pregunta? Puedo revisarlo con usted o ajustarlo si hace falta.`,
    visit: (j) => `Le confirmo nuestra visita para ${j}. Si necesita cambiar la hora, avíseme. ¡Nos vemos!`,
    thanks: (j) => `Gracias por elegirnos para ${j}. Si quedó contento con el trabajo, una reseña en línea nos ayudaría mucho.`,
  },
};

const SUBJECT: Record<MessageLang, Record<MessageGoal, (job: string) => string>> = {
  en: {
    intro: (j) => `About ${j}`,
    followup: (j) => `Following up on ${j}`,
    quote: () => `Your estimate`,
    visit: () => `Confirming our visit`,
    thanks: () => `Thank you!`,
  },
  es: {
    intro: (j) => `Sobre ${j}`,
    followup: (j) => `Seguimiento: ${j}`,
    quote: () => `Su presupuesto`,
    visit: () => `Confirmación de la visita`,
    thanks: () => `¡Gracias!`,
  },
};

const SIGNOFF: Record<MessageLang, string> = { en: "Thanks,", es: "Gracias," };

export function writeMessage(opts: {
  lead: Pick<Lead, "name" | "job">;
  business: string;
  goal: MessageGoal;
  channel: MessageChannel;
  lang: MessageLang;
}): { subject: string; text: string } {
  const w = WORDS[opts.lang];
  const co = opts.business.trim();
  const job = w.job(opts.lead.job);
  const body = BODY[opts.lang][opts.goal](job);
  const greet = w.greet(firstName(opts.lead.name));
  // Without a business name the body follows "Hi Maria," directly, so it starts lowercase.
  if (opts.channel === "text") return { subject: "", text: co ? `${greet} ${w.me(co)} ${body}` : `${greet} ${body[0].toLowerCase()}${body.slice(1)}` };
  const sign = co ? `${SIGNOFF[opts.lang]}\n${co}` : SIGNOFF[opts.lang];
  return { subject: SUBJECT[opts.lang][opts.goal](job), text: `${greet}\n\n${body}\n\n${sign}` };
}

/** Phone number reduced to what sms:/tel: links accept. */
export function phoneHref(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}
