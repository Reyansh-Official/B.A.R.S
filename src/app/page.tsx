import { ArrowRight, BadgeCheck, Camera, Check, FileCheck2, ListChecks, QrCode, ScrollText, Send, Stethoscope } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { LogoMark } from "@/components/Logo";
import { getPolicy } from "@/lib/policies";
import { publicUrl } from "@/lib/site-url";

const steps = [
  { icon: Camera, title: "Scan your bill", body: "AI reads who billed you, the date, and what you owe. You confirm it." },
  { icon: ListChecks, title: "Answer 8 questions", body: "Household, income, insurance. One per screen, in plain language." },
  { icon: ScrollText, title: "See where you stand", body: "What's covered and what you likely qualify for, cited from the policy." },
  { icon: Send, title: "Send it complete", body: "Missing a document? See what's accepted instead. The counselor gets it all at once." },
];

const answers = [
  { icon: Stethoscope, q: "Is this bill covered?", a: "The hospital bill is. The doctor's bill goes to the physician group's program, with the number to call.", tone: "text-brand-teal" },
  { icon: BadgeCheck, q: "Do I qualify?", a: "Free care or a sliding-scale discount from the published income table. SNAP or WIC can qualify you automatically.", tone: "text-emerald-300" },
  { icon: FileCheck2, q: "Is my application ready?", a: "Exactly what's missing, what's accepted instead, and a pre-check of every upload.", tone: "text-amber-300" },
];

const stats = [
  { value: "~29%", label: "of eligible patients actually get hospital financial assistance" },
  { value: "$14B", label: "billed to patients each year that should have been waived" },
  { value: "2 bills", label: "from one ER visit is common, often under different programs" },
];

// Hero illustration: an example bill becomes a clear answer.
function BillToAnswer() {
  return (
    <div className="relative mx-auto h-[380px] w-full max-w-md" aria-hidden>
      <div className="absolute left-3 top-6 w-60 -rotate-6 animate-float rounded-lg bg-white p-5 font-mono text-[11px] text-slate-500 shadow-xl ring-1 ring-slate-200">
        <p className="font-sans text-xs font-bold uppercase tracking-widest text-slate-800">Statement</p>
        <p className="mt-1">Emergency dept · 03/14</p>
        <div className="mt-3 space-y-1.5">
          <p className="flex justify-between"><span>Facility charges</span><span>$3,940.00</span></p>
          <p className="flex justify-between"><span>Lab / imaging</span><span>$872.60</span></p>
          <p className="flex justify-between"><span>Insurance adj.</span><span>–$0.00</span></p>
        </div>
        <p className="mt-3 flex justify-between border-t border-dashed border-slate-300 pt-2 font-sans text-sm font-bold text-slate-900"><span>Amount due</span><span>$4,812.60</span></p>
        <span className="absolute -right-3 top-3 animate-stamp rounded-md border-2 border-rose-500 bg-white px-2 py-0.5 font-sans text-[10px] font-black uppercase tracking-widest text-rose-500">Past due</span>
      </div>

      <div className="absolute bottom-0 right-0 w-64 animate-enter rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200 [animation-delay:500ms]">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your results</p>
        <div className="mt-3 space-y-2 text-sm">
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-800"><Check className="h-4 w-4" /> Likely free care</p>
          <p className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sky-900"><Check className="h-4 w-4" /> Bill is covered by the policy</p>
          <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900"><FileCheck2 className="h-4 w-4" /> 1 document to go</p>
        </div>
      </div>

      <ArrowRight className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-blue p-2 text-white shadow-lg" />
    </div>
  );
}

