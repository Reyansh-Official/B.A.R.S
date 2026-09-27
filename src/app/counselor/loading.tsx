// Shown instantly while a counselor page's data loads, so tab switches feel immediate.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl animate-pulse px-6 py-8" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-40 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-72 rounded bg-slate-100" />
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-36 rounded-2xl border border-slate-200 bg-white" />)}
      </div>
      <div className="mt-6 h-72 rounded-2xl border border-slate-200 bg-white" />
    </main>
  );
}
