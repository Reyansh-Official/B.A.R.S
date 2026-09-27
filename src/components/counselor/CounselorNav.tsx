"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/counselor", label: "Queue" },
  { href: "/counselor/impact", label: "Impact" },
];

export default function CounselorNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1">
      <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
        <House className="h-4 w-4" aria-hidden /> Home
      </Link>
      {tabs.map((t) => {
        const active = t.href === "/counselor" ? path === "/counselor" || /^\/counselor\/(?!impact)/.test(path) : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
