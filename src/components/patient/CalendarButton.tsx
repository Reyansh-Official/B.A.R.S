"use client";

import { CalendarPlus } from "lucide-react";

// All-day .ics event with a reminder two days before; works with Apple, Google and Outlook calendars.
export default function CalendarButton({ date, title, details }: { date: string; title: string; details: string }) {
  const add = () => {
    const d = date.slice(0, 10).replaceAll("-", "");
    const end = new Date(new Date(`${date.slice(0, 10)}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10).replaceAll("-", "");
    const esc = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//B.A.R.S.//EN", "BEGIN:VEVENT",
      `UID:${d}-${title.length}@bars`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d+/g, "")}`,
      `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(details)}`,
      "BEGIN:VALARM", "TRIGGER:-P2D", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "deadline.ics";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900">
      <CalendarPlus className="h-4 w-4" aria-hidden /> Add to my calendar
    </button>
  );
}
