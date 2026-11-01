import { type ReactNode, useMemo, useState } from "react";
import {
  DEFAULT_INSIGHTS_VIEW,
  InsightsViewContext,
} from "./insights-view-context";

export function InsightsViewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(DEFAULT_INSIGHTS_VIEW);
  const value = useMemo(() => ({ state, setState }), [state]);
  return (
    <InsightsViewContext.Provider value={value}>
      {children}
    </InsightsViewContext.Provider>
  );
}
