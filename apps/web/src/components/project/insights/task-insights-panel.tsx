import { BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { InsightProject } from "./insights-data";
import { buildStatusColorMap } from "./insight-colors";
import {
  buildStatusCounts,
  buildTrend,
  collectInsightTasks,
  getInsightColumns,
  summarizeTasks,
} from "./insights-data";
import { StatusDonut } from "./status-donut";
import { TrendChart } from "./trend-chart";
import { useInsightsView } from "./use-insights-view";

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/25 px-2 py-1.5">
      <div className="truncate text-[10px] text-muted-foreground">{label}</div>
      <div className="font-semibold text-lg tabular-nums leading-tight">
        {value}
      </div>
    </div>
  );
}

function TaskDimension({ project }: { project: InsightProject }) {
  const { t } = useTranslation();
  const [days, setDays] = useInsightsView("days");
  const columns = useMemo(() => getInsightColumns(project), [project]);
  const tasks = useMemo(() => collectInsightTasks(project), [project]);
  const colors = useMemo(() => buildStatusColorMap(columns), [columns]);
  const summary = useMemo(
    () => summarizeTasks(tasks, columns),
    [tasks, columns],
  );
  const statusCounts = useMemo(
    () => buildStatusCounts(tasks, columns),
    [tasks, columns],
  );
  const trend = useMemo(
    () => buildTrend(tasks, columns, days),
    [tasks, columns, days],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="grid shrink-0 grid-cols-3 gap-2">
        <KpiTile
          label={t("tasks:insights.kpiTotal")}
          value={String(summary.total)}
        />
        <KpiTile
          label={t("tasks:insights.kpiCompletion")}
          value={`${Math.round(summary.completionRate * 100)}%`}
        />
        <KpiTile
          label={t("tasks:insights.kpiOverdue")}
          value={`${Math.round(summary.overdueRate * 100)}%`}
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 sm:overflow-hidden">
        <section className="min-w-0">
          <h3 className="mb-1.5 font-medium text-[11px] text-muted-foreground">
            {t("tasks:insights.statusDistribution")}
          </h3>
          <StatusDonut
            total={summary.total}
            slices={statusCounts.map((status) => ({
              key: status.slug,
              label: status.name,
              value: status.count,
              color: colors[status.slug],
            }))}
          />
        </section>

        <section className="flex min-w-0 flex-col">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="font-medium text-[11px] text-muted-foreground">
              {t("tasks:insights.trendTitle")}
            </h3>
            <div className="ml-auto flex items-center gap-0.5 rounded-md bg-muted p-0.5">
              {([7, 30] as const).map((range) => (
                <Button
                  key={range}
                  type="button"
                  size="xs"
                  variant={days === range ? "secondary" : "ghost"}
                  className="h-5 px-1.5 text-[10px]"
                  onClick={() => setDays(range)}
                >
                  {t(
                    range === 7
                      ? "tasks:insights.range7"
                      : "tasks:insights.range30",
                  )}
                </Button>
              ))}
            </div>
          </div>
          <TrendChart points={trend} days={days} />
        </section>
      </div>
    </div>
  );
}

export function TaskInsightsPanel({
  project,
  embedded = false,
}: {
  project: InsightProject;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const total = useMemo(() => collectInsightTasks(project).length, [project]);

  if (embedded)
    return (
      <div className="px-3 pb-3">
        <TaskDimension project={project} />
      </div>
    );

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 px-4 pt-3">
        <BarChart3 className="size-4 text-primary" />
        <h2 className="font-medium text-sm">
          {t("tasks:insights.statsTitle")}
        </h2>
        <Badge size="sm" variant="secondary" className="tabular-nums">
          {total}
        </Badge>
      </div>
      <div className="min-h-0 flex-1 px-3 pt-1 pb-3">
        <TaskDimension project={project} />
      </div>
    </Card>
  );
}
