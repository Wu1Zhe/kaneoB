import { createContext, type Dispatch, type SetStateAction } from "react";
import type { OverdueBand } from "./insights-data";

export type InsightsViewState = {
  updates: "changes" | "statistics";
  band: OverdueBand;
  days: 7 | 30;
};

export const DEFAULT_INSIGHTS_VIEW: InsightsViewState = {
  updates: "changes",
  band: "overdue",
  days: 7,
};

export const InsightsViewContext = createContext<{
  state: InsightsViewState;
  setState: Dispatch<SetStateAction<InsightsViewState>>;
} | null>(null);
