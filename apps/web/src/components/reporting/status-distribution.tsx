import { useTranslation } from "react-i18next";
import {
  statusColor,
  statusStyle,
} from "@/components/requirement/status-style";
import type { DashboardReport } from "@/fetchers/reporting/get-report";
import { ReportPanel } from "./report-panel";
export function StatusDistribution({
  report,
  flow = false,
  onSelect,
}: {
  report: DashboardReport;
  flow?: boolean;
  onSelect: (slug: string) => void;
}) {
  const { t } = useTranslation();
  const maximum = Math.max(1, ...report.states.map((state) => state.count));
  if (flow)
    return (
      <ReportPanel
        title={t("reporting:flow")}
        subtitle={t("reporting:flowHint")}
      >
        <div className="overflow-auto">
          <table className="w-full min-w-[30rem] text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                {[
                  "status",
                  "current",
                  "inflow",
                  "outflow",
                  "dwell",
                  "bottleneck",
                ].map((key) => (
                  <th key={key} className="p-2 text-left font-medium">
                    {t(`reporting:${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.states.map((state) => (
                <tr key={state.slug} className="border-b border-border/40">
                  <td className="py-2">
                    <button
                      type="button"
                      className="rounded-full px-2 py-1"
                      style={statusStyle(state.slug)}
                      onClick={() => onSelect(state.slug)}
                    >
                      {state.name}
                    </button>
                  </td>
                  <td>{state.count}</td>
                  <td>+{state.inflow}</td>
                  <td>−{state.outflow}</td>
                  <td>
                    {state.averageDays === null
                      ? "—"
                      : t("reporting:days", {
                          days: state.averageDays.toFixed(1),
                        })}
                  </td>
                  <td>
                    {state.stalled ? (
                      <span className="text-warning-foreground">
                        {state.stalled}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportPanel>
    );
  return (
    <ReportPanel title={t("reporting:statusDistribution")}>
      <div className="space-y-3 py-2">
        {report.states.map((state) => (
          <button
            key={state.slug}
            type="button"
            onClick={() => onSelect(state.slug)}
            className="flex w-full items-center gap-3 text-xs"
          >
            <span className="w-24 shrink-0 text-right">{state.name}</span>
            <span className="h-4 flex-1 rounded bg-muted/50">
              <span
                style={{
                  width: `${(state.count / maximum) * 100}%`,
                  backgroundColor: statusColor(state.slug),
                }}
                className="block h-full min-w-0 rounded"
              />
            </span>
            <span className="w-8 text-left tabular-nums">{state.count}</span>
          </button>
        ))}
      </div>
    </ReportPanel>
  );
}
