import { Clock, FileText, Lock, ReceiptText, Scale, UserCheck } from "lucide-react";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";

const gets = [
  { icon: ReceiptText, text: "Which of your bills the hospital's program covers" },
  { icon: Scale, text: "Whether you're likely to get free or discounted care" },
  { icon: FileText, text: "A complete application, ready for a financial counselor" },
];

export default function Welcome({ policy, next }: StepProps) {
  return (
    <>
      <div className="rounded-3xl bg-gradient-to-br from-teal-700 to-teal-900 p-6 text-white">
        <p className="text-sm font-medium text-teal-100">Financial assistance</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight">Get help with your hospital bill</h1>
        <p className="mt-3 text-teal-50">
          {policy.name} offers free and reduced-cost care based on household income. Many people who qualify never apply.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm"><Clock className="h-4 w-4" aria-hidden /> About 5 minutes</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="font-semibold text-slate-900">You&apos;ll find out</p>
        <ul className="mt-3 flex flex-col gap-3">
          {gets.map((g) => (
            <li key={g.text} className="flex items-start gap-3 text-slate-700">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><g.icon className="h-4 w-4" aria-hidden /></span>
              <span className="pt-1">{g.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500">You just need your bill to start. Other paperwork can come later.</p>
      </div>

      <div className="flex justify-center gap-5 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><Lock className="h-3.5 w-3.5" aria-hidden /> Free for patients</span>
        <span className="inline-flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" aria-hidden /> A counselor makes the final decision</span>
      </div>
      <Nav next={next} nextLabel="Get started" />
    </>
  );
}
