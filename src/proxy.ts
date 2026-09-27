import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Optimistic check only; counselor pages and API routes verify the counselor again.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|demo-bills|demo-docs|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)"],
};
