import { notFound } from "next/navigation";
import ApplicationStatus from "@/components/patient/ApplicationStatus";
import { getPolicy } from "@/lib/policies";

export default async function StatusPage({ params, searchParams }: PageProps<"/h/[hospital]/a/[id]">) {
  const { hospital, id } = await params;
  const { t } = await searchParams;
  const loaded = await getPolicy(hospital);
  if (!loaded) notFound();
  const { policy } = loaded;
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <p className="text-sm font-semibold text-teal-700">B.A.R.S. · {policy.name}</p>
      <h1 className="text-2xl font-bold text-slate-900">Your application</h1>
      <ApplicationStatus id={id} token={typeof t === "string" ? t : ""} policy={policy} />
    </main>
  );
}
