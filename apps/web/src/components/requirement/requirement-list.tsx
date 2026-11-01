import { useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";
import { formatDateTime, formatDateTimeShort } from "@/lib/format";
import { useSessionState } from "@/hooks/use-session-state";
import { taskDeadlines } from "./requirement-deadlines";
import { statusStyle } from "./status-style";

const columns = [
  ["sequence", 72],
  ["reference", 192],
  ["title", 240],
  ["description", 256],
  ["type", 128],
  ["category", 176],
  ["workflow", 128],
  ["assignee", 128],
  ["creator", 128],
  ["dueDate", 160],
  ["pirun", 160],
  ["overdueDays", 96],
  ["risk", 128],
  ["createdAt", 160],
  ["updater", 128],
  ["updatedAt", 160],
] as const;
type Column = (typeof columns)[number][0];
const clean = (text?: string | null) =>
  text
    ?.replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "";
function riskOf(task: Task, now: number) {
  if (task.requirementData?.prodActualAt) return { value: "launched", days: 0 };
  if (["closed", "rejected"].includes(task.status))
    return { value: task.status, days: 0 };
  const times = taskDeadlines(task)
    .map(({ date }) => new Date(date).getTime())
    .filter(Number.isFinite);
  const earliest = times.length ? Math.min(...times) : Number.POSITIVE_INFINITY;
  return {
    value:
      earliest < now
        ? "overdue"
        : earliest - now <= 86400000
          ? "soon"
          : "normal",
    days: Math.max(0, Math.ceil((now - earliest) / 86400000)),
  };
}
export function RequirementList({
  project,
  onOpenTask,
  scope = "active",
}: {
  project: ProjectWithTasks;
  onOpenTask?: (id: string) => void;
  scope?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const storageKey = `kaneo:requirement-table:${project.id}:${scope}`;
  const [sort, setSort] = useSessionState<{
    column: Column;
    descending: boolean;
  }>(`${storageKey}:sort`, { column: "sequence", descending: false });
  const container = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(`${storageKey}:scroll`) ?? "null",
      );
      if (saved && container.current) {
        container.current.scrollTop = saved.top;
        container.current.scrollLeft = saved.left;
      }
    } catch {
      /* Storage is optional. */
    }
  }, [storageKey]);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const valueOf = (task: Task, column: Column): string | number => {
    const metadata = task.requirementData;
    switch (column) {
      case "sequence":
        return task.number ?? 0;
      case "reference":
        return metadata?.reference || `${project.slug}-${task.number}`;
      case "title":
        return task.title;
      case "description":
        return clean(task.description);
      case "type":
        return metadata?.type || "";
      case "category":
        return metadata?.category || "";
      case "workflow":
        return (
          project.columns.find(
            (item) => item.slug === task.status || item.id === task.status,
          )?.name || task.status
        );
      case "assignee":
        return task.assigneeName || "";
      case "creator":
        return task.creatorName || "";
      case "dueDate":
        return task.dueDate || "";
      case "pirun":
        return metadata?.pirunPlannedAt || "";
      case "overdueDays":
        return riskOf(task, now).days;
      case "risk":
        return t(`reporting:risk.${riskOf(task, now).value}`);
      case "createdAt":
        return task.createdAt;
      case "updater":
        return task.updaterName || "";
      case "updatedAt":
        return task.updatedAt || "";
    }
  };
  const tasks = useMemo(
    () => [
      ...new Map(
        project.columns
          .flatMap((column) => column.tasks)
          .map((task) => [task.id, task]),
      ).values(),
    ],
    [project.columns],
  );
  const sorted = [...tasks].sort((a, b) => {
    const left = valueOf(a, sort.column);
    const right = valueOf(b, sort.column);
    const order =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), undefined, {
            numeric: true,
          });
    return (sort.descending ? -order : order) || a.id.localeCompare(b.id);
  });
  const open = (id: string) =>
    onOpenTask
      ? onOpenTask(id)
      : navigate({
          to: ".",
          search: (previous: Record<string, unknown>) => ({
            ...previous,
            taskId: id,
          }),
        });
  return (
    <div
      ref={container}
      className="isolate h-full min-h-0 overflow-auto"
      role="region"
      aria-label={t("reporting:requirementTable")}
      onScroll={(event) => {
        try {
          sessionStorage.setItem(
            `${storageKey}:scroll`,
            JSON.stringify({
              top: event.currentTarget.scrollTop,
              left: event.currentTarget.scrollLeft,
            }),
          );
        } catch {
          /* Storage is optional. */
        }
      }}
    >
      <table
        className="table-fixed border-separate border-spacing-0 text-xs"
        style={{
          width: columns.reduce((total, [, width]) => total + width, 0),
          minWidth: columns.reduce((total, [, width]) => total + width, 0),
        }}
      >
        <colgroup>
          {columns.map(([column, width]) => (
            <col key={column} style={{ width }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-20 bg-muted text-muted-foreground">
          <tr>
            {columns.map(([column, width], index) => (
              <th
                key={column}
                aria-sort={
                  sort.column === column
                    ? sort.descending
                      ? "descending"
                      : "ascending"
                    : "none"
                }
                className={`overflow-hidden whitespace-nowrap border-b bg-muted px-3 py-2 text-left font-medium ${index < 3 ? "sticky z-30" : ""} ${index === 2 ? "border-r border-border shadow-[3px_0_5px_-3px_var(--border)]" : ""}`}
                style={{
                  backgroundColor: "var(--background)",
                  backgroundImage:
                    "linear-gradient(var(--muted), var(--muted))",
                  width,
                  minWidth: width,
                  maxWidth: width,
                  left:
                    index < 3
                      ? columns
                          .slice(0, index)
                          .reduce((total, [, size]) => total + size, 0)
                      : undefined,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setSort({
                      column,
                      descending: sort.column === column && !sort.descending,
                    })
                  }
                  className="flex w-full items-center gap-1"
                >
                  {t(`reporting:columns.${column}`)}
                  <span className="text-[9px] opacity-50">
                    {sort.column === column
                      ? sort.descending
                        ? "▼"
                        : "▲"
                      : "↕"}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((task) => (
            <tr
              key={task.id}
              className="group border-b border-border/40 hover:bg-accent/20"
            >
              {columns.map(([column, width], index) => {
                const value = valueOf(task, column);
                const date = [
                  "dueDate",
                  "pirun",
                  "createdAt",
                  "updatedAt",
                ].includes(column);
                const risk = riskOf(task, now);
                return (
                  <td
                    key={column}
                    className={`overflow-hidden border-b border-border/40 px-3 py-3 ${index < 3 ? "sticky z-10 bg-background" : ""} ${index === 2 ? "border-r border-border shadow-[3px_0_5px_-3px_var(--border)]" : ""}`}
                    style={{
                      left:
                        index < 3
                          ? columns
                              .slice(0, index)
                              .reduce((total, [, size]) => total + size, 0)
                          : undefined,
                      width,
                      minWidth: width,
                      maxWidth: width,
                      ...(column === "workflow"
                        ? statusStyle(task.status)
                        : {}),
                    }}
                  >
                    {column === "title" ? (
                      <button
                        type="button"
                        className="block max-w-full truncate text-left font-medium hover:underline"
                        data-task-id={task.id}
                        onClick={() => open(task.id)}
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    ) : column === "risk" ? (
                      <span
                        className={`inline-block rounded-full px-2 py-1 ${risk.value === "overdue" ? "bg-red-500/10 text-red-600 dark:text-red-300" : risk.value === "soon" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : risk.value === "launched" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}
                      >
                        {value}
                      </span>
                    ) : (
                      <span
                        className={`block truncate ${column === "reference" ? "font-mono text-muted-foreground" : ""}`}
                        title={
                          date && value
                            ? formatDateTime(String(value))
                            : String(value)
                        }
                      >
                        {date
                          ? value
                            ? formatDateTimeShort(String(value))
                            : "—"
                          : column === "overdueDays"
                            ? risk.days || "—"
                            : value ||
                              (column === "assignee"
                                ? t("reporting:unassigned")
                                : "—")}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {!sorted.length && (
        <p className="p-10 text-center text-xs text-muted-foreground">
          {t("reporting:empty")}
        </p>
      )}
    </div>
  );
}
