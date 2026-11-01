import type { TFunction } from "i18next";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Compact "2d 3h" style duration for overdue warnings. Only the two units that
 * matter at that scale are shown.
 */
export function formatInsightDuration(ms: number, t: TFunction) {
  const totalMinutes = Math.max(1, Math.floor(ms / MINUTE));
  if (totalMinutes < 60) {
    return t("tasks:insights.durationMinutes", { count: totalMinutes });
  }

  const totalHours = Math.floor(ms / HOUR);
  if (totalHours < 24) {
    return t("tasks:insights.durationHours", { count: totalHours });
  }

  const days = Math.floor(ms / DAY);
  if (days < 14) {
    const hours = Math.floor((ms % DAY) / HOUR);
    return hours > 0
      ? t("tasks:insights.durationDaysHours", { days, hours })
      : t("tasks:insights.durationDays", { count: days });
  }

  return t("tasks:insights.durationWeeks", {
    count: Math.floor(days / 7),
  });
}
