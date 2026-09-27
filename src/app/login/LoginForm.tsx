"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Work email
        <input name="email" type="email" autoComplete="username" required className="rounded-lg border border-slate-300 px-3 py-2 text-base" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Password
        <input name="password" type="password" autoComplete="current-password" required className="rounded-lg border border-slate-300 px-3 py-2 text-base" />
      </label>
      {state?.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
      <button disabled={pending} className="rounded-xl bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
