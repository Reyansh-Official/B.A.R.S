import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles =
    variant === "primary"
      ? "bg-teal-700 text-white hover:bg-teal-800 disabled:bg-slate-300"
      : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`w-full rounded-xl px-4 py-3 text-base font-semibold ${styles}`}>
      {children}
    </button>
  );
}

const badgeTones = {
  good: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-900",
  info: "bg-sky-100 text-sky-900",
  bad: "bg-rose-100 text-rose-800",
};

export function Badge({ tone, children }: { tone: keyof typeof badgeTones; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${badgeTones[tone]}`}>{children}</span>;
}

export function Todo({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3 text-sm text-amber-900">TODO: {children}</p>;
}

export const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
