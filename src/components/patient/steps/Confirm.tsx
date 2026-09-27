import { Card } from "@/components/ui";
import type { Bill } from "@/lib/types";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";

const fields = [
  { key: "billerName", label: "Billed by", type: "text" },
  { key: "accountNumber", label: "Account number", type: "text" },
  { key: "serviceDate", label: "Date of service", type: "date" },
  { key: "amountOwed", label: "Amount you owe", type: "number" },
] as const;

export default function Confirm({ state, update, next, back }: StepProps) {
  const edit = (id: string, key: keyof Bill, raw: string) =>
    update({
      bills: state.bills.map((b) =>
        b.id === id
          ? { ...b, [key]: key === "amountOwed" ? Number(raw) || 0 : raw, uncertainFields: b.uncertainFields?.filter((f) => f !== key) }
          : b,
      ),
    });

  const complete = state.bills.every((b) => b.billerName.trim() && b.serviceDate && b.amountOwed > 0);

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Is this right?</h1>
      <p className="text-slate-600">We read these from your bill. Fix anything that doesn&apos;t match.</p>
      {state.bills.map((b, i) => (
        <Card key={b.id}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Bill {i + 1}</p>
          <div className="flex flex-col gap-3">
            {fields.map((f) => {
              const unsure = b.uncertainFields?.includes(f.key);
              return (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-slate-700">
                    {f.label}
                    {unsure && <span className="ml-2 text-amber-700">Please check</span>}
                  </span>
                  <input
                    type={f.type}
                    inputMode={f.type === "number" ? "decimal" : undefined}
                    step={f.type === "number" ? "0.01" : undefined}
                    value={b[f.key] ?? ""}
                    onChange={(e) => edit(b.id, f.key, e.target.value)}
                    className={`rounded-lg border px-3 py-2 text-base ${unsure ? "border-amber-400 bg-amber-50" : "border-slate-300 bg-white"}`}
                  />
                </label>
              );
            })}
          </div>
        </Card>
      ))}
      {!complete && <p className="text-sm text-amber-800">Each bill needs who billed you, the date of service, and the amount.</p>}
      <Nav next={next} back={back} nextLabel="Looks right" nextDisabled={!complete} />
    </>
  );
}
