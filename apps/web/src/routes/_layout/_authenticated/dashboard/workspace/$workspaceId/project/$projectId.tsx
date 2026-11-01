import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProjectTerminologyProvider } from "@/components/project/project-terminology-provider";
import { InsightsViewProvider } from "@/components/project/insights/insights-view-provider";
import useGetProject from "@/hooks/queries/project/use-get-project";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId",
)({
  component: ProjectRoute,
});

function ProjectRoute() {
  const { workspaceId, projectId } = Route.useParams();
  const { data: project } = useGetProject({ id: projectId, workspaceId });
  return (
    <ProjectTerminologyProvider kind={project?.kind}>
      <InsightsViewProvider key={`${workspaceId}:${projectId}`}>
        <Outlet />
      </InsightsViewProvider>
    </ProjectTerminologyProvider>
  );
}
