import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where Google/Microsoft send counselors back after signing in. Only accounts linked to a hospital get in.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/counselor";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/counselor";
  if (!code) return NextResponse.redirect(`${origin}/login?error=oauth`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(`${origin}/login?error=oauth`);

  const { data: counselor } = await supabase.from("counselors").select("hospital_id").eq("user_id", data.user.id).maybeSingle();
  if (!counselor) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_counselor`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
