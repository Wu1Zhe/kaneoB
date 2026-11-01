import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import type { TrendPoint } from "./insights-data";
import { TREND_COLORS } from "./insight-colors";

const WIDTH = 300;
const HEIGHT = 112;
const PADDING = { top: 10, right: 10, bottom: 18, left: 24 };

function niceMax(value: number) {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  const normalized = value / power;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * power;
}

export function TrendChart({
  points,
  days,
}: {
  points: TrendPoint[];
  days: number;
}) {
  const { t } = useTranslation();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { max, innerWidth, innerHeight, x, y, tickIndexes } = useMemo(() => {
    const maxValue = niceMax(
      Math.max(
        1,
        ...points.flatMap((point) => [point.created, point.completed]),
      ),
    );
    const width = WIDTH - PADDING.left - PADDING.right;
    const height = HEIGHT - PADDING.top - PADDING.bottom;
    const step = points.length > 1 ? width / (points.length - 1) : 0;
    const every = days <= 7 ? 1 : Math.ceil(days / 6);

    return {
      max: maxValue,
      innerWidth: width,
      innerHeight: height,
      x: (index: number) => PADDING.left + index * step,
      y: (value: number) => PADDING.top + height - (value / maxValue) * height,
      tickIndexes: points
        .map((_, index) => index)
        .filter(
          (index) =>
            index === 0 || index === points.length - 1 || index % every === 0,
        ),
    };
  }, [points, days]);

  const paths = useMemo(
    () => ({
      created: points
        .map(
          (point, index) =>
            `${index === 0 ? "M" : "L"}${x(index)},${y(point.created)}`,
        )
        .join(" "),
      completed: points
        .map(
          (point, index) =>
            `${index === 0 ? "M" : "L"}${x(index)},${y(point.completed)}`,
        )
        .join(" "),
    }),
    [points, x, y],
  );

  const hovered = hoverIndex === null ? null : points[hoverIndex];

  const handleMove = (event: React.MouseEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const plotX =
      ((event.clientX - rect.left) / rect.width) * innerWidth + PADDING.left;
    const ratio = innerWidth === 0 ? 0 : (plotX - PADDING.left) / innerWidth;
    const index = Math.round(ratio * (points.length - 1));
    setHoverIndex(Math.min(points.length - 1, Math.max(0, index)));
  };

  return (
    <div className="relative min-w-0">
      <div className="mb-1 flex items-center justify-end gap-3">
        <LegendSwatch
          color={TREND_COLORS.created}
          label={t("tasks:insights.created")}
        />
        <LegendSwatch
          color={TREND_COLORS.completed}
          label={t("tasks:insights.completed")}
        />
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={t("tasks:insights.trendTitle")}
      >
        {[0, 0.5, 1].map((ratio) => {
          const value = max * ratio;
          const lineY = y(value);
          return (
            <g key={ratio}>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={lineY}
                y2={lineY}
                stroke="var(--viz-grid)"
                strokeWidth="1"
              />
              <text
                x={PADDING.left - 4}
                y={lineY}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-muted-foreground text-[7px] tabular-nums"
              >
                {Math.round(value)}
              </text>
            </g>
          );
        })}

        {hoverIndex !== null && (
          <line
            x1={x(hoverIndex)}
            x2={x(hoverIndex)}
            y1={PADDING.top}
            y2={PADDING.top + innerHeight}
            stroke="var(--viz-grid-strong)"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        )}

        <path
          d={paths.created}
          fill="none"
          stroke={TREND_COLORS.created}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={paths.completed}
          fill="none"
          stroke={TREND_COLORS.completed}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hovered && hoverIndex !== null && (
          <>
            <circle
              cx={x(hoverIndex)}
              cy={y(hovered.created)}
              r="3"
              fill={TREND_COLORS.created}
              stroke="var(--viz-surface)"
              strokeWidth="2"
            />
            <circle
              cx={x(hoverIndex)}
              cy={y(hovered.completed)}
              r="3"
              fill={TREND_COLORS.completed}
              stroke="var(--viz-surface)"
              strokeWidth="2"
            />
          </>
        )}

        {tickIndexes.map((index) => (
          <text
            key={points[index].label + index}
            x={x(index)}
            y={HEIGHT - 4}
            textAnchor={
              index === 0
                ? "start"
                : index === points.length - 1
                  ? "end"
                  : "middle"
            }
            className="fill-muted-foreground text-[7px] tabular-nums"
          >
            {points[index].label}
          </text>
        ))}

        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={Math.max(0, innerWidth)}
          height={innerHeight}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hovered && hoverIndex !== null && (
        <div
          className={cn(
            "pointer-events-none absolute top-4 z-10 rounded-md border bg-popover px-2 py-1 text-[10px] shadow-sm",
            hoverIndex > points.length / 2 ? "-translate-x-full" : "",
          )}
          style={{ left: `${(x(hoverIndex) / WIDTH) * 100}%` }}
        >
          <div className="mb-0.5 font-medium">{hovered.label}</div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: TREND_COLORS.created }}
            />
            {t("tasks:insights.created")}
            <span className="ml-auto pl-2 font-medium text-foreground tabular-nums">
              {hovered.created}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: TREND_COLORS.completed }}
            />
            {t("tasks:insights.completed")}
            <span className="ml-auto pl-2 font-medium text-foreground tabular-nums">
              {hovered.completed}
            </span>
          </div>
        </div>
      )}

      <table className="sr-only">
        <caption>{t("tasks:insights.trendTitle")}</caption>
        <thead>
          <tr>
            <th>{t("tasks:insights.date")}</th>
            <th>{t("tasks:insights.created")}</th>
            <th>{t("tasks:insights.completed")}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <td>{point.label}</td>
              <td>{point.created}</td>
              <td>{point.completed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <span
        aria-hidden="true"
        className="h-0.5 w-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
