import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import CounselorNav from "@/components/counselor/CounselorNav";
import { requireCounselor } from "@/lib/auth";
import { getPolicy } from "@/lib/policies";
import { signOut } from "../login/actions";

export default async function CounselorLayout({ children }: { children: ReactNode }) {
  const counselor = await requireCounselor();
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <p className="font-semibold text-teal-700">
            CareClear <span className="font-normal text-slate-500">· {(await getPolicy(counselor.hospitalId))?.policy.name ?? counselor.hospitalId}</span>
          </p>
          <div className="flex items-center gap-4">
            <CounselorNav />
            <form action={signOut} className="flex items-center gap-2 border-l border-slate-200 pl-4 text-sm text-slate-500">
              <span className="hidden sm:inline">{counselor.email}</span>
              <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-slate-800" title="Sign out">
                <LogOut className="h-4 w-4" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
