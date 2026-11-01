import { useTranslation } from "react-i18next";
import { statusColor } from "@/components/requirement/status-style";
import type { DashboardReport } from "@/fetchers/reporting/get-report";
import { ReportPanel } from "./report-panel";
export function CategoryChart({
  report,
  onCategory,
}: {
  report: DashboardReport;
  onCategory: (category: string) => void;
}) {
  const { t } = useTranslation();
  const groups = Object.entries(report.categories);
  const maximum = Math.max(
    1,
    ...groups.map(([, counts]) =>
      Object.values(counts).reduce((sum, value) => sum + value, 0),
    ),
  );
  return (
    <ReportPanel
      title={t("reporting:categories")}
      subtitle={t("reporting:categoryHint")}
    >
      <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {report.states.map((state) => (
          <span key={state.slug} className="flex items-center gap-1">
            <span
              className="size-2 rounded-sm"
              style={{ backgroundColor: statusColor(state.slug) }}
            />
            {state.name}
          </span>
        ))}
      </div>
      <div className="space-y-4">
        {groups.map(([category, counts]) => (
          <button
            type="button"
            key={category}
            className="flex w-full items-center gap-3 text-xs"
            onClick={() => onCategory(category)}
          >
            <span className="w-32 truncate text-left">
              {category === "__unset__"
                ? t("reporting:uncategorized")
                : category}
            </span>
            <span className="flex h-6 flex-1">
              {Object.entries(counts).map(([status, count]) => (
                <span
                  key={status}
                  title={`${status}: ${count}`}
                  style={{
                    backgroundColor: statusColor(status),
                    width: `${(count / maximum) * 100}%`,
                  }}
                  className="block h-full border-r border-white/40"
                />
              ))}
            </span>
            <span>
              {Object.values(counts).reduce((sum, value) => sum + value, 0)}
            </span>
          </button>
        ))}
      </div>
      {!groups.length && (
        <p className="py-8 text-center text-xs text-muted-foreground">
          {t("reporting:empty")}
        </p>
      )}
    </ReportPanel>
  );
}
