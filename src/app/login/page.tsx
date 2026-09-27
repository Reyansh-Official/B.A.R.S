import { LogoFull } from "@/components/Logo";
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
        <LogoFull width={120} className="mx-auto" />
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Counselor sign-in</h1>
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
