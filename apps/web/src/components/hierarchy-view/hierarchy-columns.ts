/**
 * Column widths live here so the header and every row stay aligned even when
 * one side changes. Widths track what each cell actually renders (avatar,
 * icon + label) instead of reserving a fixed table-like span, and the title
 * column takes all remaining space so the extra room stays with the task name.
 */
export const HIERARCHY_COLUMNS = [
  { id: "creator", widthClass: "w-[6.5rem] lg:w-[7rem]" },
  { id: "assignee", widthClass: "w-[6.75rem] lg:w-[7.5rem]" },
  { id: "priority", widthClass: "w-[5.25rem] lg:w-[5.5rem]" },
  { id: "status", widthClass: "w-[7rem] lg:w-[7.5rem]" },
  { id: "progress", widthClass: "w-[6.5rem] lg:w-[7rem]" },
  { id: "dueDate", widthClass: "w-[9rem] lg:w-[9.5rem]" },
  { id: "subtasks", widthClass: "w-[4.5rem] lg:w-[5rem]" },
] as const;

export type HierarchyColumnId = (typeof HIERARCHY_COLUMNS)[number]["id"];

export const HIERARCHY_CELL_CLASS =
  "flex min-w-0 shrink-0 items-center gap-1.5 px-2";

/**
 * The fixed columns add up to ~45.5rem on small screens and ~49rem from `lg`
 * up; this keeps the title readable while letting the surrounding container
 * scroll once the window gets narrower than that.
 */
export const HIERARCHY_ROW_MIN_WIDTH_CLASS = "min-w-[60rem]";
