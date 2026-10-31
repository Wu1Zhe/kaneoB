import { useTranslation } from "react-i18next";
import { cn } from "@/lib/cn";
import {
  HIERARCHY_CELL_CLASS,
  HIERARCHY_COLUMNS,
  HIERARCHY_ROW_MIN_WIDTH_CLASS,
} from "./hierarchy-columns";

/** Column headings shared by every row; sticky while the hierarchy scrolls. */
export function HierarchyHeader() {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex h-9 items-stretch border-border/60 border-b bg-background font-medium text-muted-foreground text-xs",
        HIERARCHY_ROW_MIN_WIDTH_CLASS,
      )}
    >
      <span className="flex min-w-0 flex-1 items-center pl-9">
        {t("tasks:hierarchy.columns.task")}
      </span>
      {HIERARCHY_COLUMNS.map((column) => (
        <span
          key={column.id}
          className={cn(HIERARCHY_CELL_CLASS, column.widthClass)}
        >
          {t(`tasks:hierarchy.columns.${column.id}`)}
        </span>
      ))}
    </div>
  );
}
