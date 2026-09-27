# B.A.R.S.

**Bill Accessibility & Relief System**

Helps patients turn a hospital bill into a complete financial-assistance application, with plain-language eligibility screening, missing-document help, and a counselor review dashboard.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # rules engine against the demo cases
```

- Patient flow (phone-sized): `/h/umms`. With `DEMO_MODE=true` in `.env.local`, a "Demo…" menu loads Maria, James, or Aisha, and sample bills, documents, and dashboard data become available. Leave it `false` for real patients.
- Counselor dashboard (desktop): `/counselor` (sign-in required)

### Supabase setup (once)

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL, publishable key, and secret key (Project Settings -> API Keys).
3. In the Supabase SQL editor, run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
4. In Authentication -> Sign In / Providers, turn off "Allow new users to sign up" (counselors are added by an admin, not self-registered).
5. Add a counselor account (prompts for a password):

```bash
npm run add-counselor -- you@hospital.org umms
```

## Adding hospitals (automatic import)

1. A patient uploads a bill; Claude reads the biller's name, address, state, and type.
2. `/api/resolve-biller` matches it to a hospital in the database (`src/lib/resolve.ts`, deterministic). Physician groups a policy names are routed to that hospital's "separate program".
3. Unknown hospital → a pending hospital and an import job are created, and the pipeline runs in the background (`src/lib/importer/`):
   - **find**: Claude web search locates the policy, plain-language summary, application, and provider lists
   - **download** the PDFs/pages
   - **extract** the rules in three cached structured reads, with a page citation for every section
   - **validate** with code: band order, discounts, dollar tables vs. % of FPL, and state minimums (`policies/state-minimums/`)
   - save as a **draft** policy version
4. An admin reviews it at `/admin` (checks, citations, sample households, band editor) and approves. Only then does the hospital go live.
5. Patients' bills are grouped by hospital; each live hospital gets its own screening and its own application.

Cost controls (measured per import and written to the import log and `policy_imports.usage`): document search runs on Sonnet 5 with search only (no page fetches); large individual-clinician provider lists are skipped; extraction is a single Opus 5 read validated with zod (with a cheap repair pass if needed); retries reuse the links already found. Measured: $0.26 for extraction on Johns Hopkins, versus about $2.50 for the first MedStar import.

Useful commands: `npm run seed-policies` (load hand-verified policies), `npm run retry-import -- <hospital-id> [--fresh]`, `npm run add-counselor -- <email> <hospital> --admin`.

## "Ask about my bill" chat

Patients can ask questions in any language from any screen. Answers are grounded in that hospital's approved policy PDF (Claude Sonnet 5 with citations), and each claim links to its page; hovering shows the policy's exact wording. It explains but never decides eligibility. The policy document is prompt-cached: the first question in a 5-minute window costs about $0.10, follow-ups about $0.01. Limited to 20 questions per visitor per hour and 500 characters per question (`src/app/api/ask`, `src/lib/ask.ts`).

## Text reminders

Patients can opt in on the Review step (unchecked by default). They get a welcome text, a text when the counselor asks for more information, warnings 7 and 2 days before that deadline and before the Medicaid apply-by date, and a text when review starts. Each reminder is sent at most once, and a late run sends only the most urgent one.

- Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM_NUMBER` to send real texts. For a demo on a Mac, `SMS_PROVIDER=messages` sends through the Messages app instead (SMS via iPhone relay, else iMessage). With neither, reminders are only previewed at `/admin/outbox`.
- Run the daily sweep with `npm run send-reminders` (cron or any scheduler; it uses `BARS_CRON_SECRET`).
- Phone numbers and status links are encrypted with `BARS_ENCRYPTION_KEY` (AES-256-GCM); the Outbox shows only the last 4 digits and hides the link.

## Security model

- Patients have no accounts. Their application is protected by a private link (only a hash is stored). Reminder texts go only to a phone confirmed with a one-time code (hashed, 10-minute expiry, 5 tries, 3 sends per 15 minutes).
- Counselors see an "Identity checks" card: the applicant's name compared with the name on each bill and each uploaded document, plus the DOB and account numbers to match in their billing system.

- **Counselors** sign in with Supabase Auth (email and password). An account also needs a row in `public.counselors`, which ties it to one hospital. `src/proxy.ts` refreshes sessions and redirects signed-out visitors; pages and API routes check the counselor again with `getClaims()`.
- **Row-level security** in Postgres limits counselors to their own hospital's applications, even if app code has a bug. Anonymous visitors have no table access.
- **Patients** don't have accounts. Submitting returns a random key that is part of their private status link (`/h/umms/a/<id>?t=<key>`). Only its SHA-256 hash is stored; the server checks it before acting for the patient with the secret key.
- Still to do before real patients: move uploaded files to a private Supabase Storage bucket (they are currently stored inside the application record), rate-limit the bill-reading endpoints, and add MFA for counselors.

## How it works

AI reads the bill; a deterministic rules engine decides. Every screening result cites the policy rule and version it came from.

Three independent answers for every patient:

1. **Coverage**: does this bill fall under the hospital's policy, a separate program, or need a counselor?
2. **Eligibility**: presumptive, sliding-scale discount, hardship review, or above limits.
3. **Readiness**: which documents are provided, replaced by an accepted alternative, or still missing.

## Layout

| Path | What |
|---|---|
| `policies/umms.json` | Verified UMMS policy as data. A new hospital = a new file here + one line in `src/lib/policies.ts` |
| `docs/policy-research.md` | Plain-language rules with page citations and sources |
| `demo-cases/` | Three synthetic patients, expected results, and bills (HTML/PDF/PNG) |
| `src/lib/rules.ts` | Rules engine (pure functions, tested in `rules.test.ts`) |
| `src/lib/store.ts` | Application storage in Supabase Postgres (schema in `supabase/migrations/`) |
| `src/components/patient/steps/` | One file per patient screen |
| `src/app/counselor/` | Counselor queue and packet view |
| `src/app/api/` | `applications` (submit, list, get, and PATCH actions: request info, respond, Medicaid status, in review), `extract` (Claude bill reading) |

## Status

The full demo loop works end to end:

1. Patient uploads bills (Claude reads them), confirms the details, answers the household questions
2. Results screen: coverage per bill, eligibility, and readiness, each citing the policy
3. Documents: upload, or "I don't have this" for policy-accepted alternatives and in-app FAF 116 forms
4. Review the prefilled application and sign (spouse too, if married)
5. Counselor sees the packet, requests missing items; the patient's status page (`/h/umms/a/<id>`) shows the request, they respond, and the counselor view updates live

Not production-ready yet: see the security model above.

All patient data in `demo-cases/` is synthetic.
