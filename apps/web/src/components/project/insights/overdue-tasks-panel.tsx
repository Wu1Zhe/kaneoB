import { RequirementDateField } from "@/components/requirement/requirement-date-field";
import { Link, useSearch } from "@tanstack/react-router";
import { BellRing, CalendarClock, ClockAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AssigneeAvatar } from "@/components/task/properties/assignee-avatar";
import TaskDueDatePopover from "@/components/task/task-due-date-popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { useNudgeTask } from "@/hooks/mutations/notification/use-nudge-task";
import { cn } from "@/lib/cn";
import { toast } from "@/lib/toast";
import type { InsightProject } from "./insights-data";
import { formatInsightDuration } from "./format-insight-duration";
import {
  collectInsightTasks,
  getInsightColumns,
  getOverdueEntries,
  type OverdueBand,
  type OverdueEntry,
} from "./insights-data";
import { useInsightsView } from "./use-insights-view";

const REFRESH_MS = 60_000;

function useMinutelyNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function OverdueRow({
  entry,
  band,
  workspaceId,
}: {
  entry: OverdueEntry;
  band: OverdueBand;
  workspaceId?: string;
}) {
  const { t } = useTranslation();
  const nudge = useNudgeTask();
  const search = useSearch({ strict: false });
  const { task, distanceMs } = entry;
  const label =
    band === "overdue"
      ? t("tasks:insights.overdueFor", {
          duration: formatInsightDuration(distanceMs, t),
        })
      : t("tasks:insights.dueIn", {
          duration: formatInsightDuration(distanceMs, t),
        });

  const handleNudge = async () => {
    try {
      const notification = await nudge.mutateAsync(task.id);
      if (!notification) {
        toast.info(t("tasks:insights.nudgeNoAssignee"));
        return;
      }
      toast.success(
        t("tasks:insights.nudgeSent", {
          name: task.assigneeName ?? t("tasks:insights.unassigned"),
        }),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:insights.nudgeFailed"),
      );
    }
  };

  return (
    <div className="group flex items-center gap-2 border-border/40 border-b px-3 py-1.5 last:border-0 hover:bg-accent/40">
      <Link
        {...(workspaceId
          ? {
              to: "/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId" as const,
              params: {
                workspaceId,
                projectId: task.projectId,
                taskId: task.id,
              },
            }
          : { to: "." as const, search: { ...search, taskId: task.id } })}
        className="min-w-0 flex-1 truncate rounded-sm text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        title={task.title}
      >
        {task.title}
        {entry.stage && (
          <span className="ml-1 text-xs text-warning-foreground">
            · {t("tasks:requirement.stageAlert", { stage: entry.stage.label })}
          </span>
        )}
      </Link>
      <div className="flex w-20 shrink-0 items-center gap-1.5">
        <AssigneeAvatar
          name={task.assigneeName}
          image={task.assigneeImage}
          assigned={Boolean(task.userId)}
          className="size-4"
        />
        <span className="truncate text-muted-foreground text-xs">
          {task.assigneeName ?? t("tasks:insights.unassigned")}
        </span>
      </div>
      <span
        className={cn(
          "w-24 shrink-0 text-right text-xs tabular-nums",
          band === "overdue"
            ? "font-medium text-destructive-foreground"
            : "text-warning-foreground",
        )}
        title={label}
      >
        {label}
      </span>
      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          aria-label={t("tasks:insights.nudge")}
          title={t("tasks:insights.nudge")}
          loading={nudge.isPending}
          onClick={handleNudge}
        >
          <BellRing />
        </Button>
        {entry.stage ? (
          <div className="w-24">
            <RequirementDateField
              task={task}
              field={entry.stage.planned}
              label={`${entry.stage.label} ${t("tasks:requirement.planned")}`}
            />
          </div>
        ) : (
          <TaskDueDatePopover task={task}>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={t("tasks:insights.changeDueDate")}
              title={t("tasks:insights.changeDueDate")}
            >
              <CalendarClock />
            </Button>
          </TaskDueDatePopover>
        )}
      </div>
    </div>
  );
}

