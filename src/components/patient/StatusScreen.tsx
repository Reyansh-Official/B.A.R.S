"use client";

import { LangProvider, LangToggle, useLang, type Lang } from "@/lib/i18n";
import type { Policy } from "@/lib/types";
import ApplicationStatus from "./ApplicationStatus";

function Screen({ id, token, policy }: { id: string; token: string; policy: Policy }) {
  const { tr } = useLang();
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-teal-700">B.A.R.S. · {policy.name}</p>
        <LangToggle />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">{tr("Your application", "Su solicitud")}</h1>
      <ApplicationStatus id={id} token={token} policy={policy} />
    </>
  );
}

export default function StatusScreen(props: { id: string; token: string; policy: Policy; lang?: Lang }) {
  return (
    <LangProvider initial={props.lang}>
      <Screen {...props} />
    </LangProvider>
  );
}
