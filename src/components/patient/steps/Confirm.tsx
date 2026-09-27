import { Card, Todo, money } from "@/components/ui";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";

export default function Confirm({ state, next, back }: StepProps) {
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Is this right?</h1>
      {state.bills.map((b) => (
        <Card key={b.id}>
          <p className="font-semibold">{b.billerName}</p>
          <p className="text-sm text-slate-600">Service date {b.serviceDate} · Account {b.accountNumber}</p>
          <p className="mt-2 text-lg font-bold">{money(b.amountOwed)}</p>
        </Card>
      ))}
      <Todo>Make each extracted field editable so the patient can correct what the AI read.</Todo>
      <Nav next={next} back={back} nextLabel="Looks right" />
    </>
  );
}
