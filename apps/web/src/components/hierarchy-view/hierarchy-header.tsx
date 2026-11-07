import { ColumnResizeHandle } from "./column-resize-handle";
import { useIsRequirement } from "@/components/project/project-kind-context";
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
  const isRequirement = useIsRequirement();

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex h-9 items-stretch border-border/60 border-b bg-background font-medium text-muted-foreground text-xs",
        HIERARCHY_ROW_MIN_WIDTH_CLASS,
      )}
    >
      <span className="relative flex min-w-0 flex-1 items-center pl-9">
        <ColumnResizeHandle
          id="title"
          defaultWidth={320}
          label={t("tasks:hierarchy.columns.task")}
        />
        {t("tasks:hierarchy.columns.task")}
      </span>
      {HIERARCHY_COLUMNS.filter(
        (column) => !isRequirement || column.id !== "subtasks",
      ).map((column) => (
        <span
          key={column.id}
          className={cn(
            HIERARCHY_CELL_CLASS,
            "relative",
            isRequirement && column.id === "progress"
              ? "w-[11rem]"
              : column.widthClass,
          )}
        >
          <ColumnResizeHandle
            id={column.id}
            defaultWidth={column.width}
            label={t(`tasks:hierarchy.columns.${column.id}`)}
          />
          {isRequirement && column.id === "progress"
            ? t("tasks:requirement.nodeTimes")
            : t(`tasks:hierarchy.columns.${column.id}`)}
        </span>
      ))}
    </div>
  );
}
