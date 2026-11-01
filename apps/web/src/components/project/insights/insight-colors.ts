import type { InsightColumn } from "./insights-data";

// Validated categorical slots (see apps/web/src/index.css). Identity follows the
// status slug, so filtering the board never repaints the remaining statuses.
const preferredSlots: Record<string, number> = {
  "to-do": 1,
  todo: 1,
  backlog: 1,
  "in-progress": 2,
  in_progress: 2,
  doing: 2,
  done: 3,
  completed: 3,
  pending: 4,
  "in-review": 5,
  review: 5,
};

const MAX_SLOT = 8;

export const TREND_COLORS = {
  created: "var(--viz-1)",
  completed: "var(--viz-3)",
} as const;

export function buildStatusColorMap(
  columns: InsightColumn[],
): Record<string, string> {
  const used = new Set<number>();
  const colors: Record<string, string> = {};

  for (const column of columns) {
    const preferred = preferredSlots[column.slug];
    if (preferred && !used.has(preferred)) {
      used.add(preferred);
      colors[column.slug] = `var(--viz-${preferred})`;
    }
  }

  for (const column of columns) {
    if (colors[column.slug]) continue;
    const slot = Array.from({ length: MAX_SLOT }, (_, index) => index + 1).find(
      (candidate) => !used.has(candidate),
    );
    if (slot) used.add(slot);
    colors[column.slug] = slot ? `var(--viz-${slot})` : "var(--viz-other)";
  }

  return colors;
}
