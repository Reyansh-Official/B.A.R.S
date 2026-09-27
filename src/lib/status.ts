import type { AppStatus } from "./store";

export const counselorStatus: Record<AppStatus, { tone: "good" | "warn" | "info" | "bad"; text: string }> = {
  submitted: { tone: "info", text: "New" },
  info_requested: { tone: "warn", text: "Waiting on patient" },
  responded: { tone: "good", text: "Patient responded" },
  in_review: { tone: "good", text: "In review" },
};
