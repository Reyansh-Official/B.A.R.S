import { notFound } from "next/navigation";
import StatusScreen from "@/components/patient/StatusScreen";
import { getPolicy } from "@/lib/policies";

export default async function StatusPage({ params, searchParams }: PageProps<"/h/[hospital]/a/[id]">) {
  const { hospital, id } = await params;
  const { t, lang } = await searchParams;
  const loaded = await getPolicy(hospital);
  if (!loaded) notFound();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <StatusScreen id={id} token={typeof t === "string" ? t : ""} policy={loaded.policy} lang={lang === "es" ? "es" : undefined} />
    </main>
  );
}
