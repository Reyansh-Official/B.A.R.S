import { HeartHandshake } from "lucide-react";
import { hasSupabaseEnv } from "@/lib/supabase/proxy";
import LoginForm from "./LoginForm";
import OAuthButtons from "./OAuthButtons";

const errors: Record<string, string> = {
  oauth: "Sign-in didn't finish. Please try again.",
  not_counselor: "That account isn't set up as a financial counselor. Ask your administrator to add you.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const nextPath = typeof next === "string" ? next : "/counselor";
  return (
    <main className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="flex items-center gap-2 font-semibold tracking-wide text-teal-800"><HeartHandshake className="h-5 w-5" aria-hidden /> B.A.R.S.</p>
        <p className="mt-0.5 text-xs text-slate-500">Bill Accessibility &amp; Relief System</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Counselor sign-in</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">For hospital financial counseling staff. Patients don&apos;t need an account.</p>
        {typeof error === "string" && errors[error] && (
          <p role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{errors[error]}</p>
        )}
        {hasSupabaseEnv() ? (
          <>
            <OAuthButtons next={nextPath} />
            <LoginForm next={nextPath} />
          </>
        ) : (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Supabase isn&apos;t connected yet. Add the Supabase keys to <code className="font-mono">.env.local</code> (see README).
          </p>
        )}
      </div>
    </main>
  );
}
