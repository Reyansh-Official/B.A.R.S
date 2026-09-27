"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// On every page but home, top-left. Floats in the margin on wide screens except staff pages, whose wide headers it would cover.
export default function HomeButton() {
  const path = usePathname();
  if (path === "/") return null;
  const midApplication = /^\/h\/[^/]+$/.test(path);
  const float = path.startsWith("/admin") || path.startsWith("/counselor") ? "" : "xl:fixed xl:left-6 xl:top-6 xl:m-0";
  return (
    <Link
      href="/"
      onClick={(e) => {
        if (midApplication && !confirm("Go to the home page? Answers you haven't sent yet will be lost.")) e.preventDefault();
      }}
      className={`z-50 mx-4 mt-4 inline-flex items-center gap-2 self-start rounded-full border-2 border-slate-200 bg-white px-5 py-2 text-[21px] md:gap-4 md:px-9 md:py-4 md:text-[42px] leading-none font-semibold text-slate-700 shadow-md hover:bg-slate-50 hover:text-teal-800 ${float}`}
    >
      <House className="h-6 w-6 text-teal-700 md:h-12 md:w-12" aria-hidden /> Home
    </Link>
  );
}