function EmptyBand({ band }: { band: OverdueBand }) {
  const { t } = useTranslation();
  return (
    <Empty className="h-full gap-2 p-4 md:p-4">
      <EmptyHeader className="max-w-none">
        <EmptyMedia variant="icon" className="mb-2 size-7">
          <ClockAlert />
        </EmptyMedia>
        <EmptyTitle className="text-sm">
          {band === "overdue"
            ? t("tasks:insights.emptyOverdueTitle")
            : t("tasks:insights.emptyDueSoonTitle")}
        </EmptyTitle>
        <EmptyDescription className="text-xs">
          {band === "overdue"
            ? t("tasks:insights.emptyOverdueDescription")
            : t("tasks:insights.emptyDueSoonDescription")}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function BandList({
  entries,
  band,
  workspaceId,
}: {
  entries: OverdueEntry[];
  band: OverdueBand;
  workspaceId?: string;
}) {
  const { t } = useTranslation();
  if (entries.length === 0) return <EmptyBand band={band} />;
  return (
    <div role="list">
      {entries.slice(0, 50).map((entry) => (
        <div
          role="listitem"
          key={`${band}-${entry.task.id}-${entry.stage?.id ?? "overall"}`}
        >
          <OverdueRow entry={entry} band={band} workspaceId={workspaceId} />
        </div>
      ))}
      {entries.length > 50 && (
        <p className="px-3 py-2 text-muted-foreground text-xs">
          {t("tasks:insights.moreCount", { count: entries.length - 50 })}
        </p>
      )}
    </div>
  );
}

export function OverdueTasksPanel({
  project,
  workspaceId,
  title,
}: {
  project: InsightProject;
  workspaceId?: string;
  title?: string;
}) {
  const { t } = useTranslation();
  const now = useMinutelyNow();
  const [band, setBand] = useInsightsView("band");
  const columns = useMemo(() => getInsightColumns(project), [project]);
  const tasks = useMemo(() => collectInsightTasks(project), [project]);
  const overdueEntries = useMemo(
    () => getOverdueEntries(tasks, columns, "overdue", now),
    [tasks, columns, now],
  );
  const soonEntries = useMemo(
    () => getOverdueEntries(tasks, columns, "soon", now),
    [tasks, columns, now],
  );

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 px-4 pt-3">
        <ClockAlert className="size-4 text-warning-foreground" />
        <h2 className="font-medium text-sm">
          {title ?? t("tasks:insights.overdueTitle")}
        </h2>
        <Badge
          size="sm"
          variant={overdueEntries.length > 0 ? "error" : "secondary"}
          className="tabular-nums"
        >
          {overdueEntries.length}
        </Badge>
      </div>
      <Tabs
        value={band}
        onValueChange={(value) => setBand(value as OverdueBand)}
        className="min-h-0 flex-1 gap-0"
      >
        <TabsList
          variant="underline"
          className="mx-2 mt-1 shrink-0 self-start px-1"
        >
          <TabsTab value="overdue" className="h-7 px-2 text-xs">
            {t("tasks:insights.tabOverdue")}
            <span className="text-muted-foreground tabular-nums">
              {overdueEntries.length}
            </span>
          </TabsTab>
          <TabsTab value="soon" className="h-7 px-2 text-xs">
            {t("tasks:insights.tabDueSoon")}
            <span className="text-muted-foreground tabular-nums">
              {soonEntries.length}
            </span>
          </TabsTab>
        </TabsList>
        <TabsPanel
          value="overdue"
          className="min-h-0 flex-1 overflow-y-auto pb-1"
        >
          <BandList
            entries={overdueEntries}
            band="overdue"
            workspaceId={workspaceId}
          />
        </TabsPanel>
        <TabsPanel value="soon" className="min-h-0 flex-1 overflow-y-auto pb-1">
          <BandList
            entries={soonEntries}
            band="soon"
            workspaceId={workspaceId}
          />
        </TabsPanel>
      </Tabs>
    </Card>
  );
}
