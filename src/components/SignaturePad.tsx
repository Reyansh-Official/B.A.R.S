"use client";

import { useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n";

export default function SignaturePad({ label, onChange }: { label: string; onChange: (dataUrl: string | null) => void }) {
  const { tr } = useLang();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    const c = canvas.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    hasInk.current = false;
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <button type="button" onClick={clear} className="text-sm text-slate-500 underline">{tr("Clear", "Borrar")}</button>
      </div>
      <canvas
        ref={canvas}
        aria-label={label}
        className="h-32 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white"
        onPointerDown={(e) => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = canvas.current!.getContext("2d")!;
          ctx.beginPath();
          ctx.moveTo(...point(e));
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvas.current!.getContext("2d")!;
          ctx.lineTo(...point(e));
          ctx.stroke();
          hasInk.current = true;
        }}
        onPointerUp={() => {
          drawing.current = false;
          if (hasInk.current) onChange(canvas.current!.toDataURL("image/png"));
        }}
      />
      <span className="text-xs text-slate-400">{tr("Sign with your finger or mouse", "Firme con el dedo o el ratón")}</span>
    </div>
  );
}
