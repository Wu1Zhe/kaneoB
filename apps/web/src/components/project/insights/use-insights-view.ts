import { useContext, useState } from "react";
import {
  DEFAULT_INSIGHTS_VIEW,
  InsightsViewContext,
  type InsightsViewState,
} from "./insights-view-context";

export function useInsightsView<K extends keyof InsightsViewState>(key: K) {
  const shared = useContext(InsightsViewContext);
  const [local, setLocal] = useState(DEFAULT_INSIGHTS_VIEW[key]);
  const setValue = (value: InsightsViewState[K]) => {
    if (shared) shared.setState((current) => ({ ...current, [key]: value }));
    else setLocal(value);
  };
  return [shared ? shared.state[key] : local, setValue] as const;
}
