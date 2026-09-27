"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Only same-site paths, so the login page can't be used to bounce people to another site.
const safeNext = (next: unknown) => (typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/counselor");

export async function signIn(_prev: { error?: string } | undefined, form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.status === 429 ? "Too many attempts. Try again in a few minutes." : "That email and password don't match." };
  }
  const { data: counselor } = await supabase.from("counselors").select("hospital_id").eq("user_id", data.user.id).maybeSingle();
  if (!counselor) {
    await supabase.auth.signOut();
    return { error: "This account isn't set up as a financial counselor." };
  }
  redirect(safeNext(form.get("next")));
}

const OAUTH_PROVIDERS = ["google", "azure", "github"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export async function signInWithProvider(provider: OAuthProvider, next: string) {
  if (!OAUTH_PROVIDERS.includes(provider)) return;
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`,
      // Microsoft doesn't return the email address unless asked for it.
      scopes: provider === "azure" ? "email" : undefined,
    },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
