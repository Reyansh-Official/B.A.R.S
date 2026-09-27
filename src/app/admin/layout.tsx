import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-semibold text-slate-900"><ShieldCheck className="h-5 w-5 text-teal-700" aria-hidden /> B.A.R.S. admin · Hospital policies</Link>
          <Link href="/counselor" className="text-sm text-slate-600 hover:text-slate-900">Counselor view</Link>
        </div>
      </header>
      {children}
    </div>
  );
}
