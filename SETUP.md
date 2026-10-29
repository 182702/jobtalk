# VoiceBill Pro

Voice note to invoice for contractors. A contractor records or types what they did, and VoiceBill Pro turns it into an invoice with labor, parts, and tax that they can review, email as a PDF or link, and track as paid or unpaid.

Stack: Next.js 16 (App Router), Supabase (Postgres, auth, logo storage), Anthropic API, Stripe subscriptions, Resend email, pdf-lib.

## What's built (version 1)

| Feature | Where |
| --- | --- |
| Email sign-up, login, password reset | `app/login`, `app/signup`, `app/auth/*`, `components/AuthForm.tsx` |
| Settings: business name, logo, hourly rate, tax rate, payment instructions | `app/settings` |
| Record (browser speech recognition) or type a job note | `components/NewInvoice.tsx` |
| Server-side AI parsing, prices never invented | `lib/parse-note.ts`, `app/api/parse/route.ts` |
| Review screen: edit, add, delete lines; tax on its own line; red flags for missing prices | `components/InvoiceEditor.tsx` |
| Send by email with PDF attached and a view link; copy text; download PDF | `app/api/invoices/[id]/send`, `lib/pdf.ts`, `app/i/[token]` |
| Sequential invoice numbers, paid/unpaid, total outstanding | `supabase/migrations/0001_init.sql`, `app/invoices` |
| Free (5 notes/month) and Solo ($24/month) plans | `app/billing`, `app/api/stripe/*` |
| Landing page with a waitlist form, privacy and terms pages | `app/page.tsx`, `app/privacy`, `app/terms` |
| Installable on a phone (web app manifest) | `app/manifest.ts` |

## How the rules from the spec are enforced

- **Money in cents.** Every amount is an integer number of cents; quantities are handled in hundredths, and tax is stored in basis points (8.25% = 825). See `lib/money.ts` and `tests/money.test.ts`. The server recomputes totals on every save and ignores totals sent from the browser.
- **Prices are never invented.** The model returns `rate_dollars: null` when the note gives no price. Code, not the model, fills in the default hourly rate for labor hours. Any line still at $0 is outlined in red, a warning shows on the review screen and the invoice page, and sending asks for confirmation (checked again on the server).
- **Free limit on the server.** `consume_note` (a Postgres function only the server can call) atomically counts each note against the month and refuses past 5 on the Free plan. A failed AI call gives the note back.
- **AI rate limit.** 6 requests a minute and 100 a day per account (`lib/plans.ts`), enforced in Postgres so it works across serverless instances. Notes are capped at 6,000 characters.
- **Users can't change their plan, usage, or invoice numbers.** Row-level security plus column grants: `subscriptions` and `usage` are read-only to users, and the invoice counter only moves through `create_invoice`.
- **The Anthropic key stays on the server.** Only `lib/parse-note.ts` (marked `server-only`) uses it.

## Local setup

Requirements: Node 20+, Docker (for local Supabase).

```bash
npm install
npx supabase start          # starts Postgres, auth, storage locally and applies the migration
cp .env.example .env.local  # then fill in values (see below)
npm run dev
```

`npx supabase start` prints the local URL, anon key, and service role key for `.env.local`. Local sign-up doesn't require email confirmation; confirmation emails, if enabled, show up in Mailpit at http://127.0.0.1:54324.

Checks:

```bash
npm test        # money math unit tests
npm run lint    # TypeScript
npm run build
```

## Production setup

### 1. Supabase
1. Create a project at supabase.com.
2. Run `supabase/migrations/0001_init.sql` in the SQL editor (or `npx supabase link` then `npx supabase db push`).
3. Authentication → URL Configuration: set Site URL to your domain and add `https://yourdomain.com/auth/callback` to Redirect URLs.
4. Authentication → Email: keep "Confirm email" on, and set up custom SMTP (you can use Resend's SMTP) so confirmation emails aren't rate-limited.
5. Copy the project URL, anon key, and service role key into your environment.

### 2. Anthropic
Create an API key at platform.claude.com and set `ANTHROPIC_API_KEY`. The parser uses `claude-opus-5-5` at low effort (set `ANTHROPIC_MODEL` to override). Server-side refusal fallback is turned on (`fallbacks: "default"`), so if a safety classifier declines a note, the API retries it on a fallback model instead of failing.

### 3. Stripe
1. Create a Product "VoiceBill Pro Solo" with a recurring price of $24/month. Put its price id in `STRIPE_PRICE_SOLO`.
2. Developers → Webhooks: add an endpoint at `https://yourdomain.com/api/stripe/webhook` for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Settings → Billing → Customer portal: turn it on and allow cancellation.
4. Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

### 4. Resend
Verify your domain in Resend, create an API key (`RESEND_API_KEY`), and set `EMAIL_FROM`, for example `Rivera via VoiceBill Pro <invoices@yourdomain.com>`. Replies go to the contractor's own email.

### 5. Vercel
Import the repo, add every variable from `.env.example`, and set `NEXT_PUBLIC_APP_URL` to your domain.

## Before launch
- Buy the domain and point it at Vercel.
- Fill in the bracketed parts of `app/privacy` and `app/terms` and have them reviewed.
- Get 3 to 5 contractors to try it on real jobs.
- Export the waitlist from the `waitlist` table in Supabase.

## Not in version 1
Crew accounts, card payments from customers, accounting integrations, offline mode. A transcription API (for example Whisper or Deepgram) can replace browser speech recognition later. It would slot in as an upload step before `/api/parse`.
