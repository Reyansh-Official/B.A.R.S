import type { AppStatus, Application } from "./store";

export interface Metrics {
  total: number;
  sampleCount: number;
  completeFirstTimePct: number | null;
  followUpsPerApp: number | null;
  medianHoursToReview: number | null;
  reviewedCount: number;
  statusCounts: Record<AppStatus, number>;
  followUpReasons: { label: string; count: number }[];
  docsChecked: number;
  docsFlagged: number;
  alternativesUsed: number;
  billsRouted: number;
  presumptive: number;
  screenedReduction: number;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export function computeMetrics(apps: Application[]): Metrics {
  const statusCounts: Record<AppStatus, number> = { submitted: 0, info_requested: 0, responded: 0, in_review: 0 };
  const reasons = new Map<string, number>();
  const hoursToReview: number[] = [];
  let firstTimeKnown = 0, firstTimeComplete = 0, requests = 0;
  let docsChecked = 0, docsFlagged = 0, alternativesUsed = 0, billsRouted = 0, presumptive = 0, screenedReduction = 0;

  for (const app of apps) {
    statusCounts[app.status]++;
    const events = app.events ?? [];
    const submitted = events.find((e) => e.type === "submitted");
    if (submitted?.missingCount != null) {
      firstTimeKnown++;
      if (submitted.missingCount === 0) firstTimeComplete++;
    }
    const reviewed = events.find((e) => e.type === "in_review");
    if (submitted && reviewed) hoursToReview.push((Date.parse(reviewed.at) - Date.parse(submitted.at)) / 3_600_000);

    const labels = Object.fromEntries(app.screening.readiness.documents.map((d) => [d.id, d.label]));
    for (const r of app.requests ?? []) {
      requests++;
      for (const id of r.docIds) reasons.set(labels[id] ?? id, (reasons.get(labels[id] ?? id) ?? 0) + 1);
    }

    for (const d of Object.values(app.docs)) {
      docsChecked += d.checks?.length ?? 0;
      docsFlagged += d.checks?.filter((c) => c.verdict !== "ok").length ?? 0;
      if (d.status === "alternative") alternativesUsed++;
    }
    billsRouted += app.screening.coverage.filter((c) => c.status === "separate_program").length;
    if (app.screening.eligibility.status === "presumptive") presumptive++;
    for (const b of app.bills) {
      const after = app.screening.estimatedOwed[b.id];
      if (after != null) screenedReduction += b.amountOwed - after;
    }
  }

  return {
    total: apps.length,
    sampleCount: apps.filter((a) => a.sample).length,
    completeFirstTimePct: firstTimeKnown ? Math.round((firstTimeComplete / firstTimeKnown) * 100) : null,
    followUpsPerApp: apps.length ? Math.round((requests / apps.length) * 10) / 10 : null,
    medianHoursToReview: median(hoursToReview),
    reviewedCount: hoursToReview.length,
    statusCounts,
    followUpReasons: [...reasons].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    docsChecked,
    docsFlagged,
    alternativesUsed,
    billsRouted,
    presumptive,
    screenedReduction: Math.round(screenedReduction),
  };
}
