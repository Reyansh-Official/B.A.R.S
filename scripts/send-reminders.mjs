// Daily reminder sweep: npm run send-reminders (schedule with cron or a hosted scheduler).
const base = process.env.BARS_URL ?? process.env.BARS_PUBLIC_URL ?? "http://localhost:3100";
const res = await fetch(`${base}/api/reminders/run`, { method: "POST", headers: { Authorization: `Bearer ${process.env.BARS_CRON_SECRET}` } });
console.log(res.status, await res.text());
if (!res.ok) process.exit(1);
