import { z } from "zod";
import { LEAD_STAGES } from "@/lib/leads";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Fields a contractor can set on a lead. Every field is optional on update. */
export const leadFields = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40),
  email: z.union([z.literal(""), z.string().trim().email().max(200)]),
  address: z.string().trim().max(200),
  job: z.string().trim().max(300),
  source: z.string().trim().max(60),
  value_cents: z.number().int().min(0).max(100_000_000),
  stage: z.enum(LEAD_STAGES),
  follow_up_on: date.nullable(),
  follow_up_note: z.string().trim().max(200),
  notes: z.string().trim().max(4000),
});

export const newLead = leadFields.partial().required({ name: true });
export const leadUpdate = leadFields.partial().extend({ follow_up_done: z.literal(true).optional() });
