import Link from "next/link";
import { listPolicies } from "@/lib/policies";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10">
      <h1 className="text-3xl font-bold">CareClear</h1>
      <p className="text-slate-600">Turn a hospital bill into a review-ready financial-assistance application.</p>
      {listPolicies().map((p) => (
        <Link key={p.id} href={`/h/${p.id}`} className="rounded-xl bg-teal-700 px-4 py-3 text-center font-semibold text-white">
          Patient: {p.name}
        </Link>
      ))}
      <Link href="/counselor" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-semibold">
        Counselor dashboard
      </Link>
    </main>
  );
}
