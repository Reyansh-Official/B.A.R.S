import { notFound } from "next/navigation";
import PatientFlow from "@/components/patient/PatientFlow";
import { demoCases } from "@/lib/demo";
import { isDemoMode } from "@/lib/demo-mode";
import { getPolicy } from "@/lib/policies";

export default async function HospitalPage({ params }: PageProps<"/h/[hospital]">) {
  const { hospital } = await params;
  const loaded = await getPolicy(hospital);
  if (!loaded) notFound();
  const { policy } = loaded;
  const demo = isDemoMode();
  return <PatientFlow policy={policy} demoMode={demo} demoCases={demo ? demoCases.filter((c) => c.hospital === policy.id) : []} />;
}
