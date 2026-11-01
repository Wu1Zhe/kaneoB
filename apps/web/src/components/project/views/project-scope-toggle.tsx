import { ListTodo, Inbox, ChartNoAxesCombined, Lightbulb } from "lucide-react";
import { useIsRequirement } from "@/components/project/project-kind-context";
import { useTranslation } from "react-i18next";
import { useUserPreferencesStore } from "@/store/user-preferences";
import { ProjectScopeLink } from "./project-scope-link";
import { type ProjectView, tasksViewFor } from "./project-views";

type ProjectScopeToggleProps = {
  workspaceId: string;
  projectId: string;
  currentView: ProjectView;
  onSelect: (view: ProjectView) => void;
};

export function ProjectScopeToggle({
  workspaceId,
  projectId,
  currentView,
  onSelect,
}: ProjectScopeToggleProps) {
  const { t } = useTranslation();
  const isRequirement = useIsRequirement();
  const onIdeas = currentView === "ideas";
  const onInsights = currentView === "insights";
  const taskLayout = useUserPreferencesStore((state) => state.taskLayout);
  const viewMode = useUserPreferencesStore((state) => state.viewMode);
  const onBacklog = currentView === "backlog";
  const tasksView =
    onBacklog || onInsights || onIdeas
      ? tasksViewFor(taskLayout, viewMode)
      : currentView;

  return (
    <nav
      aria-label={t("tasks:view.heading")}
      className="flex h-9 shrink-0 items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 shadow-xs/5"
    >
      <ProjectScopeLink
        view={tasksView}
        workspaceId={workspaceId}
        projectId={projectId}
        active={!onBacklog && !onInsights && !onIdeas}
        onSelect={onSelect}
      >
        <ListTodo className="size-3.5" aria-hidden="true" />
        {t("tasks:title")}
      </ProjectScopeLink>
      <ProjectScopeLink
        view="backlog"
        workspaceId={workspaceId}
        projectId={projectId}
        active={onBacklog}
        onSelect={onSelect}
      >
        <Inbox className="size-3.5" aria-hidden="true" />
        {t("tasks:view.backlog")}
      </ProjectScopeLink>
      <ProjectScopeLink
        view="insights"
        workspaceId={workspaceId}
        projectId={projectId}
        active={onInsights}
        onSelect={onSelect}
      >
        <ChartNoAxesCombined className="size-3.5" aria-hidden="true" />
        {t(
          isRequirement
            ? "reporting:requirementBoard"
            : "reporting:projectBoard",
        )}
      </ProjectScopeLink>
      {!isRequirement && (
        <ProjectScopeLink
          view="ideas"
          workspaceId={workspaceId}
          projectId={projectId}
          active={onIdeas}
          onSelect={onSelect}
        >
          <Lightbulb className="size-3.5 text-amber-500" aria-hidden="true" />
          {t("ideas:title")}
        </ProjectScopeLink>
      )}
    </nav>
  );
}
