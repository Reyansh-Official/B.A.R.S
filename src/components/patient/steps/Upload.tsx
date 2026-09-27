import { useRef, useState } from "react";
import { Card, money } from "@/components/ui";
import type { BillResolution } from "@/lib/groups";
import { shrinkImage } from "@/lib/files";
import type { Bill, Policy } from "@/lib/types";
import { useLang } from "@/lib/i18n";
import type { StepProps } from "../PatientFlow";
import Nav from "./Nav";

const samples = [
  { file: "maria-ummc.pdf", label: "Maria: hospital bill" },
  { file: "james-ummc.pdf", label: "James: ER bill, uninsured" },
  { file: "aisha-ummc.pdf", label: "Aisha: hospital bill" },
  { file: "aisha-fpi.pdf", label: "Aisha: physician bill" },
  { file: "dana-medstar.pdf", label: "Dana: MedStar bill (other hospital)" },
];

function ResolutionChip({ r, homeId }: { r?: BillResolution; homeId: string }) {
  const { tr } = useLang();
  if (!r) return null;
  const [cls, text] =
    r.kind === "separate_program"
      ? ["bg-sky-100 text-sky-900", tr("Doctor's bill · separate program", "Factura del médico · programa aparte")]
      : r.kind === "hospital" && r.status === "live"
        ? ["bg-emerald-100 text-emerald-800", r.hospitalId === homeId ? tr("Covered by this program", "Cubierta por este programa") : tr(`${r.hospitalName} program`, `Programa de ${r.hospitalName}`)]
        : r.kind === "hospital"
          ? ["bg-amber-100 text-amber-900", tr("New hospital · adding their policy", "Hospital nuevo · agregando su póliza")]
          : ["bg-slate-100 text-slate-700", tr("Not a hospital we can screen", "No es un hospital que podamos evaluar")];
  return <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>;
}

const blankBill = (): Bill => ({
  id: crypto.randomUUID(),
  billerName: "",
  serviceDate: "",
  amountOwed: 0,
  uncertainFields: ["billerName", "accountNumber", "serviceDate", "amountOwed"],
});

export default function Upload({ state, update, next, back, policies, homePolicyId, demoMode }: StepProps) {
  const { tr } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState("");

  const read = async (file: File) => {
    setReading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", await shrinkImage(file));
      const res = await fetch("/api/extract", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) return setError(tr(data.error ?? "We couldn't read this bill.", "No pudimos leer esta factura."));
      const bill: Bill = {
        id: crypto.randomUUID(),
        billerName: data.billerName ?? "",
        billerPhone: data.billerPhone ?? undefined,
        accountNumber: data.accountNumber ?? undefined,
        serviceDate: data.serviceDate ?? "",
        statementDate: data.statementDate ?? undefined,
        amountOwed: data.amountOwed ?? 0,
        uncertainFields: data.uncertainFields,
        billerAddress: data.billerAddress ?? undefined,
        billerState: data.billerState ?? undefined,
        billerWebsite: data.billerWebsite ?? undefined,
        billerType: data.billerType ?? undefined,
        patientName: data.patientName ?? undefined,
      };
      // Match the biller to an institution; unknown hospitals start an automatic policy import on the server.
      let resolution: BillResolution | undefined;
      const extra: Record<string, Policy> = {};
      try {
        const r = await fetch("/api/resolve-biller", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bill) });
        if (r.ok) resolution = { ...(await r.json()), billerPhone: bill.billerPhone };
        if (resolution?.kind === "hospital" && resolution.status === "live" && !policies[resolution.hospitalId]) {
          const p = await fetch(`/api/policies/${resolution.hospitalId}`);
          if (p.ok) extra[resolution.hospitalId] = await p.json();
        }
      } catch {
        // Matching is best-effort; the bill still goes through under this hospital's link.
      }
      update({
        bills: [...state.bills, bill],
        resolutions: resolution ? { ...state.resolutions, [bill.id]: resolution } : state.resolutions,
        extraPolicies: { ...state.extraPolicies, ...extra },
        patient: {
          ...state.patient,
          name: state.patient.name || data.patientName || "",
          address: state.patient.address || data.patientAddress || "",
        },
      });
    } catch {
      setError(tr("Something went wrong. Check your connection and try again.", "Algo salió mal. Revise su conexión e intente de nuevo."));
    } finally {
      setReading(false);
    }
  };

  const readSample = async (name: string) => {
    const blob = await (await fetch(`/demo-bills/${name}`)).blob();
    await read(new File([blob], name, { type: "application/pdf" }));
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">{tr("Upload your bill", "Suba su factura")}</h1>
      <p className="text-slate-600">{tr("Take a photo or choose a PDF. Got more than one bill from the same visit? Add them all.", "Tome una foto o elija un PDF. ¿Tiene más de una factura de la misma visita? Agréguelas todas.")}</p>

      {state.bills.map((b) => (
        <Card key={b.id} className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{b.billerName || tr("Bill details to fill in", "Datos de la factura por completar")}</p>
            <p className="text-sm text-slate-600">{b.serviceDate || tr("No date", "Sin fecha")} · {money(b.amountOwed)}</p>
            <ResolutionChip r={state.resolutions?.[b.id]} homeId={homePolicyId} />
          </div>
          <button
            className="text-sm text-slate-500 underline"
            onClick={() => update({ bills: state.bills.filter((x) => x.id !== b.id) })}
          >
            {tr("Remove", "Quitar")}
          </button>
        </Card>
      ))}

      <input
        ref={input}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) read(file);
        }}
      />
      <button
        onClick={() => input.current?.click()}
        disabled={reading}
        className="rounded-2xl border-2 border-dashed border-teal-600 bg-teal-50 px-4 py-8 text-center font-semibold text-teal-800 disabled:opacity-60"
      >
        {reading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
            {tr("Reading your bill…", "Leyendo su factura…")}
          </span>
        ) : state.bills.length ? (
          tr("+ Add another bill", "+ Agregar otra factura")
        ) : (
          tr("Take a photo or choose a file", "Tomar una foto o elegir un archivo")
        )}
      </button>

      {error && (
        <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
          {error}{" "}
          <button className="font-semibold underline" onClick={() => { setError(""); update({ bills: [...state.bills, blankBill()] }); }}>
            {tr("Enter details by hand", "Escribir los datos a mano")}
          </button>
        </div>
      )}

      {demoMode && (
      <details className="text-sm text-slate-600">
        <summary className="cursor-pointer">{tr("Try a sample bill", "Probar una factura de ejemplo")}</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {samples.map((s) => (
            <button key={s.file} disabled={reading} onClick={() => readSample(s.file)} className="rounded-full border border-slate-300 bg-white px-3 py-1 disabled:opacity-50">
              {s.label}
            </button>
          ))}
        </div>
      </details>
      )}

      <Nav next={next} back={back} nextDisabled={reading || state.bills.length === 0} />
    </>
  );
}
