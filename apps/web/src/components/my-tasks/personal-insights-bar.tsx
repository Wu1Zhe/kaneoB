import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ProjectInsightsBar } from "@/components/project/insights";
import { Button } from "@/components/ui/button";
import { useGetPersonalInsights } from "@/hooks/queries/task/use-get-personal-insights";
import { personalInsightModel } from "./personal-insight-model";
import { PersonalTodayChanges } from "./personal-today-changes";

export function PersonalInsightsBar({
  workspaceId,
  kind,
}: {
  workspaceId: string;
  kind?: "project" | "requirement";
}) {
  const { t } = useTranslation();
  const query = useGetPersonalInsights(workspaceId);
  const model = useMemo(
    () =>
      personalInsightModel(
        workspaceId,
        (query.data ?? []).filter((task) => !kind || task.projectKind === kind),
        {
          planned: t("tasks:status.planned"),
          archived: t("tasks:status.archived"),
        },
      ),
    [workspaceId, query.data, t, kind],
  );
  if (query.isPending)
    return (
      <p role="status" className="p-4 text-sm text-muted-foreground">
        {t("todayChanges:loading")}
      </p>
    );
  return (
    <>
      {query.isError && (
        <div role="alert" className="p-4 text-sm text-muted-foreground">
          <p>{t("workspace:myWork.loadError")}</p>
          <Button size="sm" variant="outline" onClick={() => query.refetch()}>
            {t("todayChanges:retry")}
          </Button>
        </div>
      )}
      {query.data && (
        <ProjectInsightsBar
          project={model}
          workspaceId={workspaceId}
          overdueTitle={t("workspace:myTasks.insights.overdueTitle")}
          changes={
            <PersonalTodayChanges workspaceId={workspaceId} kind={kind} />
          }
        />
      )}
    </>
  );
}
