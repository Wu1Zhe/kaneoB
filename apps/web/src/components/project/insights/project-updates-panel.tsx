import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import type { ReactNode } from "react";
import type { InsightProject } from "./insights-data";
import { TaskInsightsPanel } from "./task-insights-panel";
import { TodayChangesPanel } from "./today-changes-panel";
import { useInsightsView } from "./use-insights-view";

export function ProjectUpdatesPanel({
  project,
  changes,
  workspaceId,
}: {
  project: InsightProject;
  changes?: ReactNode;
  workspaceId?: string;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useInsightsView("updates");
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as typeof tab)}
        className="gap-2"
      >
        <TabsList variant="underline" className="mx-3 mt-1 self-start">
          <TabsTab value="changes">{t("todayChanges:title")}</TabsTab>
          <TabsTab value="statistics">{t("tasks:insights.statsTitle")}</TabsTab>
        </TabsList>
        <TabsPanel value="changes">
          {changes ?? (
            <TodayChangesPanel
              projectId={project.id}
              workspaceId={workspaceId}
            />
          )}
        </TabsPanel>
        <TabsPanel value="statistics">
          <TaskInsightsPanel project={project} embedded />
        </TabsPanel>
      </Tabs>
    </Card>
  );
}
