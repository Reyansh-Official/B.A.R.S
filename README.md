# CareClear

Helps patients turn a hospital bill into a complete financial-assistance application, with plain-language eligibility screening, missing-document help, and a counselor review dashboard.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # rules engine against the demo cases
```

- Patient flow (phone-sized): `/h/umms`. Use the "Demo patient…" menu to load Maria, James, or Aisha.
- Counselor dashboard (desktop): `/counselor`

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
| `src/lib/store.ts` | In-memory application store (swap for Supabase to share across devices) |
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

Not built for production: sign-in for counselors, secret links for patients, a real database (data lives in server memory), and file storage.

All patient data in `demo-cases/` is synthetic.
