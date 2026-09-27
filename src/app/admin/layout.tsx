import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/admin" className="flex items-center gap-2 font-semibold text-slate-900"><LogoMark size={28} /> B.A.R.S. admin</Link>
          <nav className="flex gap-5 text-sm text-slate-600">
            <Link href="/admin/outbox" className="hover:text-slate-900">Text reminders</Link>
            <Link href="/counselor" className="hover:text-slate-900">Counselor view</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
