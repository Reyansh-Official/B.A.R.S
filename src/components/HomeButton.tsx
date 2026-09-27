"use client";

import { House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Patient-facing pages only (staff pages have Home in their header nav). Floats in the margin on wide screens.
export default function HomeButton() {
  const path = usePathname();
  // Sits outside the patient flow's language provider, so follow the page's lang attribute instead.
  const [es, setEs] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => setEs(html.lang === "es");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, [path]);
  if (path === "/" || path.startsWith("/counselor") || path.startsWith("/admin")) return null;
  const midApplication = /^\/h\/[^/]+$/.test(path);
  return (
    <Link
      href="/"
      onClick={(e) => {
        if (midApplication && !confirm(es ? "¿Ir a la página de inicio? Se perderán las respuestas que aún no ha enviado." : "Go to the home page? Answers you haven't sent yet will be lost.")) e.preventDefault();
      }}
      className={`z-50 mx-4 mt-4 inline-flex items-center gap-[5px] self-start rounded-full border-2 border-slate-200 bg-white px-[13px] py-[5px] text-[14px] md:gap-[10px] md:px-[23px] md:py-[10px] md:text-[27px] leading-none font-semibold text-slate-700 shadow-md hover:bg-slate-50 hover:text-teal-800 xl:fixed xl:left-6 xl:top-6 xl:m-0`}
    >
      <House className="h-4 w-4 text-teal-700 md:h-[31px] md:w-[31px]" aria-hidden /> {es ? "Inicio" : "Home"}
    </Link>
  );
}
