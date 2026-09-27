import { signInWithProvider, type OAuthProvider } from "./actions";

const labels: Record<OAuthProvider, string> = {
  google: "Continue with Google",
  azure: "Continue with Microsoft",
  github: "Continue with GitHub",
};

// Buttons only appear for providers listed in NEXT_PUBLIC_AUTH_PROVIDERS (enable each in Supabase first).
export function enabledProviders(): OAuthProvider[] {
  return (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter((p): p is OAuthProvider => p in labels);
}

export default function OAuthButtons({ next }: { next: string }) {
  const providers = enabledProviders();
  if (!providers.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {providers.map((p) => (
        <form key={p} action={signInWithProvider.bind(null, p, next)}>
          <button className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50">{labels[p]}</button>
        </form>
      ))}
      <div className="my-2 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" /> or use a password <span className="h-px flex-1 bg-slate-200" />
      </div>
    </div>
  );
}
