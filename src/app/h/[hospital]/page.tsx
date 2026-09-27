import { notFound } from "next/navigation";
import PatientFlow from "@/components/patient/PatientFlow";
import { demoCases } from "@/lib/demo";
import { getPolicy } from "@/lib/policies";

export default async function HospitalPage({ params }: PageProps<"/h/[hospital]">) {
  const { hospital } = await params;
  const policy = getPolicy(hospital);
  if (!policy) notFound();
  return <PatientFlow policy={policy} demoCases={demoCases.filter((c) => c.hospital === policy.id)} />;
}
