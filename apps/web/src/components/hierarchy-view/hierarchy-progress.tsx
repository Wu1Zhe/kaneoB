import { useTranslation } from "react-i18next";

type HierarchyProgressProps = {
  /** Percentage, already rolled up for parent tasks. */
  value: number;
};

/**
 * A progress bar whose percentage sits in the middle of the bar. The label is
 * painted twice: once in the normal foreground over the track, and once in the
 * on-primary color clipped to the filled width, so it stays legible whichever
 * side of the fill edge it falls on.
 */
export function HierarchyProgress({ value }: HierarchyProgressProps) {
  const { t } = useTranslation();
  const percent = Math.round(Math.min(100, Math.max(0, value)));

  return (
    <div
      role="img"
      aria-label={`${t("tasks:properties.progress")}: ${percent}%`}
      className="relative h-4.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-primary"
        style={{ width: `${percent}%` }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground tabular-nums"
      >
        {percent}%
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-primary-foreground tabular-nums"
        style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
      >
        {percent}%
      </span>
    </div>
  );
}
