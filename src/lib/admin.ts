import "server-only";
import { redirect } from "next/navigation";
import { getCounselor } from "./auth";
import { createClient } from "./supabase/server";

// Admins are counselors with a row in public.admins; the database enforces the same rule via is_admin().
export async function isAdmin(): Promise<boolean> {
  if (!(await getCounselor())) return false;
  const { data } = await (await createClient()).rpc("is_admin");
  return data === true;
}

export async function requireAdmin(from = "/admin") {
  if (!(await getCounselor())) redirect(`/login?next=${encodeURIComponent(from)}`);
  if (!(await isAdmin())) redirect("/counselor");
}
