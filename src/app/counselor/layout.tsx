import type { ReactNode } from "react";
import CounselorNav from "@/components/counselor/CounselorNav";

export default function CounselorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
          <p className="font-semibold text-teal-700">CareClear <span className="font-normal text-slate-500">· Financial counseling</span></p>
          <CounselorNav />
        </div>
      </header>
      {children}
    </div>
  );
}
