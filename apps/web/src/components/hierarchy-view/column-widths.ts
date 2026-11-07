export type Widths = Record<string, number>;
export const EMPTY_WIDTHS: Widths = {};
export function normalizeColumnWidths(raw: unknown): Widths {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter(
      ([key, value]) =>
        [
          "title",
          "creator",
          "assignee",
          "priority",
          "status",
          "progress",
          "dueDate",
          "subtasks",
        ].includes(key) &&
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 60 &&
        value <= 900,
    ),
  );
}