export default async function Home({ searchParams }: PageProps<"/">) {
  // Supabase sends failed OAuth attempts back to the site URL; show the error on the sign-in page instead.
  if ((await searchParams).error_code) redirect("/login?error=oauth");
  const { policy } = (await getPolicy("umms"))!;
  const { url, lan } = await publicUrl("/h/umms");
  const qr = await QRCode.toString(url, { type: "svg", margin: 1, color: { dark: "#0b3440", light: "#ffffff" } });

  return (
    <main className="flex flex-col overflow-x-hidden">
      <div className="relative bg-gradient-to-b from-[#e8f6f4] to-slate-50">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-teal/25 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -left-32 top-64 h-80 w-80 rounded-full bg-brand-blue/10 blur-3xl" aria-hidden />

        <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <p className="flex items-center gap-2 text-brand-navy">
            <LogoMark size={36} />
            <span className="text-lg font-bold tracking-wide">B.A.R.S.</span>
            <span className="hidden text-sm text-slate-500 sm:inline">Bill Accessibility &amp; Relief System</span>
          </p>
          <nav className="flex gap-4 text-sm font-medium text-slate-600">
            <Link href="/counselor" className="hover:text-slate-900">Counselor view</Link>
            <Link href="/counselor/impact" className="hover:text-slate-900">Impact</Link>
          </nav>
        </header>

        <section className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-20 pt-8 md:grid-cols-[1.3fr_1fr]">
          <div className="animate-enter">
            <h1 className="text-[2.75rem] font-extrabold leading-[1.05] tracking-tight text-brand-navy lg:text-[3.5rem]">
              That hospital bill?
              <br />
              <span className="bg-gradient-to-r from-brand-blue to-teal-500 bg-clip-text text-transparent">You might not owe it.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-slate-600">
              Nonprofit hospitals must offer free and discounted care, but most people who qualify never apply. B.A.R.S. turns
              a photo of the bill into a complete application in minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/h/umms" className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-6 py-3.5 font-semibold text-white shadow-lg shadow-brand-navy/20 transition hover:-translate-y-0.5 hover:bg-[#0f4555]">
                Check my bill <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/counselor" className="rounded-xl border border-slate-300 bg-white/70 px-6 py-3.5 font-semibold text-slate-800 backdrop-blur hover:bg-white">
                I&apos;m a hospital counselor
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">Free for patients · About 5 minutes · A counselor makes the final decision</p>
          </div>

          <BillToAnswer />
        </section>
      </div>

      <section className="bg-brand-navy text-white">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 md:grid-cols-3">
          {stats.map((s) => (
            <div key={s.value}>
              <p className="bg-gradient-to-r from-brand-teal to-white bg-clip-text text-5xl font-extrabold tabular-nums text-transparent">{s.value}</p>
              <p className="mt-2 text-slate-300">{s.label}</p>
            </div>
          ))}
          <p className="text-xs text-slate-400 md:col-span-3">First two figures are estimates published by Dollar For, a patient-advocacy nonprofit. See docs/policy-research.md.</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-blue">How it works</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-navy">From bill to application in four steps</h2>
        <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
          <span className="absolute left-6 right-6 top-6 hidden h-0.5 bg-gradient-to-r from-brand-teal via-brand-blue to-brand-navy md:block" aria-hidden />
          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-blue shadow-md ring-1 ring-slate-200">
                <s.icon className="h-6 w-6" aria-hidden />
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-navy text-[11px] font-bold text-white">{i + 1}</span>
              </span>
              <p className="mt-5 text-lg font-bold text-brand-navy">{s.title}</p>
              <p className="mt-1 text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-4 pb-20 md:px-6">
        <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-slate-900 px-6 py-14 text-white md:px-12">
          <h2 className="text-3xl font-extrabold tracking-tight">Three clear answers. Never one vague &ldquo;maybe.&rdquo;</h2>
          <p className="mt-2 max-w-2xl text-slate-300">An incomplete application doesn&apos;t mean someone doesn&apos;t qualify, so B.A.R.S. never mixes the two.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {answers.map((a) => (
              <div key={a.q} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 transition hover:-translate-y-1 hover:bg-white/10">
                <a.icon className={`h-7 w-7 ${a.tone}`} aria-hidden />
                <p className="mt-4 text-lg font-bold">{a.q}</p>
                <p className="mt-1 text-slate-300">{a.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-20 md:grid-cols-[1fr_auto]">
        <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-brand-navy">AI reads. Rules decide.</h2>
            <p className="mt-3 text-slate-600">
              Claude reads bills and checks documents. Eligibility comes only from the hospital&apos;s published, tested rules, so
              every result traces to a page of the policy.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-brand-navy">Any hospital, no new code</h2>
            <p className="mt-3 text-slate-600">
              Nonprofit hospitals must publish their policy. B.A.R.S. turns it into a verified rules file and a QR code for their bills.
            </p>
          </div>
        </div>

        <div className="mx-auto w-60 rotate-2 rounded-3xl bg-white p-5 text-center shadow-xl ring-1 ring-slate-200 transition hover:rotate-0">
          <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-brand-blue"><QrCode className="h-4 w-4" aria-hidden /> Printed on the bill</p>
          <p className="mt-1 font-semibold text-brand-navy">&ldquo;Can&apos;t pay? Scan to see if you qualify.&rdquo;</p>
          <div className="mx-auto mt-3 w-40" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label={`QR code linking to ${url}`} />
          <p className="mt-2 break-all font-mono text-[10px] text-slate-400">{url}</p>
          {lan && <p className="mt-1 text-[11px] text-slate-500">Phone must be on the same Wi-Fi.</p>}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Prototype with synthetic patients. Rules from the {policy.policy.title}, revised {policy.policy.revision}. Not affiliated with {policy.name}.
      </footer>
    </main>
  );
}
