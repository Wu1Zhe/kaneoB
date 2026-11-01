import { useTranslation } from "react-i18next";
import type { DashboardReport } from "@/fetchers/reporting/get-report";
import { formatDateTimeShort } from "@/lib/format";

export function SnapshotComparison({
  before,
  after,
}: {
  before: DashboardReport;
  after: DashboardReport;
}) {
  const { t } = useTranslation();
  const old = new Map(before.tasks.map((task) => [task.id, task]));
  const display = (value: unknown) =>
    value === null || value === undefined || value === "" ? "—" : String(value);
  const changes = after.tasks.flatMap((task) => {
    const previous = old.get(task.id);
    if (!previous) return [];
    const fields: Array<[string, unknown, unknown]> = [
      [t("reporting:columns.title"), previous.title, task.title],
      [
        t("reporting:columns.description"),
        previous.description,
        task.description,
      ],
      [t("reporting:columns.workflow"), previous.statusName, task.statusName],
      [
        t("reporting:columns.assignee"),
        previous.assigneeName,
        task.assigneeName,
      ],
      [t("tasks:priority.label"), previous.priority, task.priority],
      [t("reporting:columns.dueDate"), previous.dueDate, task.dueDate],
    ];
    for (const key of new Set([
      ...Object.keys(previous.requirementData ?? {}),
      ...Object.keys(task.requirementData ?? {}),
    ])) {
      const stage =
        /^(design|dev|crossTest|uat|pirun|prod)(PlannedAt|ActualAt)$/.exec(key);
      const label = stage
        ? `${stage[1] === "crossTest" ? "Cross Test" : stage[1]!.charAt(0).toUpperCase() + stage[1]!.slice(1)} · ${t(stage[2] === "PlannedAt" ? "tasks:requirement.planned" : "tasks:requirement.actual")}`
        : t(`tasks:requirement.fields.${key}`, { defaultValue: key });
      fields.push([
        label,
        previous.requirementData?.[key],
        task.requirementData?.[key],
      ]);
    }
    return fields
      .filter(([, a, b]) => display(a) !== display(b))
      .map(([field, a, b]) => ({
        id: `${task.id}:${field}`,
        title: task.title,
        field,
        before: display(a),
        after: display(b),
      }));
  });
  const value = (text: string) =>
    /^\d{4}-\d\d-\d\dT/.test(text) ? formatDateTimeShort(text) : text;
  return (
    <div className="mt-4 space-y-3 text-xs">
      <div className="grid grid-cols-3 gap-2">
        {(["total", "launched", "overdue"] as const).map((key) => (
          <div key={key} className="rounded border p-3">
            <span className="text-muted-foreground">
              {t(`reporting:${key}`)}
            </span>
            <p className="mt-1 font-semibold">
              {before.counts[key]} → {after.counts[key]}{" "}
              <span className="ml-1 text-muted-foreground">
                ({after.counts[key] - before.counts[key] > 0 ? "+" : ""}
                {after.counts[key] - before.counts[key]})
              </span>
            </p>
          </div>
        ))}
      </div>
      {changes.length > 0 && (
        <div className="max-h-72 overflow-auto">
          <table className="w-full min-w-[35rem] text-left">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {[
                  "columns.title",
                  "changedField",
                  "beforeValue",
                  "afterValue",
                ].map((key) => (
                  <th key={key} className="p-2 font-medium">
                    {t(`reporting:${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={change.id} className="border-b">
                  <td className="max-w-44 truncate p-2" title={change.title}>
                    {change.title}
                  </td>
                  <td className="p-2">{change.field}</td>
                  <td className="max-w-64 truncate p-2" title={change.before}>
                    {value(change.before)}
                  </td>
                  <td className="max-w-64 truncate p-2" title={change.after}>
                    {value(change.after)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
