import { notFound } from "next/navigation";
import ApplicationStatus from "@/components/patient/ApplicationStatus";
import { getPolicy } from "@/lib/policies";

export default async function StatusPage({ params }: PageProps<"/h/[hospital]/a/[id]">) {
  const { hospital, id } = await params;
  const policy = getPolicy(hospital);
  if (!policy) notFound();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <p className="text-sm font-semibold text-teal-700">CareClear · {policy.name}</p>
      <h1 className="text-2xl font-bold text-slate-900">Your application</h1>
      <ApplicationStatus id={id} policy={policy} />
    </main>
  );
}
