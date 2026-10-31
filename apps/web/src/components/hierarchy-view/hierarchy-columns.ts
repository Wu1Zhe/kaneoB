/**
 * Column widths live here so the header and every row stay aligned even when
 * one side changes. The title column takes the remaining space.
 */
export const HIERARCHY_COLUMNS = [
  { id: "creator", widthClass: "w-[9rem]" },
  { id: "assignee", widthClass: "w-[10rem]" },
  { id: "priority", widthClass: "w-[7rem]" },
  { id: "status", widthClass: "w-[9rem]" },
  { id: "progress", widthClass: "w-[9rem]" },
  { id: "dueDate", widthClass: "w-[11rem]" },
  { id: "subtasks", widthClass: "w-[6rem]" },
] as const;

export type HierarchyColumnId = (typeof HIERARCHY_COLUMNS)[number]["id"];

export const HIERARCHY_CELL_CLASS =
  "flex min-w-0 shrink-0 items-center gap-1.5 px-2";

/**
 * The fixed columns add up to 61rem; this leaves the title a readable minimum
 * and lets the surrounding container scroll on narrow windows.
 */
export const HIERARCHY_ROW_MIN_WIDTH_CLASS = "min-w-[76rem]";
