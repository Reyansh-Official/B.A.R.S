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
      className={`z-50 mx-4 mt-4 inline-flex items-center gap-[5px] self-start rounded-full border-2 border-slate-200 bg-white px-[13px] py-[5px] text-[14px] md:gap-[10px] md:px-[23px] md:py-[10px] md:text-[27px] leading-none font-semibold text-slate-700 shadow-md hover:bg-slate-50 hover:text-teal-800 ${float}`}
    >
      <House className="h-4 w-4 text-teal-700 md:h-[31px] md:w-[31px]" aria-hidden /> Home
    </Link>
  );
}
