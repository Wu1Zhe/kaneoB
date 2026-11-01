import type { ReactNode } from "react";
import type { InsightProject } from "./insights-data";
import { OverdueTasksPanel } from "./overdue-tasks-panel";
import { PeopleInsightsPanel } from "./people-insights-panel";
import { ProjectUpdatesPanel } from "./project-updates-panel";

/**
 * Compact overview above the task view: alerts and task statistics side by
 * side from lg up, stacked below it, with the per-person table spanning both
 * columns underneath. Cards size to their content and the page scrolls.
 */
export function ProjectInsightsBar({
  project,
  workspaceId,
  changes,
  overdueTitle,
}: {
  project: InsightProject;
  workspaceId?: string;
  changes?: ReactNode;
  overdueTitle?: string;
}) {
  return (
    <div className="insights-viz grid shrink-0 grid-cols-1 gap-3 px-3 py-3 lg:grid-cols-2 xl:px-4">
      <OverdueTasksPanel
        project={project}
        workspaceId={workspaceId}
        title={overdueTitle}
      />
      <ProjectUpdatesPanel
        key={project.id}
        project={project}
        changes={changes}
        workspaceId={workspaceId}
      />
      <div className="min-w-0 lg:col-span-2">
        <PeopleInsightsPanel project={project} workspaceId={workspaceId} />
      </div>
    </div>
  );
}
