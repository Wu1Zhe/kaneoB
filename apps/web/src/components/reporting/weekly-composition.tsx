import { useTranslation } from "react-i18next";
import type { DashboardReport } from "@/fetchers/reporting/get-report";
import { ReportPanel } from "./report-panel";
const COLORS = [
  "#ec9134",
  "#3879d4",
  "#d6ad35",
  "#ac6da9",
  "#4e9f72",
  "#7b7bd7",
  "#45a9b1",
  "#a67f4d",
];
export function WeeklyComposition({
  report,
  onBar,
}: {
  report: DashboardReport;
  onBar: (week: number, type: string, category?: string) => void;
}) {
  const { t } = useTranslation();
  const types = [
    ...new Set(report.weekly.flatMap((week) => Object.keys(week.composition))),
  ];
  const categories = [
    ...new Set(
      report.weekly.flatMap((week) =>
        Object.values(week.composition).flatMap((counts) =>
          Object.keys(counts),
        ),
      ),
    ),
  ];
  const maximum =
    Math.ceil(
      Math.max(
        4,
        ...report.weekly.flatMap((week) =>
          Object.values(week.composition).map((counts) =>
            Object.values(counts).reduce((sum, value) => sum + value, 0),
          ),
        ),
      ) / 4,
    ) * 4;
  const lineMax =
    Math.ceil(
      Math.max(
        4,
        ...report.weekly.flatMap((week) => [
          week.launched ?? 0,
          week.unlaunched ?? 0,
        ]),
      ) / 4,
    ) * 4;
  const groupWidth = 76;
  const chartWidth = 1000;
  return (
    <ReportPanel
      title={t("reporting:composition")}
      subtitle={t("reporting:compositionHint")}
      className="col-span-full"
    >
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {categories.map((category, index) => (
          <span key={category} className="flex items-center gap-1">
            <span
              className="size-2 rounded-sm"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            {category === "__unset__" ? t("reporting:uncategorized") : category}
          </span>
        ))}
        <span className="text-red-500">
          — {t("reporting:series.unlaunched")}
        </span>
        <span className="text-emerald-700">
          — {t("reporting:series.launched")}
        </span>
      </div>
      <div className="overflow-auto">
        <svg
          data-report-chart
          viewBox={`0 0 ${chartWidth} 280`}
          role="img"
          aria-label={t("reporting:composition")}
          className="min-w-[700px] w-full"
        >
          {[0, 1, 2, 3, 4].map((level) => (
            <g key={level}>
              <line
                x1="35"
                x2="960"
                y1={230 - (190 * level) / 4}
                y2={230 - (190 * level) / 4}
                stroke="currentColor"
                opacity="0.12"
              />
              <text
                x="28"
                y={234 - (190 * level) / 4}
                textAnchor="end"
                fill="currentColor"
                fontSize="10"
              >
                {Math.round((maximum * level) / 4)}
              </text>
              <text
                x="967"
                y={234 - (190 * level) / 4}
                fill="currentColor"
                fontSize="10"
              >
                {Math.round((lineMax * level) / 4)}
              </text>
            </g>
          ))}
          {report.weekly.map((week, weekIndex) => (
            <g key={week.start}>
              {types.map((type, typeIndex) => {
                let offset = 0;
                const barWidth = Math.min(14, 55 / Math.max(1, types.length));
                return (
                  <g key={type}>
                    {categories.map((category, categoryIndex) => {
                      const count = week.composition[type]?.[category] ?? 0;
                      const height = (count / maximum) * 190;
                      const y = 230 - offset - height;
                      offset += height;
                      return count ? (
                        <rect
                          key={category}
                          x={
                            40 +
                            weekIndex * groupWidth +
                            typeIndex * (barWidth + 2)
                          }
                          y={y}
                          width={barWidth}
                          height={height}
                          fill={COLORS[categoryIndex % COLORS.length]}
                          stroke="white"
                          strokeWidth="0.5"
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer"
                          aria-label={`${type} · ${category} · ${count}`}
                          onClick={() => onBar(weekIndex, type, category)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter")
                              onBar(weekIndex, type, category);
                          }}
                        >
                          <title>{`${type} · ${category}: ${count}`}</title>
                        </rect>
                      ) : null;
                    })}
                  </g>
                );
              })}
              <text
                x={55 + weekIndex * groupWidth}
                y="253"
                textAnchor="middle"
                fill="currentColor"
                fontSize="10"
                opacity="0.7"
              >
                {new Date(new Date(week.start).getTime() + 8 * 3600000)
                  .toISOString()
                  .slice(5, 10)}
              </text>
            </g>
          ))}
          {(
            [
              ["launched", "#197858"],
              ["unlaunched", "#db4950"],
            ] as const
          ).map(([key, color]) => {
            let path = "";
            return (
              <g key={key}>
                {report.weekly.map((week, index) => {
                  const value = week[key];
                  if (value === null) {
                    path = "";
                    return null;
                  }
                  const point = `${55 + index * groupWidth},${230 - (value / lineMax) * 190}`;
                  const previous = path;
                  path = point;
                  return (
                    <g key={week.start}>
                      {previous && (
                        <path
                          d={`M${previous} L${point}`}
                          fill="none"
                          stroke={color}
                          strokeWidth="2"
                        />
                      )}
                      <circle
                        cx={55 + index * groupWidth}
                        cy={230 - (value / lineMax) * 190}
                        r="3"
                        fill={color}
                      >
                        <title>{`${t(`reporting:series.${key}`)}: ${value}`}</title>
                      </circle>
                    </g>
                  );
                })}
              </g>
            );
          })}
          <text x="40" y="275" fill="currentColor" opacity="0.6" fontSize="10">
            {types
              .map(
                (type, index) =>
                  `${index + 1}: ${type === "__unset__" ? t("reporting:unsetType") : type}`,
              )
              .join("   ")}
          </text>
        </svg>
      </div>
    </ReportPanel>
  );
}
