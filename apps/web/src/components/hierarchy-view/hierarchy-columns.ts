/**
 * Column widths live here so the header and every row stay aligned even when
 * one side changes. Widths track what each cell actually renders (avatar,
 * icon + label) instead of reserving a fixed table-like span, and the title
 * column takes all remaining space so the extra room stays with the task name.
 */
export const HIERARCHY_COLUMNS = [
  {
    id: "creator",
    width: 112,
    widthClass: "w-[var(--task-column-creator,112px)]",
  },
  {
    id: "assignee",
    width: 120,
    widthClass: "w-[var(--task-column-assignee,120px)]",
  },
  {
    id: "priority",
    width: 88,
    widthClass: "w-[var(--task-column-priority,88px)]",
  },
  {
    id: "status",
    width: 120,
    widthClass: "w-[var(--task-column-status,120px)]",
  },
  {
    id: "progress",
    width: 112,
    widthClass: "w-[var(--task-column-progress,112px)]",
  },
  {
    id: "dueDate",
    width: 152,
    widthClass: "w-[var(--task-column-dueDate,152px)]",
  },
  {
    id: "subtasks",
    width: 80,
    widthClass: "w-[var(--task-column-subtasks,80px)]",
  },
] as const;

export type HierarchyColumnId = (typeof HIERARCHY_COLUMNS)[number]["id"];

export const HIERARCHY_CELL_CLASS =
  "flex min-w-0 shrink-0 items-center gap-1.5 px-2";

/**
 * The fixed columns add up to ~45.5rem on small screens and ~49rem from `lg`
 * up; this keeps the title readable while letting the surrounding container
 * scroll once the window gets narrower than that.
 */
export const HIERARCHY_ROW_MIN_WIDTH_CLASS =
  "min-w-[calc(var(--task-column-title,320px)+var(--task-column-creator,112px)+var(--task-column-assignee,120px)+var(--task-column-priority,88px)+var(--task-column-status,120px)+var(--task-column-progress,112px)+var(--task-column-dueDate,152px)+var(--task-column-subtasks,80px))]";
