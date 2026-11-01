import { useTranslation } from "react-i18next";

type DonutSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

const SIZE = 88;
const STROKE = 13;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 2;

export function StatusDonut({
  slices,
  total,
}: {
  slices: DonutSlice[];
  total: number;
}) {
  const { t } = useTranslation();
  let offset = 0;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="size-22 shrink-0"
        role="img"
        aria-label={t("tasks:insights.statusDistribution")}
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--viz-track)"
          strokeWidth={STROKE}
        />
        {total > 0 &&
          slices.map((slice) => {
            if (slice.value === 0) return null;
            const length = (slice.value / total) * CIRCUMFERENCE;
            const dash = Math.max(0, length - GAP);
            const element = (
              <circle
                key={slice.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            );
            offset += length;
            return element;
          })}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground font-semibold text-lg tabular-nums"
        >
          {total}
        </text>
      </svg>
      <ul className="flex min-w-0 flex-1 flex-col gap-0.5">
        {slices.map((slice) => (
          <li
            key={slice.key}
            className="flex min-w-0 items-center gap-1.5 text-xs"
          >
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: slice.color }}
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {slice.label}
            </span>
            <span className="shrink-0 font-medium tabular-nums">
              {slice.value}
            </span>
            <span className="w-8 shrink-0 text-right text-muted-foreground tabular-nums">
              {total === 0
                ? "0%"
                : `${Math.round((slice.value / total) * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
