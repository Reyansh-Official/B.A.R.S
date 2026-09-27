import "server-only";

// Demo controls (sample patients, sample bills/documents, sample dashboard data) only appear when DEMO_MODE=true.
export const isDemoMode = () => process.env.DEMO_MODE === "true";
