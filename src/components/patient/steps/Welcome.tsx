import { Card } from "@/components/ui";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";

export default function Welcome({ policy, next }: StepProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Get help with your hospital bill</h1>
      <Card>
        <p className="text-slate-700">
          {policy.name} offers free and reduced-cost care based on household income. In about 5 minutes we&apos;ll check
          which of your charges it covers, whether you&apos;re likely to qualify, and get your application ready for a
          financial counselor.
        </p>
      </Card>
      <p className="text-sm text-slate-500">Free for patients. A counselor makes the final decision.</p>
      <Nav next={next} nextLabel="Start" />
    </>
  );
}
