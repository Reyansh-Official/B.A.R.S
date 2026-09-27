import { Card, Todo } from "@/components/ui";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";

export default function Upload({ state, next, back }: StepProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Upload your bill</h1>
      <Card>
        <Todo>Camera/file input (image or PDF), POST to /api/extract, add the result to state.bills. Allow a second bill.</Todo>
        {state.bills.length > 0 && <p className="mt-3 text-sm text-slate-600">{state.bills.length} bill(s) loaded from demo.</p>}
      </Card>
      <Nav next={next} back={back} />
    </>
  );
}
