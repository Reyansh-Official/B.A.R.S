import { Card, Todo } from "@/components/ui";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";

export default function Questions({ state, next, back }: StepProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">About your household</h1>
      <Todo>
        One question per screen: household size, yearly income, work situation, insurance, SNAP/WIC/Medicaid,
        housing, accident or injury claim. Writes to state.answers.
      </Todo>
      <Card>
        <pre className="overflow-x-auto text-xs text-slate-600">{JSON.stringify(state.answers, null, 2)}</pre>
      </Card>
      <Nav next={next} back={back} nextLabel="See my results" />
    </>
  );
}
