# UMMS Financial Assistance: Policy Research

Source of truth for the rules engine. Machine-readable version: [`policies/umms.json`](../policies/umms.json).

- **Policy:** UMMS Financial Assistance Policy RCS-01, revised 2025-07-01 ([PDF](https://www.umms.org/-/media/files/umms/patients-and-visitors/financial-assistance-policy/july-2025/umms-financial-assistance-policy070125-english.pdf))
- **Income table:** Attachment A sliding scale, effective 2025-07-01 ([PDF](https://www.umms.org/-/media/files/umms/patients-and-visitors/financial-assistance-policy/july-2025/2025-sliding-scale.pdf))
- **Application:** includes Form FAF 116 ([PDF](https://www.umms.org/-/media/files/umms/patients-and-visitors/financial-assistance-application/umms-fa-application-5262022-with-faf-116.pdf))
- **Providers not covered:** per-hospital lists ([page](https://www.umms.org/patients-visitors/umms-financial-assistance/providers-not-included)); UMMC Downtown list dated 2026-03-31
- Researched 2026-09-26. Re-check each July, when the income limits update.

## Question 1: Does this bill fall under the policy?

| Biller on the bill | Result | Why |
|---|---|---|
| A UMMS hospital (UMMC, Midtown, St. Joseph, BWMC, etc.) | **Covered** | Policy applies to all UMMS member hospitals (p.1) |
| UM Physician Network (UMPN) | **Covered** | Professional charges covered only for UMPN (p.7) |
| University of Maryland Faculty Physicians, Inc. (FPI) | **Separate program** | All 2,143 UMMC Downtown practitioners on the provider list are marked "not covered." Next step: call FPI self-pay line 410-528-5710 ([source](https://www.umfpi.org/patients-visitors/billing/understanding-your-medical-bill)) |
| Anyone else (equipment, home health, outside labs) | **Counselor review** | Non-affiliated providers are excluded (p.7) |

Service-level exclusions: cosmetic or non-medically necessary services, convenience items, services denied by insurance, and third-party liability claims (auto, workplace, legal) until those are exhausted.

## Question 2: Does the household appear to qualify?

Checked in this order:

1. **Presumptive eligibility gives free care** (p.7-8) if the patient has SNAP, WIC, Maryland Energy Assistance, current Medicaid, Medicaid pharmacy coverage, SLMB, is experiencing homelessness, or is in bankruptcy. This covers only that date of service.
2. **Income vs. Maryland Department of Health (MDH) limits** (p.2, Attachment A). This is *not* the federal poverty level; MDH limits are higher.

   | Income as % of MDH limit | Discount |
   |---|---|
   | up to 200% | 100% (free) |
   | 200-210 / 210-220 / 220-230 / 230-240 / 240-250 | 90 / 80 / 70 / 60 / 50% |
   | 250-260 / 260-270 / 270-280 / 280-300 | 40 / 30 / 20 / 10% |
   | over 300% | none |

   Free-care cutoff examples: household of 1 is $43,224; 3 is $73,560; 4 is $88,752. The full table for sizes 1-12 is in `umms.json`. The discount applies to what the patient owes **after insurance**.
3. **Financial hardship** (p.8): not income-eligible, but UMMS medical debt over 12 months is above 25% of household income. Route to counselor.

Household = patient + spouse + children (biological, adopted, step) + tax dependents (p.6). Assets may be considered, but the first $10,000, $150,000 home equity, retirement accounts, one car, and 529 accounts are excluded. Immigration status is **not** used.

## Question 3: Is the application ready for review?

| Document | When needed | If the patient doesn't have it |
|---|---|---|
| Last 2 pay stubs or W-2 | Employed | Other evidence of income; recent tax return |
| Federal tax return (1040) | Self-employed | Other evidence of income |
| Proof of unemployment | Unemployed | Unemployment Insurance statement; statement from current source of support; **FAF 116** |
| Social Security or disability statements | Receives benefits | Other evidence of income |
| Mortgage or rent bill | Always | Written description of living situation; **FAF 116** (help with food and shelter) |
| Medicaid approval or denial letter | Applied for Medicaid | None; counselor |
| Patient signature | Always | None |
| Spouse signature | Married | None |

Rules that shape the "I don't have this" feature:
- UMMS **cannot deny** for missing information that the policy or application does not require (p.3).
- If a tax return and pay stubs disagree, **the most recent one decides** (p.3).
- Oral submission of information is accepted where appropriate (p.3).
- Missing info leads to a written request; the patient has **30 days** to respond, then the case closes and they can reapply (p.3).

## Workflow facts for the counselor screen

- **Medicaid check** is required for self-pay patients (p.4). Status: unknown / pending / completed.
- Insurance must be used first (p.4).
- Applications are accepted up to **240 days** after the first post-discharge bill (p.2).
- Probable eligibility within **2 business days**; final decision within **14 days** of a complete application; collections are paused meanwhile (p.4).
- Approval covers the month of determination plus **one year prior** (p.4).
- Denials can be appealed with help from the MD Attorney General's Health Education and Advocacy Unit, 410-528-1840 (p.9).

**Contact:** 410-821-4140 (toll-free 877-632-4909), CBOService@umm.edu, fax 410-630-5341. Mail: UMMS, 11311 McCormick Road, Suite 230, Hunt Valley, MD 21031.

## Problem evidence for the pitch

- Only about 29% of eligible patients receive financial assistance; covering all of them would cost hospitals about 0.7% of revenue ([Dollar For](https://dollarfor.org/press/bottom-line-report-press-release/))
- About $14B a year is billed to patients that should be waived ([Dollar For](https://dollarfor.org/the-path-to-charity-care/))
- Physicians working at, but not for, a hospital often aren't bound by its policy ([KFF Health News, 2025](https://kffhealthnews.org/news/article/hospital-charity-care-loopholes-needy-patients-pay/))
- Background: [CFPB](https://www.consumerfinance.gov/data-research/research-reports/understanding-required-financial-assistance-in-medical-care/), [KFF](https://www.kff.org/health-costs/issue-brief/hospital-charity-care-how-it-works-and-why-it-matters/), [Health Affairs](https://www.healthaffairs.org/doi/10.1377/hlthaff.2023.01615)

Dollar For is an advocacy nonprofit; cite its figures as its estimates.

## Demo cases

See [`demo-cases/cases.json`](../demo-cases/cases.json). Bills are in `demo-cases/bills/` as HTML, PDF, and PNG, all marked synthetic.

| Patient | Situation | Expected result |
|---|---|---|
| Maria Santos | Household 3, $52k, insured, has all documents | Covered, free care, only signature missing |
| James Carter | Household 1, laid off, $22.2k unemployment, uninsured, lives with sister | Covered, free care; pay stubs and rent bill replaced by alternatives; Medicaid screening flagged |
| Aisha Rahman | Household 4, $98k, insured; hospital bill + FPI physician bill | Hospital: 70% off ($4,850 to $1,455). Physician bill: separate program, call 410-528-5710. Missing spouse pay stubs and signature |
