import { smsMode } from "@/lib/reminders";
import { createClient } from "@/lib/supabase/server";
import RunRemindersButton from "@/components/admin/RunRemindersButton";

const LABEL: Record<string, string> = { logged: "preview" };

const STATUS: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-800",
  logged: "bg-slate-100 text-slate-700",
  queued: "bg-amber-100 text-amber-800",
  failed: "bg-rose-100 text-rose-800",
};

export default async function OutboxPage() {
  const db = await createClient();
  const { data: rows } = await db.from("outbox_messages").select("id, application_id, kind, to_last4, body, status, error, created_at").order("created_at", { ascending: false }).limit(100);
  const mode = smsMode();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Text reminders</h1>
          <p className="text-sm text-slate-600">
            {mode === "twilio" ? "Sending real texts through Twilio." : mode === "messages" ? "Sending real texts through this Mac's Messages app." : "Preview mode: every text a patient would receive is shown here. Add a Twilio number to send them for real."} Phone numbers are stored encrypted; only the last 4 digits are shown.
          </p>
        </div>
        <RunRemindersButton />
      </div>
      {!rows?.length ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No reminders yet. They start when a patient opts in on the Review step.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">To</th><th className="px-4 py-3">Kind</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Message</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">{new Date(r.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">•••{r.to_last4}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{r.kind.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[r.status]}`}>{LABEL[r.status] ?? r.status}</span></td>
                  <td className="px-4 py-3 text-slate-700">{r.body}{r.error && <p className="mt-1 text-xs text-rose-700">{r.error}</p>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
