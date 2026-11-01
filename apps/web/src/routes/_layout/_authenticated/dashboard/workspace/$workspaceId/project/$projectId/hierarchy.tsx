import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useIsRequirement } from "@/components/project/project-kind-context";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import ProjectLayout from "@/components/common/project-layout";
import { HierarchyView } from "@/components/hierarchy-view";
import PageTitle from "@/components/page-title";
import { DisplaySection } from "@/components/project/display/display-section";
import { ActiveFiltersBar } from "@/components/project/task-filters/active-filters-bar";
import { ProjectToolbar } from "@/components/project/toolbar/project-toolbar";
import { TaskCount } from "@/components/project/toolbar/task-count";
import { useProjectTaskView } from "@/components/project/toolbar/use-project-task-view";
import { LayoutSwitch } from "@/components/project/views/layout-switch";
import TaskDetailsSheet from "@/components/task/task-details-sheet";
import { Button } from "@/components/ui/button";
import { useGetTasks } from "@/hooks/queries/task/use-get-tasks";
import { countColumnTasks } from "@/lib/task-filters/count-tasks";

type HierarchySearchParams = {
  taskId?: string;
};

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/hierarchy",
)({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): HierarchySearchParams => ({
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
  }),
});

function RouteComponent() {
  const { t } = useTranslation();
  const isRequirement = useIsRequirement();
  const { projectId, workspaceId } = Route.useParams();
  const { taskId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: project, isLoading, isError, refetch } = useGetTasks(projectId);
  const view = useProjectTaskView({
    project,
    projectId,
    workspaceId,
    scope: "board",
  });
  const filteredProject = view.filters.filteredProject;

  const handleOpenTask = useCallback(
    (nextTaskId: string) => {
      navigate({ to: ".", search: { taskId: nextTaskId }, replace: true });
    },
    [navigate],
  );

  const handleCloseTaskSheet = useCallback(() => {
    navigate({ to: ".", search: {}, replace: true });
  }, [navigate]);

  const totalCount = countColumnTasks(project);
  const shownCount = countColumnTasks(filteredProject);

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="hierarchy"
      toolbar={
        <ProjectToolbar
          view={view}
          display={
            <DisplaySection>
              <LayoutSwitch
                workspaceId={workspaceId}
                projectId={projectId}
                currentRoute="hierarchy"
                currentView="hierarchy"
              />
            </DisplaySection>
          }
        />
      }
      summary={<TaskCount shown={shownCount} total={totalCount} />}
      filterBar={
        <ActiveFiltersBar
          subjects={view.subjects}
          onClear={view.filters.clearFilters}
          customFieldValues={view.filters.customFieldValues}
        />
      }
    >
      <PageTitle
        title={
          project
            ? t("tasks:hierarchy.pageTitle", { name: project.name })
            : undefined
        }
      />
      <div className="flex h-full min-h-0 flex-col bg-background">
        <h1 className="sr-only">{t("tasks:hierarchy.title")}</h1>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <p className="text-sm text-muted-foreground">
              {t("common:empty.loading")}
            </p>
          </div>
        ) : isError ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-sm text-center">
              <p
                role="alert"
                className="text-sm font-semibold text-destructive"
              >
                {t("tasks:calendar.loadError")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void refetch()}
              >
                {t("common:error.tryAgain")}
              </Button>
            </div>
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-sm text-center">
              <h2 className="text-sm font-semibold text-foreground">
                {t("tasks:hierarchy.noTasks")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  isRequirement
                    ? "tasks:requirement.emptyHierarchy"
                    : "tasks:hierarchy.noTasksSubtitle",
                )}
              </p>
            </div>
          </div>
        ) : shownCount === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-sm text-center">
              <h2 className="text-sm font-semibold text-foreground">
                {t("tasks:hierarchy.noTasksFound")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("tasks:filterBar.noMatches")}
              </p>
            </div>
          </div>
        ) : filteredProject ? (
          <HierarchyView
            project={filteredProject}
            workspaceId={workspaceId}
            onOpenTask={handleOpenTask}
          />
        ) : null}

        <TaskDetailsSheet
          taskId={taskId}
          projectId={projectId}
          workspaceId={workspaceId}
          onClose={handleCloseTaskSheet}
        />
      </div>
    </ProjectLayout>
  );
}
