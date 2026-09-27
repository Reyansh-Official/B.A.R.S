"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "es";

interface LangValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  tr: (en: string, es: string) => string;
}

const LangContext = createContext<LangValue>({ lang: "en", setLang: () => {}, tr: (en) => en });
const KEY = "bars-lang";

// Written translations sit next to the English (tr). Policy text that differs per hospital goes through <Auto>.
export function LangProvider({ children, initial }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initial ?? "en");
  useEffect(() => {
    if (initial) return;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    const detected = saved === "es" || saved === "en" ? saved : navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only preference, read after hydration
    if (detected !== "en") setLangState(detected);
  }, [initial]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  };
  return <LangContext.Provider value={{ lang, setLang, tr: (en, es) => (lang === "es" ? es : en) }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label="Language / Idioma" className="flex rounded-full border border-slate-300 bg-white p-0.5 text-xs font-semibold">
      {(["en", "es"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 ${lang === l ? "bg-teal-700 text-white" : "text-slate-600 hover:text-slate-900"}`}
        >
          {l === "en" ? "English" : "Español"}
        </button>
      ))}
    </div>
  );
}

// Machine translation for hospital-specific text, batched per tick and cached for the session.
const cache = new Map<string, string>();
const waiting = new Map<string, ((es: string) => void)[]>();
let timer: ReturnType<typeof setTimeout> | undefined;

function flush() {
  timer = undefined;
  const texts = [...waiting.keys()].slice(0, 60);
  const callbacks = texts.map((t) => waiting.get(t)!);
  texts.forEach((t) => waiting.delete(t));
  if (waiting.size) timer = setTimeout(flush, 0);
  fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts }) })
    .then((r) => (r.ok ? r.json() : { translations: texts }))
    .catch(() => ({ translations: texts }))
    .then(({ translations }: { translations: string[] }) =>
      texts.forEach((t, i) => {
        const es = translations[i] ?? t;
        if (es !== t) cache.set(t, es);
        callbacks[i].forEach((cb) => cb(es));
      }),
    );
}

export function useAuto(text: string | undefined): string | undefined {
  const { lang } = useLang();
  const [done, setDone] = useState<{ from: string; to: string } | null>(null);
  useEffect(() => {
    if (lang !== "es" || !text?.trim() || cache.has(text)) return;
    let live = true;
    waiting.set(text, [...(waiting.get(text) ?? []), (to) => live && setDone({ from: text, to })]);
    timer ??= setTimeout(flush, 30);
    return () => {
      live = false;
    };
  }, [lang, text]);
  if (lang !== "es" || !text) return text;
  return cache.get(text) ?? (done?.from === text ? done.to : text);
}

export function Auto({ children }: { children: string | undefined }) {
  return <>{useAuto(children)}</>;
}
