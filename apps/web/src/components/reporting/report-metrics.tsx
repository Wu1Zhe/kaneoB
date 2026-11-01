import { useTranslation } from "react-i18next";
import type { DashboardReport } from "@/fetchers/reporting/get-report";
export function ReportMetrics({
  report,
  selected,
  onSelect,
}: {
  report: DashboardReport;
  selected: string;
  onSelect: (value: string) => void;
}) {
  const { t } = useTranslation();
  const requirement = report.project.kind === "requirement";
  const metrics = requirement
    ? ([
        [
          "all",
          "total",
          report.counts.total,
          report.startCounts
            ? report.counts.total - report.startCounts.total
            : null,
        ],
        [
          "launched",
          "launched",
          report.counts.launched,
          report.startCounts
            ? report.counts.launched - report.startCounts.launched
            : null,
        ],
        [
          "overdue",
          "overdue",
          report.counts.overdue,
          report.startCounts
            ? report.counts.overdue - report.startCounts.overdue
            : null,
        ],
      ] as const)
    : ([
        ["all", "taskTotal", report.tasks.length, null],
        [
          "active",
          "active",
          report.tasks.filter((task) =>
            ["in-progress", "in-review", "pending-acceptance"].includes(
              task.status,
            ),
          ).length,
          null,
        ],
        [
          "acceptance",
          "acceptance",
          report.tasks.filter((task) => task.status === "pending-acceptance")
            .length,
          null,
        ],
        ["overdue", "overdue", report.counts.overdue, null],
      ] as const);
  return (
    <div
      className={`grid gap-3 sm:grid-cols-2 ${requirement ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}
    >
      {metrics.map(([id, label, value, delta]) => (
        <button
          type="button"
          key={id}
          onClick={() => onSelect(id)}
          aria-pressed={selected === id}
          className={`rounded-xl border bg-card p-4 text-left outline-none transition hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring ${selected === id ? "border-primary" : "border-border/65"}`}
        >
          <p className="text-xs text-muted-foreground">
            {t(`reporting:${label}`)}
          </p>
          <p
            className={`mt-1 text-3xl font-semibold tabular-nums ${id === "overdue" ? "text-destructive-foreground" : ""}`}
          >
            {value}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {requirement
              ? delta === null
                ? t("reporting:noBaseline")
                : t("reporting:delta", {
                    value: `${delta > 0 ? "+" : ""}${delta}`,
                  })
              : t(`reporting:hint.${id}`)}
          </p>
        </button>
      ))}
    </div>
  );
}
