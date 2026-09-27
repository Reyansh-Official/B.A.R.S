import { Badge, Card, Todo } from "@/components/ui";
import { screen } from "@/lib/rules";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";

const tone = { provided: "good", alternative: "info", missing: "warn", counselor: "info" } as const;

export default function Documents({ policy, state, next, back }: StepProps) {
  const { readiness } = screen(policy, state.bills, state.answers, state.docs, state.medicaidStatus);
  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Your documents</h1>
      {readiness.documents.map((d) => (
        <Card key={d.id}>
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold">{d.label}</p>
            <Badge tone={tone[d.status]}>{d.status}</Badge>
          </div>
          {d.statusNote && <p className="mt-1 text-sm text-slate-600">{d.statusNote}</p>}
          {d.alternatives.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">Accepted instead: {d.alternatives.join(" · ")}</p>
          )}
        </Card>
      ))}
      <Todo>Upload per document, plus an &quot;I don&apos;t have this&quot; button that offers the alternatives above or asks a counselor.</Todo>
      <Nav next={next} back={back} />
    </>
  );
}
