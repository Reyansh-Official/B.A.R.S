import { Clock, FileText, Lock, ReceiptText, Scale, UserCheck } from "lucide-react";
import type { StepProps } from "../PatientFlow";

const gets = [
  { icon: ReceiptText, text: "Which of your bills the hospital's program covers" },
  { icon: Scale, text: "Whether you're likely to get free or discounted care" },
  { icon: FileText, text: "A complete application, ready for a financial counselor" },
];

export default function Welcome({ policy, next }: StepProps) {
  return (
    <>
      <div className="rounded-3xl bg-gradient-to-br from-teal-700 to-teal-900 p-7 text-white">
        <p className="text-base font-medium text-teal-100">Financial assistance</p>
        <h1 className="mt-1 text-[34px] font-bold leading-tight">Get help with your hospital bill</h1>
        <p className="mt-3 text-lg text-teal-50">
          {policy.name} offers free and reduced-cost care based on household income. Many people who qualify never apply.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-base"><Clock className="h-[18px] w-[18px]" aria-hidden /> About 5 minutes</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-lg font-semibold text-slate-900">You&apos;ll find out</p>
        <ul className="mt-3 flex flex-col gap-3">
          {gets.map((g) => (
            <li key={g.text} className="flex items-start gap-3 text-lg text-slate-700">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><g.icon className="h-[18px] w-[18px]" aria-hidden /></span>
              <span className="pt-1">{g.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-slate-100 pt-3 text-base text-slate-500">You just need your bill to start. Other paperwork can come later.</p>
      </div>

      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-slate-500">
        <span className="inline-flex items-center gap-1"><Lock className="h-4 w-4" aria-hidden /> Free for patients</span>
        <span className="inline-flex items-center gap-1"><UserCheck className="h-4 w-4" aria-hidden /> A counselor makes the final decision</span>
      </div>
      <div className="mt-auto pt-4">
        <button type="button" onClick={next} className="w-full rounded-xl bg-teal-700 px-5 py-3.5 text-lg font-semibold text-white hover:bg-teal-800">Get started</button>
      </div>
    </>
  );
}
