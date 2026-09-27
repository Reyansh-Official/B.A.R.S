// Usage: npm run add-counselor -- <email> [hospitalId] [--oauth-only]
// Creates (or updates) a Supabase Auth user and links it to a hospital in public.counselors.
// --oauth-only: no password; the counselor signs in with Google/Microsoft using this email.
// --admin: can also review and approve imported hospital policies.
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline";

const args = process.argv.slice(2);
const oauthOnly = args.includes("--oauth-only");
const makeAdmin = args.includes("--admin");
const [email, hospitalId = "umms"] = args.filter((a) => !a.startsWith("--"));
if (!email || !email.includes("@")) {
  console.error("Usage: npm run add-counselor -- <email> [hospitalId]");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY to .env.local first.");
  process.exit(1);
}

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => rl.output.write(s.startsWith(question) ? s : "");
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = oauthOnly ? null : process.env.CC_PASSWORD ?? (await askHidden("Password (min 10 characters): "));
if (password !== null && password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
let user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (user) {
  if (password) {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password });
    if (error) throw error;
  }
} else {
  const { data, error } = await admin.auth.admin.createUser({ email, ...(password ? { password } : {}), email_confirm: true });
  if (error) throw error;
  user = data.user;
}

const { error: linkError } = await admin.from("counselors").upsert({ user_id: user.id, hospital_id: hospitalId });
if (linkError) throw linkError;
if (makeAdmin) {
  const { error } = await admin.from("admins").upsert({ user_id: user.id });
  if (error) throw error;
}
console.log(`Counselor ${email} can now sign in for ${hospitalId}${oauthOnly ? " with Google or Microsoft" : ""}${makeAdmin ? " (admin)" : ""}.`);
