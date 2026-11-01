import { useTranslation } from "react-i18next";
import type { DashboardReport } from "@/fetchers/reporting/get-report";
import { shanghaiDay } from "./report-dates";
import { ReportPanel } from "./report-panel";

const SERIES = {
  created: "#197858",
  pirun: "#ec9134",
  prod: "#3879d4",
  overdue: "#db4950",
  launched: "#197858",
  unlaunched: "#db4950",
};
type Series = keyof typeof SERIES;
export function WeeklyChart({
  report,
  title,
  series,
  onWeek,
}: {
  report: DashboardReport;
  title: string;
  series: Series[];
  onWeek: (index: number) => void;
}) {
  const { t } = useTranslation();
  const maximum =
    Math.ceil(
      Math.max(
        4,
        ...report.weekly.flatMap((week) => series.map((key) => week[key] ?? 0)),
      ) / 4,
    ) * 4;
  const x = (index: number) => 46 + index * 55;
  const y = (value: number) => 216 - (value / maximum) * 180;
  return (
    <ReportPanel title={title} subtitle={t("reporting:weeklyHint")}>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {series.map((key) => (
          <span key={key} className="flex items-center gap-1">
            <span
              className="h-0.5 w-4"
              style={{ backgroundColor: SERIES[key] }}
            />
            {t(`reporting:series.${key}`)}
          </span>
        ))}
      </div>
      <svg
        data-report-chart
        viewBox="0 0 700 255"
        role="img"
        aria-label={title}
        className="w-full overflow-visible"
      >
        {[0, 1, 2, 3, 4].map((line) => (
          <g key={line}>
            <line
              x1="40"
              x2="670"
              y1={y((maximum * line) / 4)}
              y2={y((maximum * line) / 4)}
              stroke="currentColor"
              opacity="0.12"
            />
            <text
              x="32"
              y={y((maximum * line) / 4) + 4}
              textAnchor="end"
              fontSize="10"
              fill="currentColor"
              opacity="0.6"
            >
              {Math.round((maximum * line) / 4)}
            </text>
          </g>
        ))}
        {series.map((key) => {
          const segments: string[] = [];
          let segment = "";
          report.weekly.forEach((week, index) => {
            const value = week[key];
            if (value === null) {
              if (segment) segments.push(segment);
              segment = "";
            } else segment += `${segment ? " L" : "M"}${x(index)},${y(value)}`;
          });
          if (segment) segments.push(segment);
          return (
            <g key={key}>
              {segments.map((path) => (
                <path
                  key={path}
                  d={path}
                  fill="none"
                  stroke={SERIES[key]}
                  strokeWidth="2"
                />
              ))}
              {report.weekly.map((week, index) =>
                week[key] === null ? null : (
                  <g key={week.start}>
                    <circle
                      cx={x(index)}
                      cy={y(week[key]!)}
                      r="4"
                      fill={SERIES[key]}
                      stroke="white"
                    >
                      <title>{`${shanghaiDay(new Date(week.start).getTime())} · ${t(`reporting:series.${key}`)}: ${week[key]}${week.partial ? ` · ${t("reporting:partial")}` : ""}`}</title>
                    </circle>
                  </g>
                ),
              )}
            </g>
          );
        })}
        {report.weekly.map((week, index) => (
          <g key={week.start}>
            <text
              x={x(index)}
              y="241"
              textAnchor="middle"
              fill="currentColor"
              fontSize="10"
              opacity="0.6"
            >
              {new Date(new Date(week.start).getTime() + 8 * 3600000)
                .toISOString()
                .slice(5, 10)}
            </text>
            <rect
              x={x(index) - 22}
              y="25"
              width="44"
              height="218"
              fill="transparent"
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={t("reporting:weekDetails", {
                date: shanghaiDay(new Date(week.start).getTime()),
              })}
              onClick={() => onWeek(index)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onWeek(index);
              }}
            >
              <title>
                {week.available
                  ? `${week.partial ? t("reporting:partial") : ""} ${shanghaiDay(new Date(week.start).getTime())}`
                  : t("reporting:noHistory")}
              </title>
            </rect>
          </g>
        ))}
      </svg>
    </ReportPanel>
  );
}
