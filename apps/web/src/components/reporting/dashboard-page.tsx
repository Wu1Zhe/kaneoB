import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  getReport,
  type DashboardReport,
  type DashboardTask,
} from "@/fetchers/reporting/get-report";
import { statusStyle } from "@/components/requirement/status-style";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { CategoryChart } from "./category-chart";
import { PeopleReport } from "./people-report";
import { ProjectSpecials } from "./project-specials";
import { reportBounds, reportPreset, shanghaiDay } from "./report-dates";
import { ReportMetrics } from "./report-metrics";
import { ReportPanel } from "./report-panel";
import { ReportSnapshots } from "./report-snapshots";
import { ReportTaskList } from "./report-task-list";
import { StatusDistribution } from "./status-distribution";
import { WeeklyChart } from "./weekly-chart";
import { WeeklyComposition } from "./weekly-composition";

export function DashboardPage({
  projectId,
  workspaceId,
}: {
  projectId: string;
  workspaceId: string;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [range, setRange] = useState(() => reportPreset("week"));
  const [viewed, setViewed] = useState<{
    report: DashboardReport;
    name: string;
  } | null>(null);
  const [selection, setSelection] = useState<{
    id: string;
    title: string;
    tasks: DashboardTask[];
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [staleDays, setStaleDays] = useState(3);
  const root = useRef<HTMLDivElement>(null);
  const details = useRef<HTMLDivElement>(null);
  const valid = Boolean(
    range.start &&
    range.end &&
    range.start <= range.end &&
    range.start <= shanghaiDay(),
  );
  const bounds = valid
    ? reportBounds(range.start, range.end)
    : reportBounds(shanghaiDay(), shanghaiDay());
  const query = useQuery({
    queryKey: [
      "dashboard-report",
      projectId,
      bounds.since,
      bounds.until,
      staleDays,
    ],
    queryFn: () => getReport(projectId, bounds.since, bounds.until, staleDays),
    enabled: valid,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: range.end >= shanghaiDay() && !viewed ? 60000 : false,
  });
  useEffect(() => {
    setViewed(null);
    setSelection(null);
  }, [projectId]);
  const report = viewed?.report ?? query.data;
  const show = (id: string, title: string, tasks: DashboardTask[]) => {
    setSelection({ id, title, tasks });
    window.requestAnimationFrame(() =>
      details.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  const select = (id: string) => {
    if (!report) return;
    const tasks = report.tasks.filter(
      (task) =>
        id === "all" ||
        (id === "active" &&
          ["in-progress", "in-review", "pending-acceptance"].includes(
            task.status,
          )) ||
        (id === "acceptance" && task.status === "pending-acceptance") ||
        task.risk === id,
    );
    show(id, t(`reporting:${id === "all" ? "details" : id}`), tasks);
  };
  const viewWeek = async (index: number) => {
    if (!report) return;
    const week = report.weekly[index]!;
    if (!week.available) {
      toast.info(t("reporting:noHistory"));
      return;
    }
    try {
      const historical = await getReport(
        projectId,
        week.start,
        week.end,
        staleDays,
      );
      setViewed({
        report: historical,
        name: `${t("reporting:week")} ${shanghaiDay(new Date(week.start).getTime())}`,
      });
      setSelection(null);
      root.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("reporting:loadError"),
      );
    }
  };
  const download = async (format: "xlsx" | "pptx" | "docx" | "pdf") => {
    if (!report || !root.current) return;
    setExporting(true);
    try {
      const { exportReport } = await import("./export-report");
      await exportReport(format, report, root.current, t);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("reporting:exportError"),
      );
    } finally {
      setExporting(false);
    }
  };
  const controlRange = (start: string, end: string) => {
    setRange({ start, end });
    setViewed(null);
    setSelection(null);
  };
  const hasData =
    report && new Date(report.asOf) >= new Date(report.coverageStart);
  const stale =
    report?.tasks.filter(
      (task) =>
        (task.stalledDays ?? 0) >
        (viewed?.report.settings.staleDays ?? staleDays),
    ) ?? [];
  return (
    <div ref={root} className="h-full overflow-y-auto bg-muted/20 p-3 md:p-4">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
        {(!report || report.project.kind === "requirement") && (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 text-xs">
              <label>
                {t("reporting:from")}
                <input
                  aria-label={t("reporting:from")}
                  type="date"
                  value={range.start}
                  max={range.end || shanghaiDay()}
                  onChange={(event) =>
                    controlRange(event.target.value, range.end)
                  }
                  className="ml-2 h-8 rounded border bg-background px-2"
                />
              </label>
              <label>
                {t("reporting:to")}
                <input
                  aria-label={t("reporting:to")}
                  type="date"
                  value={range.end}
                  min={range.start}
                  max={shanghaiDay()}
                  onChange={(event) =>
                    controlRange(range.start, event.target.value)
                  }
                  className="ml-2 h-8 rounded border bg-background px-2"
                />
              </label>
              {(["week", "lastWeek", "twelveWeeks"] as const).map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = reportPreset(preset);
                    controlRange(next.start, next.end);
                  }}
                >
                  {t(`reporting:presets.${preset}`)}
                </Button>
              ))}
              <div className="ml-auto flex flex-wrap gap-2">
                {(
                  [
                    ["xlsx", "Excel"],
                    ["pptx", "PPT"],
                    ["pdf", "PDF"],
                    ["docx", "Word"],
                  ] as const
                ).map(([format, label]) => (
                  <Button
                    key={format}
                    size="sm"
                    variant="outline"
                    disabled={!hasData || exporting}
                    onClick={() => void download(format)}
                  >
                    {t("reporting:export", { format: label })}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
        {!valid && (
          <p role="alert" className="text-sm text-destructive-foreground">
            {t("reporting:invalidDates")}
          </p>
        )}
        {query.isPending && valid && (
          <p role="status" className="p-4 text-sm text-muted-foreground">
            {t("reporting:loading")}
          </p>
        )}
        {query.isError && (
          <div role="alert">
            <p className="text-sm text-destructive-foreground">
              {t("reporting:loadError")}
            </p>
            <Button size="sm" onClick={() => query.refetch()}>
              {t("reporting:retry")}
            </Button>
          </div>
        )}
        {report && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-lg font-semibold">
                  {report.project.name} ·{" "}
                  {t(
                    report.project.kind === "requirement"
                      ? "reporting:requirementBoard"
                      : "reporting:projectBoard",
                  )}
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("reporting:asOf", { date: formatDateTime(report.asOf) })} ·{" "}
                  {t("reporting:scopeHint")}
                </p>
              </div>
              {viewed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setViewed(null);
                    setSelection(null);
                  }}
                >
                  {t("reporting:returnLive")}
                </Button>
              )}
            </div>
            {viewed && (
              <p className="rounded-lg border bg-accent/30 p-3 text-xs">
                {t("reporting:viewingSnapshot", { name: viewed.name })}
              </p>
            )}
            {!report.historyComplete && (
              <p className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning-foreground">
                {t("reporting:historyHint", {
                  date: formatDateTime(report.coverageStart),
                })}
              </p>
            )}
            {hasData ? (
              <>
                <ReportMetrics
                  report={report}
                  selected={selection?.id ?? ""}
                  onSelect={select}
                />
                {report.project.kind === "requirement" && (
                  <ReportPanel
                    title={t("reporting:overview")}
                    subtitle={t("reporting:deltaHint")}
                  >
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-6">
                      {report.states.map((state) => (
                        <button
                          type="button"
                          key={state.slug}
                          onClick={() =>
                            show(
                              state.slug,
                              state.name,
                              report.tasks.filter(
                                (task) => task.status === state.slug,
                              ),
                            )
                          }
                          className="rounded-lg border p-3 text-left"
                        >
                          <span
                            className="rounded-full px-2 py-1 text-xs"
                            style={statusStyle(state.slug)}
                          >
                            {state.name}
                          </span>
                          <p className="mt-2 text-xl font-semibold">
                            {state.count}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {state.startCount === null
                              ? "—"
                              : `${state.count - state.startCount > 0 ? "+" : ""}${state.count - state.startCount}`}
                          </p>
                        </button>
                      ))}
                    </div>
                  </ReportPanel>
                )}
                {selection && (
                  <div ref={details} className="scroll-mt-3">
                    <ReportPanel
                      title={`${selection.title} · ${selection.tasks.length}`}
                    >
                      <div className="mb-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelection(null)}
                        >
                          {t("reporting:clearSelection")}
                        </Button>
                      </div>
                      <ReportTaskList
                        tasks={selection.tasks}
                        workspaceId={workspaceId}
                        slug={report.project.slug}
                        historical={Boolean(viewed)}
                      />
                    </ReportPanel>
                  </div>
                )}
                <div className="grid gap-4 xl:grid-cols-2">
                  {report.project.kind === "requirement" ? (
                    <StatusDistribution
                      report={{
                        ...report,
                        states: report.states.map((state) => ({
                          ...state,
                          stalled: stale.filter(
                            (task) => task.status === state.slug,
                          ).length,
                        })),
                      }}
                      flow
                      onSelect={(slug) =>
                        show(
                          slug,
                          report.states.find((state) => state.slug === slug)!
                            .name,
                          report.tasks.filter((task) => task.status === slug),
                        )
                      }
                    />
                  ) : (
                    <ReportPanel
                      title={t("reporting:overdueTasks")}
                      subtitle={t("reporting:overdueHint")}
                    >
                      <ReportTaskList
                        tasks={report.tasks
                          .filter((task) => task.risk === "overdue")
                          .sort((a, b) => b.riskDays - a.riskDays)}
                        workspaceId={workspaceId}
                        slug={report.project.slug}
                      />
                    </ReportPanel>
                  )}
                  <ReportPanel
                    title={t(
                      report.project.kind === "requirement"
                        ? "reporting:risks"
                        : "reporting:dueSoon",
                    )}
                    subtitle={t(
                      report.project.kind === "requirement"
                        ? "reporting:riskHint"
                        : "reporting:twoBusinessDays",
                    )}
                  >
                    <ReportTaskList
                      tasks={report.tasks
                        .filter((task) =>
                          report.project.kind === "requirement"
                            ? task.risk === "overdue" || task.risk === "soon"
                            : task.risk === "soon",
                        )
                        .sort(
                          (a, b) =>
                            b.riskDays - a.riskDays ||
                            (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
                        )}
                      workspaceId={workspaceId}
                      slug={report.project.slug}
                    />
                    {report.project.kind === "requirement" && (
                      <>
                        <div className="mt-4 flex items-center justify-between rounded bg-muted/30 p-3 text-xs">
                          <label>
                            {t("reporting:stale")}
                            <input
                              aria-label={t("reporting:staleThreshold")}
                              type="number"
                              min={1}
                              max={365}
                              disabled={Boolean(viewed)}
                              value={
                                viewed?.report.settings.staleDays ?? staleDays
                              }
                              onChange={(event) =>
                                setStaleDays(
                                  Math.min(
                                    365,
                                    Math.max(
                                      1,
                                      Number(event.target.value) || 3,
                                    ),
                                  ),
                                )
                              }
                              className="mx-2 w-14 rounded border bg-background px-1 py-1"
                            />
                            {t("reporting:dayUnit")}
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              show("stale", t("reporting:stale"), stale)
                            }
                            className="text-lg font-semibold"
                          >
                            {stale.length}
                          </button>
                        </div>
                        <ReportTaskList
                          tasks={stale.sort(
                            (a, b) =>
                              (b.stalledDays ?? 0) - (a.stalledDays ?? 0),
                          )}
                          workspaceId={workspaceId}
                          slug={report.project.slug}
                        />
                      </>
                    )}
                  </ReportPanel>
                  {report.project.kind === "project" && (
                    <>
                      <ReportPanel title={t("reporting:myTodo")}>
                        <ReportTaskList
                          tasks={report.tasks.filter(
                            (task) => task.userId === user?.id && !task.isFinal,
                          )}
                          workspaceId={workspaceId}
                          slug={report.project.slug}
                        />
                      </ReportPanel>
                      <StatusDistribution
                        report={report}
                        onSelect={(slug) =>
                          show(
                            slug,
                            report.states.find((state) => state.slug === slug)!
                              .name,
                            report.tasks.filter((task) => task.status === slug),
                          )
                        }
                      />
                      <ProjectSpecials
                        report={report}
                        workspaceId={workspaceId}
                      />
                    </>
                  )}
                  {report.project.kind === "requirement" && (
                    <>
                      <WeeklyComposition
                        report={report}
                        onBar={(index, type, category) => {
                          const week = report.weekly[index]!;
                          show(
                            "composition",
                            `${t("reporting:composition")} · ${shanghaiDay(new Date(week.start).getTime())}`,
                            week.createdTasks.filter(
                              (task) =>
                                (task.requirementData?.type || "__unset__") ===
                                  type &&
                                (!category ||
                                  (task.requirementData?.category ||
                                    "__unset__") === category),
                            ),
                          );
                        }}
                      />
                      <WeeklyChart
                        report={report}
                        title={t("reporting:weekly")}
                        series={["created", "pirun", "prod"]}
                        onWeek={(index) => void viewWeek(index)}
                      />
                      <WeeklyChart
                        report={report}
                        title={t("reporting:overdueTrend")}
                        series={["overdue"]}
                        onWeek={(index) => void viewWeek(index)}
                      />
                      <CategoryChart
                        report={report}
                        onCategory={(category) =>
                          show(
                            category,
                            category === "__unset__"
                              ? t("reporting:uncategorized")
                              : category,
                            report.tasks.filter(
                              (task) =>
                                (task.requirementData?.category ||
                                  "__unset__") === category,
                            ),
                          )
                        }
                      />
                      <PeopleReport
                        report={report}
                        workspaceId={workspaceId}
                        onPerson={(id) =>
                          show(
                            id ?? "__unset__",
                            t("reporting:byPerson"),
                            report.tasks.filter(
                              (task) =>
                                task.userId === id &&
                                !task.isFinal &&
                                task.risk !== "launched",
                            ),
                          )
                        }
                      />
                      <ReportPanel
                        title={t("reporting:nodeRisks")}
                        className="col-span-full"
                      >
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                          {report.nodes.map((node) => (
                            <button
                              type="button"
                              key={node.id}
                              onClick={() =>
                                show(
                                  node.id,
                                  node.label,
                                  report.tasks.filter((task) =>
                                    task.overdueStages.includes(node.label),
                                  ),
                                )
                              }
                              className="rounded border p-3 text-left text-xs"
                            >
                              {node.label}
                              <span className="mt-2 block text-xl font-semibold text-destructive-foreground">
                                {node.count}
                              </span>
                            </button>
                          ))}
                        </div>
                      </ReportPanel>
                    </>
                  )}
                </div>
              </>
            ) : (
              <ReportPanel title={t("reporting:noHistory")}>
                <p className="py-12 text-center text-sm text-muted-foreground">
                  {t("reporting:noHistoryAtDate")}
                </p>
              </ReportPanel>
            )}
            {report.project.kind === "requirement" && (
              <ReportSnapshots
                report={report}
                workspaceId={workspaceId}
                readOnly={Boolean(viewed) || query.isFetching}
                onView={(snapshot, name) => {
                  setViewed({ report: snapshot, name });
                  setSelection(null);
                  root.current?.scrollIntoView({ behavior: "smooth" });
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
