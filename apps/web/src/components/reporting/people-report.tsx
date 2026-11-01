import { useTranslation } from "react-i18next";
import type { DashboardReport } from "@/fetchers/reporting/get-report";
import { ReportPanel } from "./report-panel";
import { ReportTaskList } from "./report-task-list";
export function PeopleReport({
  report,
  workspaceId,
  onPerson,
}: {
  report: DashboardReport;
  workspaceId: string;
  onPerson: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const groups = new Map<
    string,
    { id: string | null; name: string; tasks: DashboardReport["tasks"] }
  >();
  for (const task of report.tasks) {
    if (task.isFinal || task.risk === "launched") continue;
    const key = task.userId ?? "__unset__";
    if (!groups.has(key))
      groups.set(key, {
        id: task.userId,
        name: task.assigneeName || t("reporting:unassigned"),
        tasks: [],
      });
    groups.get(key)!.tasks.push(task);
  }
  const people = [...groups.values()].sort(
    (a, b) => b.tasks.length - a.tasks.length,
  );
  const maximum = Math.max(1, ...people.map((person) => person.tasks.length));
  return (
    <>
      <ReportPanel
        title={t("reporting:workload")}
        subtitle={t("reporting:workloadHint")}
      >
        <div className="space-y-3">
          {people.map((person) => (
            <button
              type="button"
              key={person.id ?? "__unset__"}
              className="flex w-full items-center gap-3 text-xs"
              onClick={() => onPerson(person.id)}
            >
              <span className="w-24 truncate text-right">{person.name}</span>
              <span className="h-6 flex-1">
                <span
                  className="block h-full rounded bg-emerald-700"
                  style={{ width: `${(person.tasks.length / maximum) * 100}%` }}
                />
              </span>
              <span className="w-8 text-left tabular-nums">
                {person.tasks.length}
              </span>
            </button>
          ))}
          {!people.length && (
            <p className="py-10 text-center text-xs text-muted-foreground">
              {t("reporting:empty")}
            </p>
          )}
        </div>
      </ReportPanel>
      <ReportPanel
        title={t("reporting:byPerson")}
        subtitle={t("reporting:workloadHint")}
        className="col-span-full"
      >
        <div className="max-h-[30rem] space-y-3 overflow-auto">
          {people.map((person) => (
            <details
              key={person.id ?? "__unset__"}
              className="rounded-lg border border-border/50 px-3"
              open={people.length < 4}
            >
              <summary className="cursor-pointer py-3 text-xs font-medium">
                {person.name} · {person.tasks.length}
              </summary>
              <ReportTaskList
                tasks={person.tasks}
                workspaceId={workspaceId}
                slug={report.project.slug}
              />
            </details>
          ))}
        </div>
      </ReportPanel>
    </>
  );
}
