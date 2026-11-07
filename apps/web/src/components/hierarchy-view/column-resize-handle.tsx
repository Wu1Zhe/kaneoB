import { useContext, useRef } from "react";
import { useTranslation } from "react-i18next";
import { TaskTableContext } from "./task-table-context";
export function ColumnResizeHandle({
  id,
  defaultWidth,
  label,
}: {
  id: string;
  defaultWidth: number;
  label?: string;
}) {
  const { t } = useTranslation();
  const context = useContext(TaskTableContext);
  const drag = useRef<{ x: number; width: number; next: number } | null>(null);
  if (!context) return null;
  return (
    <button
      type="button"
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={60}
      aria-valuemax={900}
      aria-valuenow={context.widths[id] ?? defaultWidth}
      aria-label={
        label
          ? `${label} · ${t("tasks:table.resize")}`
          : t("tasks:table.resize")
      }
      title={t("tasks:table.resizeHint")}
      className="absolute inset-y-0 right-0 z-20 w-2 cursor-col-resize touch-none border-r border-transparent hover:border-primary focus-visible:border-primary"
      onDoubleClick={() => context.resize(id, defaultWidth, true)}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const width =
          e.currentTarget.parentElement?.getBoundingClientRect().width ??
          defaultWidth;
        drag.current = { x: e.clientX, width, next: width };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const next = drag.current.width + e.clientX - drag.current.x;
        drag.current.next = next;
        context.resize(id, next, false);
      }}
      onPointerUp={(e) => {
        if (!drag.current) return;
        context.resize(id, drag.current.next, true);
        drag.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        if (drag.current) context.resize(id, drag.current.width, true);
        drag.current = null;
      }}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const width =
          e.currentTarget.parentElement?.getBoundingClientRect().width ??
          defaultWidth;
        context.resize(
          id,
          width + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 50 : 10),
          true,
        );
      }}
    />
  );
}
