import { ArrowRight, BadgeCheck, Camera, FileCheck2, HeartHandshake, ListChecks, ScrollText, Send, Stethoscope } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { getPolicy } from "@/lib/policies";
import { publicUrl } from "@/lib/site-url";

const steps = [
  { icon: Camera, title: "Scan your bill", body: "Snap a photo or upload a PDF. AI reads who billed you, the date, and what you owe. You confirm it." },
  { icon: ListChecks, title: "Answer 8 quick questions", body: "Household, income, insurance. One question per screen, in plain language." },
  { icon: ScrollText, title: "See where you stand", body: "Which bills the hospital's program covers, what you likely qualify for, and why, cited from the policy." },
  { icon: Send, title: "Send a complete application", body: "Don't have a document? See what else the hospital accepts. A counselor gets everything at once." },
];

const answers = [
  { icon: Stethoscope, q: "Does this bill fall under the policy?", a: "The hospital bill is covered. The separate doctor's bill goes to the physician group's own program, with the number to call." },
  { icon: BadgeCheck, q: "Does my household appear to qualify?", a: "Free care or a sliding-scale discount, from the hospital's published income table. SNAP or WIC can qualify you automatically." },
  { icon: FileCheck2, q: "Is my application ready?", a: "Exactly what's still missing, what's accepted instead, and a pre-check of every upload before a counselor sees it." },
];

export default async function Home() {
  const policy = getPolicy("umms")!;
  const { url, lan } = await publicUrl("/h/umms");
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0f172a", light: "#ffffff" } });

  return (
    <main className="flex flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <p className="flex items-center gap-2 text-lg font-semibold text-teal-800">
          <HeartHandshake className="h-6 w-6" aria-hidden /> CareClear
        </p>
        <nav className="flex gap-4 text-sm font-medium text-slate-600">
          <Link href="/counselor" className="hover:text-slate-900">Counselor view</Link>
          <Link href="/counselor/impact" className="hover:text-slate-900">Impact</Link>
        </nav>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pb-16 pt-6 md:grid-cols-[1.3fr_1fr]">
        <div className="animate-enter">
          <p className="mb-3 inline-block rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800">For hospital financial assistance programs</p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
            Turn a hospital bill into a complete assistance application.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            Patients learn what they qualify for in minutes. Counselors get applications that are ready to review, not
            half-finished forms that need three phone calls.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/h/umms" className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-800">
              Try it as a patient <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/counselor" className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50">
              Open the counselor view
            </Link>
          </div>
        </div>

        <div className="animate-enter rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm [animation-delay:120ms]">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">On a real bill</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">&ldquo;Can&apos;t pay? Scan to see if you qualify.&rdquo;</p>
          <div className="mx-auto mt-4 w-48" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label={`QR code linking to ${url}`} />
          <p className="mt-3 break-all font-mono text-xs text-slate-500">{url}</p>
          {lan && <p className="mt-1 text-xs text-slate-500">Phone must be on the same Wi-Fi as this computer.</p>}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-10 md:grid-cols-3">
          <div>
            <p className="text-4xl font-semibold tabular-nums text-slate-900">~29%</p>
            <p className="mt-1 text-slate-600">of patients eligible for hospital financial assistance actually receive it</p>
          </div>
          <div>
            <p className="text-4xl font-semibold tabular-nums text-slate-900">$14B</p>
            <p className="mt-1 text-slate-600">billed to patients each year that should have been waived</p>
          </div>
          <div>
            <p className="text-4xl font-semibold tabular-nums text-slate-900">2 bills</p>
            <p className="mt-1 text-slate-600">from one ER visit is common, and the doctor&apos;s bill often falls under a different program</p>
          </div>
          <p className="text-xs text-slate-400 md:col-span-3">
            First two figures are estimates published by Dollar For, a patient-advocacy nonprofit. See docs/policy-research.md.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold text-slate-900">How it works for patients</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><s.icon className="h-5 w-5" aria-hidden /></span>
                <span className="text-sm font-medium text-slate-400">Step {i + 1}</span>
              </div>
              <p className="mt-4 font-semibold text-slate-900">{s.title}</p>
              <p className="mt-1 text-sm text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-slate-900 text-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold">Three separate answers, never one vague &ldquo;maybe&rdquo;</h2>
          <p className="mt-2 max-w-2xl text-slate-300">An incomplete application doesn&apos;t mean someone doesn&apos;t qualify, so CareClear never mixes the two.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {answers.map((a) => (
              <div key={a.q} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                <a.icon className="h-6 w-6 text-teal-300" aria-hidden />
                <p className="mt-3 font-semibold">{a.q}</p>
                <p className="mt-1 text-sm text-slate-300">{a.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-16 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">AI reads. Rules decide.</h2>
          <p className="mt-3 text-slate-600">
            Claude reads bills and checks uploaded documents. Whether someone qualifies is decided only by the hospital&apos;s
            published rules, written as data and tested, so every result traces to a page of the policy. A counselor makes
            the final call.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Adding a hospital is a policy file, not new code</h2>
          <p className="mt-3 text-slate-600">
            Nonprofit hospitals must publish their assistance policy, application, and covered-provider list. CareClear turns
            those into a verified rules file, and each hospital gets its own QR code for its bills.
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Prototype with synthetic patients. Rules from the {policy.policy.title}, revised {policy.policy.revision}. Not affiliated with {policy.name}.
      </footer>
    </main>
  );
}
